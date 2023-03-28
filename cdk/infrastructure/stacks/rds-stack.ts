import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cdk from 'aws-cdk-lib';
import { SharedIds } from '../../shared-ids';
// import { assumePermission } from '../../permission';
import { getCFStackPrefix } from '../../util';
import { getStage } from '../../util';
import { getSSMPrefix } from '../../util';
import { getRDSPrefix } from '../../util';
import { isLive } from '../../util';
import { fromEnv } from '../../util';

function getScalingOptions(): rds.ServerlessScalingOptions {
  const stage = getStage();
  const minCapacity = rds.AuroraCapacityUnit.ACU_2;
  const maxCapacity = rds.AuroraCapacityUnit.ACU_2;
  let autoPause = cdk.Duration.seconds(0);
  if (stage === 'dev' || stage === 'pre') {
    autoPause = cdk.Duration.hours(2);
  }
  return {
    minCapacity,
    maxCapacity,
    autoPause,
  };
}

export interface RdsStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
  securityGroup: ec2.ISecurityGroup;
}

/**
 * The database back-ups are managed by AWS Backup service.
 * The back-up plan: https://collaboration.msi.audi.com/confluence/display/ECACP/NXTINF+-+Backup+Plan
 * AWS Backup configuration: https://collaboration.msi.audi.com/stash/projects/ELY/repos/terraform-modules/pull-requests/28/overview
 */
export class RdsStack extends cdk.Stack {
  public readonly serverlessCluster: rds.ServerlessClusterFromSnapshot;

  constructor(scope: cdk.App, props: RdsStackProps) {
    super(scope, `${getCFStackPrefix()}-rds-stack`, props);
    // assumePermission(this); // TODO is this needed?

    const credentials = rds.SnapshotCredentials.fromGeneratedSecret('postgres');
    const subnetGroup = new rds.SubnetGroup(
      this,
      `${getCFStackPrefix()}-rds-subnet-group`,
      {
        subnetGroupName: `${getCFStackPrefix()}-rds-subnet-group`,
        vpc: props.vpc,
        vpcSubnets: props.vpc.selectSubnets({
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }),
        description: 'Group of isolated subnets used by RDS',
      }
    );
    const rdsConfig: rds.ServerlessClusterFromSnapshotProps = {
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_10_18,
      }),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      subnetGroup,
      securityGroups: [props.securityGroup],
      enableDataApi: true, // we still use DataApi for KNEX migrations
      clusterIdentifier: getRDSPrefix(),
      backupRetention: cdk.Duration.days(isLive() ? 7 : 1),
      scaling: getScalingOptions(),
      defaultDatabaseName: SharedIds.DB_SCHEMA_NAME,
      credentials,
      snapshotIdentifier: fromEnv('DB_SNAPSHOT_IDENTIFIER'),
    };

    this.serverlessCluster = new rds.ServerlessClusterFromSnapshot(
      this,
      `${getCFStackPrefix()}-rds-serverless-cluster`,
      rdsConfig
    );

    // create two SSM parameters that will be used by KNEX migrations
    new ssm.StringParameter(
      this,
      `${getCFStackPrefix()}-${SharedIds.DB_RESOURCE_ARN}-parameter`,
      {
        parameterName: `${getSSMPrefix()}${SharedIds.DB_RESOURCE_ARN}`,
        stringValue: this.serverlessCluster.clusterArn,
        type: ssm.ParameterType.STRING,
      }
    );

    new ssm.StringParameter(
      this,
      `${getCFStackPrefix()}-${SharedIds.DB_SECRET_ARN}-parameter`,
      {
        parameterName: `${getSSMPrefix()}${SharedIds.DB_SECRET_ARN}`,
        stringValue: this.serverlessCluster.secret!.secretArn,
        type: ssm.ParameterType.STRING,
      }
    );
  }
}
