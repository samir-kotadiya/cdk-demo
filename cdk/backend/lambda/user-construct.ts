import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaStack } from '../stacks/lambda-stack';
import { LambdaStackProps } from '../stacks/lambda-stack';
import { getCFStackPrefix } from '../../util';

export type UserConstructProps = LambdaStackProps;

const POWERTOOLS_SERVICE_NAME = 'UserService';

export class UserConstruct extends Construct {
  constructor(scope: cdk.Stack, props: UserConstructProps) {
    super(scope, `${getCFStackPrefix()}-user-construct`);

    const userResource = props.baseResource.addResource('users');

    const createUserFunction = LambdaStack.newLambdaFunction(this, {
      functionName: 'createUser',
      code: lambda.Code.fromAsset('dist/bundle/users', {
        exclude: ['**', '!create-user-lambda.js'],
      }),
      handler: 'create-user-lambda.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(30), // TODO
      environment: {
        POWERTOOLS_SERVICE_NAME,
      },
    });
    LambdaStack.addMethod(userResource, 'POST', createUserFunction);

    // ============================================================

    const getUsersFunction = LambdaStack.newLambdaFunction(this, {
      functionName: 'getUsers',
      code: lambda.Code.fromAsset('dist/bundle/users', {
        exclude: ['**', '!get-users-lambda.js'],
      }),
      handler: 'get-users-lambda.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(30), // TODO
      environment: {
        POWERTOOLS_SERVICE_NAME,
      },
    });
    LambdaStack.addMethod(userResource, 'GET', getUsersFunction);

    LambdaStack.addCorsOptions(this, userResource, ['GET', 'POST']);

    // ===============================================================

    const userWithIdResource = userResource.addResource('{id}');

    const getUserFunction = LambdaStack.newLambdaFunction(this, {
      functionName: 'getUser',
      code: lambda.Code.fromAsset('dist/bundle/users', {
        exclude: ['**', '!get-user-lambda.js'],
      }),
      handler: 'get-user-lambda.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(30), // TODO
      environment: {
        POWERTOOLS_SERVICE_NAME,
      },
    });
    LambdaStack.addMethod(userWithIdResource, 'GET', getUserFunction);
    LambdaStack.addCorsOptions(this, userWithIdResource, ['GET']);
  }
}
