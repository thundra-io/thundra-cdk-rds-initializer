import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNode from "@aws-cdk/aws-lambda-nodejs";
import * as cdk from "@aws-cdk/core";
import * as path from "path";
import { DatabaseInitializerProps, DatabaseUserGrant } from "./database-initializer-props";

/**
 * 
 */
export interface DatabaseUserInitializerProps extends DatabaseInitializerProps {
  /**
   * 
   */
  readonly databaseUsers: {
    username: string,
    grants: DatabaseUserGrant[]
    secretName: string;
    /**
    * 
    * @default false
    */
    isIAMUser?: boolean;
  }[]
}

/**
 * 
 */
export class DatabaseUserInitializer extends cdk.Resource {
  private readonly prefix: string;
  private readonly databaseAdminUserSecretName: string;
  private readonly databaseUsers: {
    username: string;
    grants: DatabaseUserGrant[];
    secretName: string;
    isIAMUser?: boolean;
  }[]

  public constructor(scope: cdk.Construct, id: string, props: DatabaseUserInitializerProps) {
    super(scope, id);
    this.prefix = props.prefix
    this.databaseAdminUserSecretName = props.databaseAdminUserSecretName;
    this.databaseUsers = props.databaseUsers;

    const databaseUserInitializer = new lambdaNode.NodejsFunction(this, `${this.prefix}-database-user-initializer`, {
      functionName: `${this.prefix}-database-user-initializer`,
      entry: path.join(__dirname, "..", "lambdas", 'src', 'index.ts'),
      handler: "databaseUserInitializerHandler",
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

    let resources: string[] = [`arn:${cdk.Stack.of(this).partition}:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${this.databaseAdminUserSecretName}-*`];
    this.databaseUsers.forEach(user => resources.push(`arn:${cdk.Stack.of(this).partition}:secretsmanager:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:secret:${user.secretName}-*`));

    databaseUserInitializer.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
      ],
      resources: resources,
    }));

    new cdk.CustomResource(this, `${this.prefix}-database-user-initializer-resource`, {
      serviceToken: databaseUserInitializer.functionArn,
      properties: {
        Region: cdk.Stack.of(this).region,
        DatabaseAdminUserSecretName: this.databaseAdminUserSecretName,
        DatabaseUsers: this.databaseUsers.map(user => ({
          username: user.username,
          grants: user.grants,
          secretName: user.secretName,
          isIAMUser: user.isIAMUser
        }))
      },
    });
  }

  // protected validate(): string[] {
  //   const errors: string[] = [];
  //   // Ensure the zone name is a parent zone of the certificate domain name
  //   if (!cdk.Token.isUnresolved(this.databaseAdminUserSecret)) {
  //     errors.push(`databaseAdminUserSecret is not null`);
  //   }

  //   if (this.databaseUsers.length === 0) {
  //     errors.push(`databaseUsers is not empty`);
  //   }

  //   return errors;
  // }
}