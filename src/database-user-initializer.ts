import * as cdk from 'aws-cdk-lib';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as log from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as path from 'path';
import { DatabaseEngine, DatabaseInitializerProps, DatabaseUserGrant } from './database-initializer-props';
import { Construct } from 'constructs';

/**
 * Properties to create a database user with IAM support on AWS RDS
 */
export interface IAMUser {
    username: string;
    grants: DatabaseUserGrant[];
}

/**
 * Properties to create a database user with password on AWS RDS
 */
export interface User extends IAMUser {
    secret: secretsmanager.ISecret;
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

/**
 * A resource to create database user on AWS RDS.
 *
 * @example
 *
 * new DatabaseUserInitializer(this, 'sample-database-user-initializer', {
 *       databaseAdminUserSecret: secret,
 *       databaseEngine: DatabaseEngine.MySQL,
 *       databaseUsers: [
 *         {
 *           username: 'sample_rw_user',
 *           grants: [DatabaseUserGrant.ALL_PRIVILEGES],
 *           secret: userSecret
 *         },
 *         {
 *           username: 'sample_iam_user',
 *           grants: [DatabaseUserGrant.SELECT, DatabaseUserGrant.INSERT, DatabaseUserGrant.UPDATE],
 *         }
 *       ]
 * });
 */
export class DatabaseUserInitializer extends cdk.Resource {
    private readonly prefix?: string;
    private readonly postfix?: string;
    private readonly databaseAdminUserSecret: secretsmanager.ISecret;
    private readonly databaseEngine: DatabaseEngine;
    private readonly databaseUsers: {
        username: string;
        grants: DatabaseUserGrant[];
        secret?: secretsmanager.ISecret;
    }[]

    public constructor(scope: Construct, id: string, props: DatabaseUserInitializerProps) {
        super(scope, id);
        this.prefix = props.prefix || '';
        this.postfix = props.postfix || '';
        this.databaseAdminUserSecret = props.databaseAdminUserSecret;
        this.databaseEngine = props.databaseEngine;
        this.databaseUsers = props.databaseUsers;

        const resources: string[] = [this.databaseAdminUserSecret.secretArn];
        this.databaseUsers.forEach(user => {
            if (user.secret) {
                resources.push(user.secret!.secretArn)
            }
        });

        const databaseUserInitializerFunction = new lambda.Function(this, `${this.prefix}database-user-initializer-function${this.postfix}`, {
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: props.securityGroups,
            functionName: `${this.prefix}database-user-initializer${this.postfix}`,
            code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
            handler: "index.databaseUserInitializerHandler",
            runtime: lambda.Runtime.NODEJS_20_X,
            memorySize: 512,
            timeout: cdk.Duration.minutes(1),
            logRetention: log.RetentionDays.ONE_DAY,
            initialPolicy: [new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    "secretsmanager:GetSecretValue",
                    "secretsmanager:DescribeSecret",
                ],
                resources: resources,
            })]
        });

        const databaseUserInitializerProvider = new cr.Provider(this, `${this.prefix}database-user-initializer-provider${this.postfix}`, {
            onEventHandler: databaseUserInitializerFunction,
            providerFunctionName: `${this.prefix}database-user-initializer-provider${this.postfix}`,
        })

        const parameter: {
            username: string;
            grants: DatabaseUserGrant[];
            secretName?: string;
            isIAMUser: boolean;
        }[] = []
        this.databaseUsers.forEach(user => {
            if (user.secret) {
                parameter.push({
                    username: user.username,
                    grants: user.grants,
                    secretName: user.secret!.secretName,
                    isIAMUser: false
                })
            } else {
                parameter.push({
                    username: user.username,
                    grants: user.grants,
                    isIAMUser: true
                });
            }
        });

        new cdk.CustomResource(this, `${this.prefix}database-user-initializer-resource${this.postfix}`, {
            serviceToken: databaseUserInitializerProvider.serviceToken,
            properties: {
                Region: cdk.Stack.of(this).region,
                DatabaseAdminUserSecretName: this.databaseAdminUserSecret.secretName,
                DatabaseUsers: parameter,
                DatabaseEngine: this.databaseEngine
            },
        });
    }
}
