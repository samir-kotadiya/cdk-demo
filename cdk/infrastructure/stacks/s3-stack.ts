import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ObjectOwnership } from 'aws-cdk-lib/aws-s3';
//import { assumePermission } from '../../permission';
import { SharedIds } from '../../shared-ids';
import { getCFStackPrefix } from '../../util';
import { getS3BucketName } from '../../util';
import { isLive } from '../../util';

export class S3Stack extends cdk.Stack {
  constructor(scope: cdk.App, props: cdk.StackProps) {
    super(scope, `${getCFStackPrefix()}-s3-stack`, props);
    //assumePermission(this);
    const removalPolicy = isLive()
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    new s3.Bucket(this, `${getS3BucketName(SharedIds.BUCKET_NAME)}-bucket`, {
      publicReadAccess: false,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      removalPolicy,
      bucketName: getS3BucketName(SharedIds.BUCKET_NAME),
      lifecycleRules: [
        {
          enabled: true,
          tagFilters: { temp: 'expired7days' },
          expiration: cdk.Duration.days(7),
        },
      ],
    });
  }
}
