import {Database} from '../../src/handlers/database';
import {GenericContainer, StartedTestContainer} from "testcontainers";

describe("Database test", () => {
    let container: StartedTestContainer;

    beforeAll(async () => {
        container = await new GenericContainer('mysql:5.6')
            .withExposedPorts(3306)
            .withEnv('MYSQL_ROOT_PASSWORD', 'root_password')
            .withEnv('MYSQL_DATABASE', 'testdb')
            .start();
    });

    afterAll(async () => {
        await container.stop();
    });

    it("check connection is works", async () => {
        await Database.execute({
            credential: {
                host: container.getHost(),
                port: container.getMappedPort(3306),
                username: 'root',
                password: 'root_password',
                dbname: 'testdb'
            },
            script: 'select 1 from dual'
        });
    });
});

