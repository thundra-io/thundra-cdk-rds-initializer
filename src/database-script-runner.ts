import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
import * as path from "path";
import { DatabaseInitializerProps } from "./database-initializer-props";

/**
 *
 */
export interface DatabaseScriptRunnerProps extends DatabaseInitializerProps {
  /**
   * 
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

  public constructor(scope: cdk.Construct, id: string, props: DatabaseScriptRunnerProps) {
    super(scope, id);
    this.prefix = props.prefix;
    this.databaseAdminUserSecret = props.databaseAdminUserSecret;
    this.script = props.script;

    const databaseScriptRunner = new lambda.Function(this, `${this.prefix}-database-script-runner`, {
      functionName: `${this.prefix}-database-script-runner`,
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      handler: "index.databaseScriptRunnerHandler",
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: cdk.Duration.minutes(1),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups
    });
    databaseScriptRunner.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
      ],
      resources: [
        this.databaseAdminUserSecret.secretArn
      ],
    }));

    new cdk.CustomResource(this, `${this.prefix}-database-script-runner-resource`, {
      serviceToken: databaseScriptRunner.functionArn,
      properties: {
        Region: cdk.Stack.of(this).region,
        DatabaseAdminUserSecretName: this.databaseAdminUserSecret.secretName,
        Script: this.script
      },
    });
  }

  // protected validate(): string[] {
  //   const errors: string[] = [];
  //   // Ensure the zone name is a parent zone of the certificate domain name
  //   if (!cdk.Token.isUnresolved(this.databaseAdminUserSecret)) {
  //     errors.push(`databaseAdminUserSecret is not null`);
  //   }

  //   if (this.script) {
  //     errors.push(`script is not empty`);
  //   }

  //   return errors;
  // }
}