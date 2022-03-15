import * as cdk from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as log from "@aws-cdk/aws-logs";
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as path from "path";
import {DatabaseEngine, DatabaseInitializerProps} from "./database-initializer-props";

/**
 *
 */
export interface DatabaseScriptRunnerProps extends DatabaseInitializerProps {
    /**
     * Script to be run by custom resource.
     */
    readonly script: string;
}

/**
 *
 */
export class DatabaseScriptRunner extends cdk.Resource {
    private readonly prefix: string;
    private readonly databaseAdminUserSecret: secretsmanager.ISecret;
    private readonly script: string;
    private readonly databaseEngine: DatabaseEngine;

    public constructor(scope: cdk.Construct, id: string, props: DatabaseScriptRunnerProps) {
        super(scope, id);
        this.prefix = props.prefix;
        this.databaseAdminUserSecret = props.databaseAdminUserSecret;
        this.script = props.script;
        this.databaseEngine = props.databaseEngine;

        const databaseScriptRunnerFunction = new lambda.Function(this, `${this.prefix}DatabaseScriptRunnerFunction`, {
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: props.securityGroups,
            functionName: `${this.prefix}DatabaseScriptRunner`,
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

        const databaseScriptRunnerProvider = new cr.Provider(this, `${this.prefix}DatabaseScriptRunnerProvider`, {
            onEventHandler: databaseScriptRunnerFunction
        })

        new cdk.CustomResource(this, `${this.prefix}DatabaseScriptRunnerResource`, {
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

        if (this.prefix == null || this.prefix.trim().length === 0) {
            errors.push('Prefix properties must not be empty.');
        }

        if (this.script == null || this.script.trim().length === 0) {
            errors.push('Script properties must not be empty.');
        }

        if (this.databaseEngine == null || DatabaseEngine.MySQL !== this.databaseEngine) {
            errors.push('Only MySQL database engine is supported now.');
        }

        return errors;
    }
}
