import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as lambda from "@aws-cdk/aws-lambda";
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'
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
    secret: secretsmanager.ISecret;
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
  private readonly databaseAdminUserSecret: secretsmanager.ISecret;
  private readonly databaseUsers: {
    username: string;
    grants: DatabaseUserGrant[];
    secret: secretsmanager.ISecret;
    isIAMUser?: boolean;
  }[]

  public constructor(scope: cdk.Construct, id: string, props: DatabaseUserInitializerProps) {
    super(scope, id);
    this.prefix = props.prefix
    this.databaseAdminUserSecret = props.databaseAdminUserSecret;
    this.databaseUsers = props.databaseUsers;

    const databaseUserInitializer = new lambda.Function(this, `${this.prefix}-database-user-initializer`, {
      functionName: `${this.prefix}-database-user-initializer`,
      code: lambda.Code.fromAsset(path.join(__dirname, "lambda")),
      handler: "index.databaseUserInitializerHandler",
      runtime: lambda.Runtime.NODEJS_14_X,
      memorySize: 512,
      timeout: cdk.Duration.minutes(1),
      vpc: props.vpc,
      vpcSubnets: props.vpcSubnets,
      securityGroups: props.securityGroups
    });

    const resources: string[] = [this.databaseAdminUserSecret.secretArn];
    this.databaseUsers.forEach(user => resources.push(user.secret.secretArn));

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
        DatabaseAdminUserSecretName: this.databaseAdminUserSecret.secretName,
        DatabaseUsers: this.databaseUsers.map(user => ({
          username: user.username,
          grants: user.grants,
          secretName: user.secret.secretName,
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