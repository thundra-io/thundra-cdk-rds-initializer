import * as cdk from "@aws-cdk/core";
import * as cr from "@aws-cdk/custom-resources";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as log from "@aws-cdk/aws-logs";
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as path from "path";
import {DatabaseInitializerProps, DatabaseUserGrant} from "./database-initializer-props";


export interface IAMUser {
    username: string;
    grants: DatabaseUserGrant[];
}

export interface User extends IAMUser {
    secret: secretsmanager.ISecret;
}

/**
 *
 */
export interface DatabaseUserInitializerProps extends DatabaseInitializerProps {
    /**
     *
     */
    readonly databaseUsers: (User | IAMUser)[];
}

/**
 *
 */
export class DatabaseUserInitializer extends cdk.Resource {
    private readonly prefix: string;
    private readonly databaseAdminUserSecret: secretsmanager.ISecret;
    private readonly databaseUsers: {
        username: string;
        grants: DatabaseUserGrant[];
        secret?: secretsmanager.ISecret;
    }[]

    public constructor(scope: cdk.Construct, id: string, props: DatabaseUserInitializerProps) {
        super(scope, id);
        this.prefix = props.prefix
        this.databaseAdminUserSecret = props.databaseAdminUserSecret;
        this.databaseUsers = props.databaseUsers;

        const resources: string[] = [this.databaseAdminUserSecret.secretArn];
        this.databaseUsers.forEach(user => {
            if (user.secret) {
                resources.push(user.secret!.secretArn)
            }
        });

        const databaseUserInitializerFunction = new lambda.Function(this, `${this.prefix}DatabaseUserInitializerFunction`, {
            vpc: props.vpc,
            vpcSubnets: props.vpcSubnets,
            securityGroups: props.securityGroups,
            functionName: `${this.prefix}DatabaseUserInitializer`,
            code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
            handler: "index.databaseUserInitializerHandler",
            runtime: lambda.Runtime.NODEJS_14_X,
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

        const databaseUserInitializerProvider = new cr.Provider(this, `${this.prefix}DatabaseUserInitializerProvider`, {
            onEventHandler: databaseUserInitializerFunction
        })

        const paramater: {
            username: string;
            grants: DatabaseUserGrant[];
            secretName?: string;
            isIAMUser: boolean;
        }[] = []
        this.databaseUsers.forEach(user => {
            if (user.secret) {
                paramater.push({
                    username: user.username,
                    grants: user.grants,
                    secretName: user.secret!.secretName,
                    isIAMUser: false
                })
            } else {
                paramater.push({
                    username: user.username,
                    grants: user.grants,
                    isIAMUser: true
                });
            }
        });

        new cdk.CustomResource(this, `${this.prefix}DatabaseUserInitializerResource`, {
            serviceToken: databaseUserInitializerProvider.serviceToken,
            properties: {
                Region: cdk.Stack.of(this).region,
                DatabaseAdminUserSecretName: this.databaseAdminUserSecret.secretName,
                DatabaseUsers: paramater
            },
        });
    }

    protected validate(): string[] {
        const errors: string[] = [];
        if (this.prefix.trim().length === 0) {
            errors.push('Prefix properties must not be empty.');
        }

        if (this.databaseUsers.length === 0) {
            errors.push('Database users properties must not be empty');
        }

        return errors;
    }
}
