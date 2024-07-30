import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';

export class Cdk3tierAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Presentation Tier: S3 bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
    });

    // Networking
    const vpc = new ec2.Vpc(this, 'AppVPC', {
      maxAzs: 2,
    });

    // Application Tier: ECS Fargate service
    const cluster = new ecs.Cluster(this, 'AppCluster', { vpc });
   
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'AppTaskDef');
   
    taskDefinition.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromAsset('./app'),
      memoryLimitMiB: 512,
      cpu: 256,
      portMappings: [{ containerPort: 3000 }],
    });

    new ecs.FargateService(this, 'AppService', {
      cluster,
      taskDefinition,
      desiredCount: 2,
    });

    // Data Tier: RDS PostgreSQL instance
    new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_13 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
    });

    // Output the website URL
    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'The URL of the website',
    });
  }
}