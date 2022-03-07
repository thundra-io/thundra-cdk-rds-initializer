import * as secretsManager from "@aws-sdk/client-secrets-manager";

type SecretsManagerProps = {
  region: string,
  secretId: string
};

export class SecretsManager {
  public static async getSecret(props: SecretsManagerProps): Promise<any> {
    const client = new secretsManager.SecretsManagerClient({ region: props.region });
    const command = new secretsManager.GetSecretValueCommand({ SecretId: props.secretId })
    const secret = await client.send(command);
    return JSON.parse(secret.SecretString!);
  }
}