import * as cdk from 'aws-cdk-lib';
import { config } from 'dotenv';
import { envProps } from '../util';
import { getStage } from '../util';
import { isLocalDevelopment } from '../util';
import { ApiGatewayStack } from '../infrastructure/stacks/api-gateway';
import { DeploymentStack } from '../backend/stacks/deployment-stack';
import { LambdaStack } from '../backend/stacks/lambda-stack';
import { ClamAVStack } from '../backend/stacks/clam-av-stack';

// source env configs
config({ path: `cdk/.env.${getStage()}` });

const app = new cdk.App();

if (isLocalDevelopment()) {
  // TODO https://github.com/aws/aws-sam-cli/issues/3306
  new ApiGatewayStack(app, envProps);
} else {
  new LambdaStack(app, envProps);
  new ClamAVStack(app, envProps);
  new DeploymentStack(app, {
    ...envProps,
    methods: LambdaStack.methods,
  });
}
