import * as cdk from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
// import {assumePermission} from '../permission';
import { SharedIds } from '../../shared-ids';
import { getCFStackPrefix } from '../../util';
import { getSQSPrefix } from '../../util';

export class SQSStack extends cdk.Stack {
  constructor(scope: cdk.App, props: cdk.StackProps) {
    super(scope, `${getCFStackPrefix()}-sqs-stack`, props);
    // assumePermission(this); // TODO is this needed?

    const deadLetterQueue = new sqs.Queue(
      this,
      `${getSQSPrefix()}-doc-generator-dlq`
    );

    const queue = new sqs.Queue(this, `${getSQSPrefix()}-doc-generator-queue`, {
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: deadLetterQueue,
      },
      visibilityTimeout: cdk.Duration.seconds(300),
    });

    new cdk.CfnOutput(
      this,
      `${getCFStackPrefix()}-${SharedIds.TERMINATION_DOC_QUEUE_ARN}`,
      {
        exportName: `${getCFStackPrefix()}-${
          SharedIds.TERMINATION_DOC_QUEUE_ARN
        }`,
        value: queue.queueArn,
      }
    );
  }
}
