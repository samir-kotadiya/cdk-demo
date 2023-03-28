import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import { SharedIds } from '../../shared-ids';
import { getCFStackPrefix } from '../../util';
// import {assumePermission} from '../permission';

export interface DeploymentStackProps extends cdk.StackProps {
  methods: apigw.Method[];
}

export class DeploymentStack extends cdk.Stack {
  constructor(scope: cdk.App, props: DeploymentStackProps) {
    super(scope, `${getCFStackPrefix()}-deployment-stack`, props);
    // assumePermission(this);

    const restApi = apigw.RestApi.fromRestApiAttributes(
      this,
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
    const deployment = new apigw.Deployment(
      this,
      `${getCFStackPrefix()}-rest-api-deployment-${new Date().toISOString()}`,
      {
        api: restApi,
      }
    );

    if (props.methods) {
      for (const method of props.methods) {
        deployment.node.addDependency(method);
      }
    }

    // this is needed to deploy to existing v1 stage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (deployment as any).resource.stageName = 'v1';
  }
}
