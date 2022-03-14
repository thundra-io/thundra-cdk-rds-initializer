import {GenericContainer, StartedTestContainer} from "testcontainers";
import {LogWaitStrategy} from "testcontainers/dist/wait-strategy";
import * as secretsManager from "@aws-sdk/client-secrets-manager";
import {SecretsManager, DatabaseCredential, UserCredential} from "../../src/handlers/secrets-manager";

describe("Secrets manager test", () => {
    let container: StartedTestContainer;

    beforeAll(async () => {
        container = await new GenericContainer('localstack/localstack')
            .withExposedPorts(4566)
            .withEnv('SERVICES', 'secretsmanager')
            .withEnv('DEFAULT_REGION', 'us-west-2')
            .withWaitStrategy(new LogWaitStrategy('Ready.'))
            .start();

        const client = new secretsManager.SecretsManagerClient({
            endpoint: 'http://' + container.getHost() + ':' + container.getMappedPort(4566),
            region: 'us-west-2'
        });
        const databaseSecretCommand = new secretsManager.CreateSecretCommand({
            Name: 'secret/database',
            SecretString: '{\n' +
                '  "dbClusterIdentifier": "sample-database",\n' +
                '  "password": "sample-password",\n' +
                '  "dbname": "sampledb",\n' +
                '  "engine": "mysql",\n' +
                '  "port": 3306,\n' +
                '  "host": "sample-database.us-west-2.rds.amazonaws.com",\n' +
                '  "username": "sample_db_admin"\n' +
                '}'
        });
        await client.send(databaseSecretCommand);
        const userSecretCommand = new secretsManager.CreateSecretCommand({
            Name: 'secret/user',
            SecretString: '{\n' +
                '  "password": "sample-password",\n' +
                '  "username": "sample-username"\n' +
                '}'
        });
        await client.send(userSecretCommand);
    });

    afterAll(async () => {
        await container.stop();
    });

    it("getting database credential", async () => {
        const response: DatabaseCredential = await SecretsManager.getDatabaseCredential({
            endpoint: 'http://' + container.getHost() + ':' + container.getMappedPort(4566),
            region: 'us-west-2',
            secretId: 'secret/database'
        });
        expect(response.host).toEqual('sample-database.us-west-2.rds.amazonaws.com');
        expect(response.dbname).toEqual('sampledb');
        expect(response.password).toEqual('sample-password');
        expect(response.username).toEqual('sample_db_admin');
        expect(response.port).toEqual(3306);
    });

    it("getting user credential", async () => {
        const response: UserCredential = await SecretsManager.getUserCredential({
            endpoint: 'http://' + container.getHost() + ':' + container.getMappedPort(4566),
            region: 'us-west-2',
            secretId: 'secret/user'
        });
        expect(response.password).toEqual('sample-password');
        expect(response.username).toEqual('sample-username');
    });
});
