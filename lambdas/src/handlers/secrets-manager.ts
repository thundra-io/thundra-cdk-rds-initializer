import * as secretsManager from "@aws-sdk/client-secrets-manager";
import {SecretsManagerClientConfig} from "@aws-sdk/client-secrets-manager/dist-types/SecretsManagerClient";

interface SecretsManagerProps {
    endpoint?: string
    region: string
    secretId: string
}

export interface UserCredential {
    username: string
    password: string
}

export interface DatabaseCredential extends UserCredential {
    host: string
    port: number
    dbname: string
}

export class SecretsManager {
    public static async getDatabaseCredential(props: SecretsManagerProps): Promise<DatabaseCredential> {
        return this.getCredential(props);
    }

    public static async getUserCredential(props: SecretsManagerProps): Promise<UserCredential> {
        return this.getCredential(props);
    }

    private static async getCredential(props: SecretsManagerProps) {
        const configuration: SecretsManagerClientConfig = {region: props.region};
        if (props.endpoint) {
            configuration.endpoint = props.endpoint;
        }
        const client = new secretsManager.SecretsManagerClient(configuration);
        const command = new secretsManager.GetSecretValueCommand({SecretId: props.secretId})
        const secret = await client.send(command);
        return JSON.parse(secret.SecretString!);
    }
}
