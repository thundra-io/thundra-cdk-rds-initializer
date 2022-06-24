import * as cdk from 'aws-cdk-lib/core';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as log from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager'
import * as path from 'path';
import { DatabaseEngine, DatabaseInitializerProps } from './database-initializer-props';
import { Construct } from 'constructs';

/**
 * Properties to run a database script on AWS RDS
 */
export interface DatabaseScriptRunnerProps extends DatabaseInitializerProps {
    /**
     * Script to run in database.
     */
    readonly script: string;
}

/**
 * A resource to run database script on AWS RDS.
 *
 * @example
 *
 * new DatabaseScriptRunner(this, 'sample-database-script-runner', {
 *      databaseAdminUserSecret: secret,
 *      databaseEngine: DatabaseEngine.MySQL,
 *      script: 'select 1 from dual;'
 * });
 */
export class DatabaseScriptRunner extends cdk.Resource {
    private readonly prefix?: string;
    private readonly postfix?: string;
    private readonly databaseAdminUserSecret: secretsmanager.ISecret;
    private readonly script: string;
    private readonly databaseEngine: DatabaseEngine;

    public constructor(scope: Construct, id: string, props: DatabaseScriptRunnerProps) {
        super(scope, id);
        this.prefix = props.prefix || '';
        this.postfix = props.postfix || '';
        this.databaseAdminUserSecret = props.databaseAdminUserSecret;
        this.script = props.script;
        this.databaseEngine = props.databaseEngine;

        const databaseScriptRunnerFunction = new lambda.Function(this, `${this.prefix}database-script-runner-function${this.postfix}`, {
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: props.securityGroups,
            functionName: `${this.prefix}database-script-runner${this.postfix}`,
            code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
            handler: "index.databaseScriptRunnerHandler",
            runtime: lambda.Runtime.NODEJS_14_X,
            memorySize: 512,
            timeout: cdk.Duration.minutes(1),
            logRetention: log.RetentionDays.ONE_DAY,
            initialPolicy: [
                new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                        "secretsmanager:GetSecretValue",
                        "secretsmanager:DescribeSecret",
                    ],
                    resources: [
                        this.databaseAdminUserSecret.secretArn
                    ],
                })
            ]
        });

        const databaseScriptRunnerProvider = new cr.Provider(this, `${this.prefix}database-script-runner-provider${this.postfix}`, {
            onEventHandler: databaseScriptRunnerFunction,
            providerFunctionName: `${this.prefix}database-script-runner-provider${this.postfix}`
        })

        new cdk.CustomResource(this, `${this.prefix}database-script-runner-resource${this.postfix}`, {
            serviceToken: databaseScriptRunnerProvider.serviceToken,
            properties: {
                Region: cdk.Stack.of(this).region,
                DatabaseAdminUserSecretName: this.databaseAdminUserSecret.secretName,
                Script: this.script,
                DatabaseEngine: this.databaseEngine
            },
        });
    }

    protected validate(): string[] {
        const errors: string[] = [];

        if (this.script == null || this.script.trim().length === 0) {
            errors.push('Script properties must not be empty.');
        }

        if (this.databaseEngine == null || DatabaseEngine.MySQL !== this.databaseEngine) {
            errors.push('Only MySQL database engine is supported now.');
        }

        return errors;
    }
}
