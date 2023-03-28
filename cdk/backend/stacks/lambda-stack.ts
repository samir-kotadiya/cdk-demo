import { Construct } from 'constructs';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as sm from 'aws-cdk-lib/aws-secretsmanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { SharedIds } from '../../../src/core/shared-ids';
import { getStage } from '../../util';
import { getCFStackPrefix } from '../../util';
import { isLocalDevelopment } from '../../util';
import { getSSMPrefix } from '../../util';
import { UserConstruct } from '../lambda/user-construct';

export interface LambdaStackProps extends cdk.StackProps {
  baseResource: apigw.IResource;
}

export class LambdaStack extends cdk.Stack {
  static readonly deployTimestamp = new Date().toISOString();
  static readonly methods: apigw.Method[] = [];
  static readonly secrets: { [key: string]: sm.ISecret } = {};
  static vpc: ec2.IVpc;
  static lambdaSecurityGroup: ec2.ISecurityGroup;
  static tokenAuthorizerId: string;
  static corsHandler: lambda.IFunction;

  constructor(scope: cdk.App, props: cdk.StackProps) {
    super(scope, `${getCFStackPrefix()}-lambda-stack`, props);
  }

  static createFunctions(
    scope: cdk.Stack,
    props: cdk.StackProps & { baseResource: apigw.IResource }
  ): void {
    new UserConstruct(scope, props);
  }

  static getBaseResource(scope: Construct): apigw.IResource {
    const restApi = apigw.RestApi.fromRestApiAttributes(
      scope,
      `${getCFStackPrefix()}-rest-api`,
      {
        restApiId: cdk.Fn.importValue(
          `${getCFStackPrefix()}-${SharedIds.REST_API_ID}`
        ),
        rootResourceId: cdk.Fn.importValue(
          `${getCFStackPrefix()}-${SharedIds.REST_API_ROOT_RESOURCE_ID}`
        ),
      }
    );
    return restApi.root.resourceForPath('/');
  }

  static newLambdaFunction(
    scope: Construct,
    props: lambda.FunctionProps
  ): lambda.IFunction {
    return new lambda.Function(
      scope,
      `${getCFStackPrefix()}-${props.functionName}-function`,
      {
        memorySize: 256,
        tracing: lambda.Tracing.ACTIVE,
        ...props,
        functionName: `${getCFStackPrefix()}-${props.functionName}`,
        environment: {
          ...props.environment,
          DEPLOY_TIMESTAMP: LambdaStack.deployTimestamp,
          STAGE: getStage(),
          ALLOWED_ORIGINS: '["*"]',
          LOCAL: 'false', // this is overwritten by locals.json for local-development
          ...(isLocalDevelopment() && { FALLBACK_TOKEN: '' }),
        },
      }
    );
  }

  static addMethod(
    resource: apigw.IResource,
    httpMethod: string,
    func: lambda.IFunction
  ): void {
    if (!this.tokenAuthorizerId) {
      this.tokenAuthorizerId = isLocalDevelopment()
        ? ''
        : cdk.Fn.importValue(
            `${getCFStackPrefix()}-${SharedIds.REST_API_AUTHORIZER_ID}`
          );
    }
    const method = resource.addMethod(
      httpMethod,
      // `allowTestInvoke: false` helps keep the resource number low in the stack
      new apigw.LambdaIntegration(func, { allowTestInvoke: false }),
      {
        authorizationType: apigw.AuthorizationType.CUSTOM,
        authorizer: {
          authorizerId: this.tokenAuthorizerId,
          authorizationType: apigw.AuthorizationType.CUSTOM,
        },
      }
    );
    this.methods.push(method);
  }

  static addCorsOptions(
    scope: Construct,
    apiResource: apigw.Resource,
    methods: string[]
  ): void {
    if (isLocalDevelopment()) {
      if (!this.corsHandler) {
        this.corsHandler = this.newLambdaFunction(scope, {
          functionName: 'corsHandlerLocalDevelopment',
          code: lambda.Code.fromAsset('dist/bundle/core/aws'),
          handler: 'cors-lambda.handler',
          runtime: lambda.Runtime.NODEJS_14_X,
          timeout: cdk.Duration.seconds(30),
        });
      }
      this.addMethod(apiResource, 'OPTIONS', this.corsHandler);
    } else {
      apiResource.addCorsPreflight({
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: methods,
        allowHeaders: ['*'],
      });
    }
  }

  static retrieveSecret(
    scope: Construct,
    secretParameterName: string,
    secretFieldFromJson?: string
  ): string {
    if (isLocalDevelopment()) {
      return ''; // will be over-written from locals.json by AWS SAM CLI
    }

    if (!this.secrets[secretParameterName]) {
      const secretCompleteArn = ssm.StringParameter.valueForStringParameter(
        scope,
        `${getSSMPrefix()}${secretParameterName}`
      );
      this.secrets[secretParameterName] = sm.Secret.fromSecretAttributes(
        scope,
        `${getCFStackPrefix()}-${secretParameterName}-secret`,
        {
          secretCompleteArn,
        }
      );
    }

    if (secretFieldFromJson) {
      return this.secrets[secretParameterName]
        .secretValueFromJson(secretFieldFromJson)
        .toString();
    }

    return this.secrets[secretParameterName].secretValue.toString();
  }
}
