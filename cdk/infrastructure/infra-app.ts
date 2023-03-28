#!/usr/bin/env node
import { config } from 'dotenv';
import * as cdk from 'aws-cdk-lib';
import { getStage } from '../util';
import { ApiGatewayStack } from './stacks/api-gateway';
import { envProps } from '../util';
import { Route53Stack } from './stacks/r53-stack';
import { VpcStack } from './stacks/vpc-stack';
import { RdsStack } from './stacks/rds-stack';
import { S3Stack } from './stacks/s3-stack';
import { SQSStack } from './stacks/sqs-stack';

// source env configs
config({ path: `cdk/.env.${getStage()}` });
const app = new cdk.App();

//new CdkTestStack(app, 'CdkTestStack', {
/* If you don't specify 'env', this stack will be environment-agnostic.
 * Account/Region-dependent features and context lookups will not work,
 * but a single synthesized template can be deployed anywhere. */

/* Uncomment the next line to specialize this stack for the AWS Account
 * and Region that are implied by the current CLI configuration. */
// env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },

/* Uncomment the next line if you know exactly what Account and Region you
 * want to deploy the stack to. */
// env: { account: '123456789012', region: 'us-east-1' },

/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
//});

// const route53Stack = new Route53Stack(app, envProps);
// const vpcStack = new VpcStack(app, envProps);
// new RdsStack(app, {
//   ...envProps,
//   vpc: vpcStack.vpc,
//   securityGroup: vpcStack.rdsSecurityGroup,
// });
// new S3Stack(app, envProps);
// new SQSStack(app, envProps);
const apiGwStack = new ApiGatewayStack(app, {
  ...envProps,
  //domainName: route53Stack.apiGwDomainName,
});
