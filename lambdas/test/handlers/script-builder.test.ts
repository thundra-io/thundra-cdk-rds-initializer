import {ScriptBuilder} from '../../src/handlers/script-builder';
import {SecretsManager} from '../../src/handlers/secrets-manager';

describe("Script builder test", () => {
    it('create drop user script', async () => {
        const result = await ScriptBuilder.dropUserScript({
            username: 'test', grants: ['SELECT'],
            secretName: 'test-secret-name',
            isIAMUser: 'false'
        });
        expect(result).toEqual(`DROP USER IF EXISTS 'test'@'%';\n`);
    });
    it('create create user script for IAMUser', async () => {
        let script = '';
        script = script.concat(`CREATE USER IF NOT EXISTS 'username'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';\n`);
        script = script.concat(`GRANT SELECT,INSERT,UPDATE ON dbname.* TO 'username'@'%' WITH GRANT OPTION;\n`);

        const result = await ScriptBuilder.createUserScript({
            username: 'username',
            grants: ['SELECT', 'INSERT', 'UPDATE'],
            isIAMUser: 'true'
        }, 'dbname', 'us-west-2');
        expect(result).toEqual(script);
    });
    it('create create user script for user', async () => {
        let script = '';
        script = script.concat(`CREATE USER IF NOT EXISTS 'username'@'%' IDENTIFIED BY 'password';\n`);
        script = script.concat(`GRANT SELECT,INSERT,UPDATE ON dbname.* TO 'username'@'%' WITH GRANT OPTION;\n`);

        jest.mock('../../src/handlers/secrets-manager')
        const mockGetUserCredential = jest.fn().mockReturnValue({
            username: 'username',
            password: 'password'
        })
        SecretsManager.getUserCredential = mockGetUserCredential;
        const result = await ScriptBuilder.createUserScript({
            username: 'username',
            grants: ['SELECT', 'INSERT', 'UPDATE'],
            secretName: 'user-secret-name',
            isIAMUser: 'false'
        }, 'dbname', 'us-west-2');
        expect(result).toEqual(script);
    });
    it('create empty change user grant script', async () => {
        const script = '';
        const result = await ScriptBuilder.changeUserGrantScript({
            username: 'username',
            grants: ['SELECT', 'INSERT', 'UPDATE'],
            secretName: 'user-secret-name',
            isIAMUser: 'false'
        }, {
            username: 'username',
            grants: ['SELECT', 'INSERT', 'UPDATE'],
            secretName: 'user-secret-name',
            isIAMUser: 'false'
        }, 'dbname');
        expect(result).toEqual(script);
    });
    it('create change user grant script', async () => {
        let script = '';
        script = script.concat(`REVOKE INSERT,UPDATE ON dbname.* FROM 'username'@'%';\n`);
        script = script.concat(`GRANT SELECT,CREATE USER,CREATE VIEW ON dbname.* TO 'username'@'%' WITH GRANT OPTION;\n`);
        const result = await ScriptBuilder.changeUserGrantScript({
            username: 'username',
            grants: ['SELECT', 'CREATE USER', 'CREATE VIEW'],
            secretName: 'user-secret-name',
            isIAMUser: 'false'
        }, {
            username: 'username',
            grants: ['SELECT', 'INSERT', 'UPDATE'],
            secretName: 'user-secret-name',
            isIAMUser: 'false'
        }, 'dbname');
        expect(result).toEqual(script);
    });
})
