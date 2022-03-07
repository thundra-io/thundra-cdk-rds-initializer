import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNode from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
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
  private readonly databaseAdminUserSecretName: string;
  private readonly script: string;

  public constructor(scope: cdk.Construct, id: string, props: DatabaseScriptRunnerProps) {
    super(scope, id);
    this.prefix = props.prefix;
    this.databaseAdminUserSecretName = props.databaseAdminUserSecretName;
    this.script = props.script;

    const databaseScriptRunner = new lambdaNode.NodejsFunction(this, `${this.prefix}-database-script-runner`, {
      functionName: `${this.prefix}-database-script-runner`,
      entry: path.join(__dirname, "..", "lambdas", 'src', 'index.ts'),
      handler: "databaseScriptRunnerHandler",
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: cdk.Duration.minutes(15),
      bundling: {
        nodeModules: ['mysql', 'uuid'],
        minify: false, // minify code, defaults to false
        sourceMap: true, // include source map, defaults to false
        sourceMapMode: lambdaNode.SourceMapMode.EXTERNAL, // defaults to SourceMapMode.DEFAULT
        sourcesContent: false, // do not include original source into source map, defaults to true
        target: 'es2020', // target environment for the generated JavaScript code
      },
      allowPublicSubnet: true,
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
        `arn:${cdk.Stack.of(this).partition}:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${this.databaseAdminUserSecretName}-*`
      ],
    }));

    new cdk.CustomResource(this, `${this.prefix}-database-script-runner-resource`, {
      serviceToken: databaseScriptRunner.functionArn,
      properties: {
        Region: cdk.Stack.of(this).region,
        DatabaseAdminUserSecretName: this.databaseAdminUserSecretName,
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