# @thundra/cdk-rds-initializer
## RDS Database User Initializer and Script Runner Construct for AWS CDK

This package provides Constructs for creating database user & running database script which can be used in RDS.

This package automatically create database user and run database script.

-----

## About CDK Compatibility

`@thundra/cdk-rds-initializer` is currently only supported to CDK v1.

## About RDS Compatibility

`@thundra/cdk-rds-initializer` is currently only supported to MySQL.

## Installation

### npm

```shell
npm i @thundra/cdk-rds-initializer
```

## Example

```typescript
import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as rds from '@aws-cdk/aws-rds';
import * as logs from '@aws-cdk/aws-logs';
import * as secretsmanager from '@aws-cdk/aws-secretsmanager';
import * as thundra from '@thundra/cdk-rds-initializer';

    //... 
    const vpc = ec2.Vpc.fromLookup(this, `sample-vpc`, { isDefault: true });

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Security Groups
    //
    const sampleDatabaseSecurityGroup = new ec2.SecurityGroup(this, `sample-database-sg`, {
      vpc: vpc,
      securityGroupName: `sample-database-sg`,
      description: `sample-database-sg`,
      allowAllOutbound: true
    });
    cdk.Aspects.of(sampleDatabaseSecurityGroup).add(
            new cdk.Tag(
                    'Name',
                    `sample-database-sg`
            )
    );
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Secret Manager
    //
    const sampleDatabaseAdminUserSecret = new secretsmanager.Secret(this, `sample-database-admin-secret`, {
      secretName: `sample-database-admin-secret`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          'username': 'sample_db_admin',
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });
    const sampleDatabaseRWUserSecret = new secretsmanager.Secret(this, `sample-database-rw-user-secret`, {
      secretName: `sample-database-rw-user-secret`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          'username': 'sample_rw_user'
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });
    const sampleDatabaseROUserSecret = new secretsmanager.Secret(this, `sample-database-ro-user-secret`, {
      secretName: `sample-database-ro-user-secret`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          'username': 'sample_ro_user'
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: 'password'
      }
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // DatabaseCluster
    //
    const sampleDatabaseCluster = new rds.DatabaseCluster(this, `sample-database`, {
      engine: rds.DatabaseClusterEngine.auroraMysql({ version: rds.AuroraMysqlEngineVersion.VER_2_10_1 }),
      instanceProps: {
        vpc: vpc,
        autoMinorVersionUpgrade: true,
        deleteAutomatedBackups: false,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MEDIUM),
        publiclyAccessible: true,
        securityGroups: [sampleDatabaseSecurityGroup],
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC
        }
      },
      backtrackWindow: cdk.Duration.hours(12),
      backup: {
        retention: cdk.Duration.days(7),
        preferredWindow: '01:00-02:00'
      },
      cloudwatchLogsExports: ['error', 'general', 'slowquery', 'audit'],
      cloudwatchLogsRetention: logs.RetentionDays.ONE_DAY,
      clusterIdentifier: `sample-database`,
      copyTagsToSnapshot: true,
      credentials: rds.Credentials.fromSecret(sampleDatabaseAdminUserSecret, "sample_db_admin"),
      defaultDatabaseName: 'sampledb',
      deletionProtection: false,
      iamAuthentication: true,
      instanceIdentifierBase: `sample-database-instance-`,
      instances: 1,
      monitoringInterval: cdk.Duration.seconds(60),
      port: 3306,
      preferredMaintenanceWindow: 'Sun:03:00-Sun:03:30',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      storageEncrypted: true
    });
    ////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // Database Initializer
    //
    const userInitializer = new thundra.DatabaseUserInitializer(this, 'sample-database-user-initializer', {
        prefix: 'Sample',
        databaseAdminUserSecret: sampleDatabaseAdminUserSecret,
        databaseEngine: thundra.DatabaseEngine.MySQL,
        databaseUsers: [
            {
                username: 'sample_rw_user',
                grants: [thundra.DatabaseUserGrant.ALL_PRIVILEGES],
                secret: sampleDatabaseRWUserSecret
            },
            {
                username: 'sample_ro_user',
                grants: [thundra.DatabaseUserGrant.SELECT],
                secret: sampleDatabaseROUserSecret
            }
        ]
    });
    userInitializer.node.addDependency(sampleDatabaseCluster);
    
    const scriptRunner = new thundra.DatabaseScriptRunner(this, 'sample-database-script-runner', {
      prefix: 'Sample',
      databaseAdminUserSecret: sampleDatabaseAdminUserSecret,
      databaseEngine: thundra.DatabaseEngine.MySQL,
      script: 'select 1 from dual;'
    });
    scriptRunner.node.addDependency(sampleDatabaseCluster);
    // ...
```

## Constructs

### DatabaseScriptRunner

#### Initializer

```typescript
new DatabaseScriptRunner(scope: cdk.Construct, id: string, props: DatabaseScriptRunnerProps);
```

#### Construct Props

```typescript
/**
 * Base properties for database initializer resources.
 */
export interface DatabaseInitializerProps {
    /**
     * Prefix to be used to name custom resources.
     */
    readonly prefix: string;
    /**
     * Secret to be used for database connection.
     * Secret must contain database information.
     */
    readonly databaseAdminUserSecret: secretsmanager.ISecret;
    /**
     * Vpc where custom resource lambda will be deployed.
     * If database is in vpc, database vpc should be given.
     */
    readonly vpc?: ec2.IVpc;
    /**
     * Subnet where custom resource lambda will be deployed.
     * Must be the same as the database subnet.
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * SecurityGroup that custom resource lambda will use.
     * Security group must have internet access as lambda  needs access to secret manager.
     */
    readonly securityGroups?: ec2.ISecurityGroup[];
    /**
     * Database engine type. Like MySQL or PostgreSQL.
     */
    readonly databaseEngine: DatabaseEngine;
}

/**
 * Properties to run a database script on AWS RDS
 */
export interface DatabaseScriptRunnerProps extends DatabaseInitializerProps {
    /**
     * Script to run in database.
     */
    readonly script: string;
}
```
### DatabaseUserInitializer

#### Initializer

```typescript
new DatabaseUserInitializer(scope: cdk.Construct, id: string, props: DatabaseUserInitializerProps);
```

#### Construct Props

```typescript
/**
 * Base properties for database initializer resources.
 */
export interface DatabaseInitializerProps {
    /**
     * Prefix to be used to name custom resources.
     */
    readonly prefix: string;
    /**
     * Secret to be used for database connection.
     * Secret must contain database information.
     */
    readonly databaseAdminUserSecret: secretsmanager.ISecret;
    /**
     * Vpc where custom resource lambda will be deployed.
     * If database is in vpc, database vpc should be given.
     */
    readonly vpc?: ec2.IVpc;
    /**
     * Subnet where custom resource lambda will be deployed.
     * Must be the same as the database subnet.
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * SecurityGroup that custom resource lambda will use.
     * Security group must have internet access as lambda  needs access to secret manager.
     */
    readonly securityGroups?: ec2.ISecurityGroup[];
    /**
     * Database engine type. Like MySQL or PostgreSQL.
     */
    readonly databaseEngine: DatabaseEngine;
}

/**
 * Properties to create a database user on AWS RDS
 */
export interface DatabaseUserInitializerProps extends DatabaseInitializerProps {
    /**
     * List of users to be creating on AWS RDS
     */
    readonly databaseUsers: (User | IAMUser)[];
}
```


## Licensing
@thundra/cdk-rds-initializer is licensed under the Apache License, Version 2.0. See
[LICENSE](LICENSE) for the full
license text.
