import * as cdk from 'aws-cdk-lib';

const ALL_STAGES = ['live', 'pre', 'dev'] as const;
type Stage = (typeof ALL_STAGES)[number];

const stage = (process.env?.STAGE?.toLowerCase() ?? 'dev') as Stage;
const region = process.env?.CDK_DEPLOY_REGION ?? 'eu-central-1';
const account = process.env?.CDK_DEPLOY_ACCOUNT ?? '343593036049'; // use test account by default
const serviceName = 'test-service';
const tags = {
  Owner: 'Dev Team',
  Project: 'cdk-test-service',
  Service: serviceName,
  Environment: stage,
  Region: 'Europ',
  Stack: 'lambdas',
};

export const isLiveStage = (): boolean =>
  (process.env?.STAGE?.toLowerCase() ?? 'local') === 'live';

export const envProps: cdk.StackProps = {
  env: { account, region },
  tags,
};

export const getStage = (): Stage => stage;
export const getRegion = (): string => region;

export const getCFStackPrefix = (): string => {
  return `${stage}-${serviceName}`;
};

export const isLocalDevelopment = (): boolean => {
  const stage = process.env?.STAGE ?? 'dev';
  return (
    (process.env?.LOCAL?.toLowerCase() ?? 'false') === 'true' ||
    stage === 'local'
  );
};

export const isLive = (): boolean => getStage() === 'live';

export const fromEnv = (key: string): string => {
  // skip this step for local
  if (isLocalDevelopment()) {
    return '';
  }
  const value = process.env?.[key];
  if (value) {
    return value;
  }
  throw new Error(`Missing required ${key} env variable`);
};

export const getSSMPrefix = (): string => {
  return `/${stage}/${serviceName}/`;
};

export const getS3BucketName = (purpose: string): string => {
  return `${serviceName}-${purpose}-${stage}-${region}`;
};

export const getRDSPrefix = (): string => {
  return `${serviceName}-${stage}`;
};

export const getSQSPrefix = (): string => {
  return `${stage}-${serviceName}`;
};

export const getBaseDomainName = (): string => {
  return `${stage}.test.com`;
};

export const getApiGWDomainName = (): string => {
  return `${serviceName}.app.${getBaseDomainName()}`;
};

export const getStaticLegalDocsDomainName = (): string => {
  return `document.cdn.${getBaseDomainName()}`;
};

export const getStaticLegalDocsBaseDomain = (): string => {
  if (stage === 'live') {
    return 'acp.cloud.audi';
  }
  return `${stage}.test.com`;
};
