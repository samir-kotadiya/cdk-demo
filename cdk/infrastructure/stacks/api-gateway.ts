import * as apigw from 'aws-cdk-lib/aws-apigateway';
import { DomainName } from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { LambdaStack } from '../../backend/stacks/lambda-stack';
import { fromEnv } from '../../util';
import { getCFStackPrefix } from '../../util';
import { isLocalDevelopment } from '../../util';
import { SharedIds } from '../../shared-ids';

export interface ApiGWStackProps extends cdk.StackProps {
  domainName?: apigw.DomainName;
}

export class ApiGatewayStack extends cdk.Stack {
  readonly restApi: apigw.RestApi;

  constructor(scope: cdk.App, props: ApiGWStackProps) {
    super(scope, `${getCFStackPrefix()}-apigw-stack`, props);

    //add custom token authorizer
    const authorizer = new apigw.TokenAuthorizer(
      this,
      `${getCFStackPrefix()}-token-authorizer`,
      {
        handler: LambdaStack.newLambdaFunction(this, {
          functionName: 'tokenAuthorizer',
          code: lambda.Code.fromAsset('dist/bundle/authorizer'),
          handler: 'authorizer-lambda.handler',
          runtime: lambda.Runtime.NODEJS_16_X,
          timeout: cdk.Duration.seconds(30),
          environment: {
            JWKS_URL: fromEnv('JWKS_URL'),
          },
        }),
        resultsCacheTtl: cdk.Duration.minutes(10),
      }
    );

    this.restApi = new apigw.RestApi(
      this,
      `${getCFStackPrefix()}-apigw-rest-api`,
      {
        deployOptions: {
          stageName: 'v1',
        },
        endpointConfiguration: {
          types: [apigw.EndpointType.REGIONAL],
        },
        defaultMethodOptions: {
          authorizationType: apigw.AuthorizationType.CUSTOM,
          authorizer,
        },
      }
    );
    // We need to add a dummy resource so that the cdk accepts the apigw
    this.restApi.root.addMethod('GET', new apigw.MockIntegration());

    this.restApi.addUsagePlan(
      `${getCFStackPrefix()}-apigw-rest-api-plan-usage`,
      {
        apiStages: [
          {
            stage: this.restApi.deploymentStage,
          },
        ],
        // Throttle to lambda-limits.
        throttle: {
          rateLimit: 1000,
          burstLimit: 1000,
        },
      }
    );

    // if (isLocalDevelopment() && !props.domainName) {
    //   props.domainName = new DomainName(this, 'my-local-domain-name', {
    //     domainName: 'localhost',
    //     certificate: getApiGwCertificate(this, getHostedZone(this)),
    //   });
    // }

    // props.domainName!.addBasePathMapping(this.restApi, {
    //   stage: this.restApi.deploymentStage,
    // });

    if (isLocalDevelopment()) {
      LambdaStack.createFunctions(this, {
        ...props,
        baseResource: this.restApi.root.resourceForPath('/'),
      });
    } else {
      new cdk.CfnOutput(
        this,
        `${getCFStackPrefix()}-${SharedIds.REST_API_ID}`,
        {
          exportName: `${getCFStackPrefix()}-${SharedIds.REST_API_ID}`,
          value: this.restApi.restApiId,
        }
      );

      new cdk.CfnOutput(
        this,
        `${getCFStackPrefix()}-${SharedIds.REST_API_ROOT_RESOURCE_ID}`,
        {
          exportName: `${getCFStackPrefix()}-${
            SharedIds.REST_API_ROOT_RESOURCE_ID
          }`,
          value: this.restApi.restApiRootResourceId,
        }
      );
      new cdk.CfnOutput(
        this,
        `${getCFStackPrefix()}-${SharedIds.REST_API_AUTHORIZER_ID}`,
        {
          exportName: `${getCFStackPrefix()}-${
            SharedIds.REST_API_AUTHORIZER_ID
          }`,
          value: authorizer.authorizerId,
        }
      );
    }
  }
}
