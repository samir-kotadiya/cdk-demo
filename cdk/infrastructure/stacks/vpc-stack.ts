import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as cdk from 'aws-cdk-lib';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { SharedIds } from '../../shared-ids';
// import {assumePermission} from '../permission';
import { getCFStackPrefix } from '../../util';
import { getSSMPrefix } from '../../util';
import { getStage } from '../../util';

/**
 * AMQP VPC Peering is manually configured from AWS Console
 */
export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.IVpc;
  public readonly rdsSecurityGroup: ec2.ISecurityGroup;
  public readonly lambdaSecurityGroup: ec2.ISecurityGroup;

  constructor(scope: cdk.App, props: cdk.StackProps) {
    super(scope, `${getCFStackPrefix()}-vpc-stack`, props);
    // assumePermission(this); // TODO is this needed?

    // avoid conflict between DEV and PRE VPC in the test account
    const cidr = getStage() === 'dev' ? '10.0.16.0/20' : '10.0.0.0/20';

    this.vpc = new ec2.Vpc(this, `${getCFStackPrefix()}-vpc`, {
      natGateways: 1,
      cidr,
      subnetConfiguration: [
        {
          name: `${getCFStackPrefix()}-isolated-`,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 23,
        },
        {
          name: `${getCFStackPrefix()}-private-`,
          subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          cidrMask: 22,
        },
        {
          name: `${getCFStackPrefix()}-public-`,
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 23,
        },
      ],
      maxAzs: 2,
    });

    this.rdsSecurityGroup = new ec2.SecurityGroup(
      this,
      `${getCFStackPrefix()}-rds-security-group`,
      {
        vpc: this.vpc,
        allowAllOutbound: false,
      }
    );

    this.lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      `${getCFStackPrefix()}-lambda-security-group`,
      {
        vpc: this.vpc,
        allowAllOutbound: false,
      }
    );

    this.lambdaSecurityGroup.addEgressRule(
      this.rdsSecurityGroup,
      ec2.Port.tcp(5432)
    );

    this.rdsSecurityGroup.addIngressRule(
      this.lambdaSecurityGroup,
      ec2.Port.tcp(5432)
    );

    // HTTPS port
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443)
    );

    // AMQP TLS port
    this.lambdaSecurityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(5671)
    );

    // TODO import the VPC Peering and add routes

    // output the VpcId to ParameterStore so LambdaStack can read the id before deploy time
    // ec2.Vpc.fromLookup does not work with tokens, so CfnOutput would not work in this case
    new ssm.StringParameter(
      this,
      `${getCFStackPrefix()}-${SharedIds.VPC_ID}-parameter`,
      {
        parameterName: `${getSSMPrefix()}${SharedIds.VPC_ID}`,
        stringValue: this.vpc.vpcId,
        type: ssm.ParameterType.STRING,
      }
    );

    // export the vpcId for the elysium VPC peering
    new cdk.CfnOutput(this, `${getCFStackPrefix()}-${SharedIds.VPC_ID}`, {
      exportName: `${getCFStackPrefix()}-${SharedIds.VPC_ID}`,
      value: this.vpc.vpcId,
    });

    // export the routeTableIds of private subnet for the elysium VPC peering
    new cdk.CfnOutput(
      this,
      `${getCFStackPrefix()}-${SharedIds.PRIVATE_ROUTE_TABLE_IDS}`,
      {
        exportName: `${getCFStackPrefix()}-${
          SharedIds.PRIVATE_ROUTE_TABLE_IDS
        }`,
        value: this.vpc
          .selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
          })
          .subnets.map((value) => value.routeTable.routeTableId)
          .join(','),
      }
    );

    new cdk.CfnOutput(
      this,
      `${getCFStackPrefix()}-${SharedIds.VPC_LAMBDA_SG_ID}`,
      {
        exportName: `${getCFStackPrefix()}-${SharedIds.VPC_LAMBDA_SG_ID}`,
        value: this.lambdaSecurityGroup.securityGroupId,
      }
    );
  }
}
