import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { ServerlessClamscan } from 'cdk-serverless-clamscan';
// import { assumePermission } from '../permission';
import { getCFStackPrefix } from '../../util';
import { getS3BucketName } from '../../util';
import { SharedIds } from '../../shared-ids';
import { LambdaStack } from './lambda-stack';
import { LambdaDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Effect } from 'aws-cdk-lib/aws-iam';

export class ClamAVStack extends cdk.Stack {
  constructor(scope: cdk.App, props: cdk.StackProps) {
    super(scope, `${getCFStackPrefix()}-clam-av-stack`, props);
    // assumePermission(this);

    const POWERTOOLS_SERVICE_NAME = 'ScanDocumentService';

    const S3Bucket = s3.Bucket.fromBucketName(
      this,
      `${getS3BucketName(SharedIds.BUCKET_NAME)}-bucket`,
      getS3BucketName(SharedIds.BUCKET_NAME)
    );
    const successfulScanResultHandler = LambdaStack.newLambdaFunction(this, {
      functionName: 'scanSuccessLegalDocument',
      code: lambda.Code.fromAsset('dist/bundle/legal-document', {
        exclude: ['**', '!scan-success-legal-document-lambda.js'],
      }),
      handler: 'scan-success-legal-document-lambda.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(30), // TODO
      environment: {
        POWERTOOLS_SERVICE_NAME,
        LEGAL_DOCUMENT_BUCKET_NAME: S3Bucket.bucketName,
      },
    });

    S3Bucket.grantDelete(successfulScanResultHandler);

    const errorScanResultHandler = LambdaStack.newLambdaFunction(this, {
      functionName: 'scanErrorLegalDocument',
      code: lambda.Code.fromAsset('dist/bundle/legal-document', {
        exclude: ['**', '!scan-error-legal-document-lambda.js'],
      }),
      handler: 'scan-error-legal-document-lambda.handler',
      runtime: lambda.Runtime.NODEJS_16_X,
      timeout: cdk.Duration.seconds(30), // TODO
      environment: {
        POWERTOOLS_SERVICE_NAME,
        LEGAL_DOCUMENT_BUCKET_NAME: S3Bucket.bucketName,
      },
    });

    S3Bucket.grantDelete(errorScanResultHandler);

    const serverlessClamscan = new ServerlessClamscan(
      this,
      `${getCFStackPrefix()}-clamscan-av`,
      {
        acceptResponsibilityForUsingImportedBucket: true,
        buckets: [S3Bucket],
        reservedConcurrency: 2,
        defsBucketAccessLogsConfig: {
          logsBucket: false,
        },
        onResult: new LambdaDestination(successfulScanResultHandler),
        onError: new LambdaDestination(errorScanResultHandler),
        scanFunctionMemorySize: 4096,
      }
    );

    const bucketPolicy = new s3.BucketPolicy(
      this,
      `${getCFStackPrefix()}-bucket-policy`,
      {
        bucket: S3Bucket,
      }
    );

    bucketPolicy.document.addStatements(
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['s3:GetObject'],
        resources: [S3Bucket.arnForObjects('*')],
        principals: [
          new iam.CanonicalUserPrincipal(
            cdk.Fn.importValue(
              `${getCFStackPrefix()}-${SharedIds.S3_LEGAL_DOCS_OAI}`
            )
          ),
        ],
      }),
      serverlessClamscan.getPolicyStatementForBucket(S3Bucket)
    );
  }
}
