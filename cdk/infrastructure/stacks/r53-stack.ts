import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
// import { assumePermission } from '../permission';
import { getBaseDomainName } from '../../util';
import { getCFStackPrefix } from '../../util';
import { getApiGWDomainName } from '../../util';
import { getStaticLegalDocsDomainName } from '../../util';
import { getS3BucketName } from '../../util';
import { getStaticLegalDocsBaseDomain } from '../../util';
import { SharedIds } from '../../shared-ids';

export class Route53Stack extends cdk.Stack {
  readonly zone: route53.IHostedZone;
  readonly globalZone: route53.IHostedZone;
  readonly apiGwCertificate: acm.ICertificate;
  readonly staticLegalDocsCertificate: acm.ICertificate;
  readonly apiGwDomainName: apigw.DomainName;

  constructor(scope: cdk.App, props: cdk.StackProps) {
    super(scope, `${getCFStackPrefix()}-r53-stack`, props);
    // assumePermission(this);
    this.zone = getHostedZone(this);
    this.globalZone = route53.HostedZone.fromLookup(
      this,
      `${getCFStackPrefix()}-r53-global-zone`,
      {
        domainName: getStaticLegalDocsBaseDomain(),
      }
    );
    this.apiGwCertificate = getApiGwCertificate(this, this.zone);
    this.staticLegalDocsCertificate = getStaticDocsCertificate(
      this,
      this.globalZone
    );
    this.apiGwDomainName = new apigw.DomainName(
      this,
      `${getCFStackPrefix()}-api-domain-options`,
      {
        domainName: getApiGWDomainName(),
        certificate: this.apiGwCertificate,
        endpointType: apigw.EndpointType.REGIONAL,
        securityPolicy: apigw.SecurityPolicy.TLS_1_2,
      }
    );

    new route53.ARecord(this, `${getCFStackPrefix()}-r53-api-alias-record`, {
      recordName: getApiGWDomainName(),
      target: route53.RecordTarget.fromAlias(
        new targets.ApiGatewayDomain(this.apiGwDomainName)
      ),
      zone: this.zone,
    });

    const oai = new cloudfront.OriginAccessIdentity(
      this,
      `${getCFStackPrefix()}-cf-oai`,
      {
        comment: 'OAI for static legal docs bucket.',
      }
    );

    new cdk.CfnOutput(
      this,
      `${getCFStackPrefix()}-${SharedIds.S3_LEGAL_DOCS_OAI}`,
      {
        exportName: `${getCFStackPrefix()}-${SharedIds.S3_LEGAL_DOCS_OAI}`,
        value: oai.cloudFrontOriginAccessIdentityS3CanonicalUserId,
      }
    );

    const legalDocsBucket = s3.Bucket.fromBucketName(
      this,
      `${getS3BucketName(SharedIds.BUCKET_NAME)}-bucket`,
      getS3BucketName(SharedIds.BUCKET_NAME)
    );

    const distribution = new cloudfront.Distribution(
      this,
      `${getCFStackPrefix()}-cf-distribution`,
      {
        defaultBehavior: {
          origin: new origins.S3Origin(legalDocsBucket, {
            originAccessIdentity: oai,
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          responseHeadersPolicy:
            cloudfront.ResponseHeadersPolicy
              .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
        },
        domainNames: [getStaticLegalDocsDomainName()],
        certificate: this.staticLegalDocsCertificate,
      }
    );

    // Route53 alias record for the CloudFront distribution
    new route53.ARecord(this, `${getCFStackPrefix()}-r53-static-alias-record`, {
      recordName: getStaticLegalDocsDomainName(),
      target: route53.RecordTarget.fromAlias(
        new targets.CloudFrontTarget(distribution)
      ),
      zone: this.globalZone,
    });
  }
}

export const getHostedZone = (scope: cdk.Stack): route53.IHostedZone => {
  return route53.HostedZone.fromLookup(
    scope,
    `${getCFStackPrefix()}-r53-emea-zone`,
    {
      domainName: getBaseDomainName(),
    }
  );
};

export const getApiGwCertificate = (
  scope: cdk.Stack,
  zone: route53.IHostedZone
): acm.ICertificate => {
  return new acm.DnsValidatedCertificate(
    scope,
    `${getCFStackPrefix()}-acm-certificate`,
    {
      domainName: getApiGWDomainName(),
      hostedZone: zone,
    }
  );
};

// ACM certificate for a global CloudFront distribution must be requested in us-east-1.
export const getStaticDocsCertificate = (
  scope: cdk.Stack,
  zone: route53.IHostedZone
): acm.ICertificate => {
  return new acm.DnsValidatedCertificate(
    scope,
    `${getCFStackPrefix()}-static-acm-certificate`,
    {
      domainName: getStaticLegalDocsDomainName(),
      hostedZone: zone,
      region: 'us-east-1',
    }
  );
};
