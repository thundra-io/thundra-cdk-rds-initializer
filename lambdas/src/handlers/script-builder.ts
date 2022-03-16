import * as _ from "lodash";
import {SecretsManager} from "./secrets-manager";
import {User} from "./user";

export class ScriptBuilder {
    public static async createUserScript(user: User, databaseName: string, region: string): Promise<string> {
        let script = '';
        const grants = user.grants.join();
        if (user.isIAMUser === 'true') {
            script = script.concat(`CREATE USER IF NOT EXISTS '${user.username}'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';\n`);
            script = script.concat(`GRANT ${grants} ON ${databaseName}.* TO '${user.username}'@'%' WITH GRANT OPTION;\n`);
        } else {
            const userCredential = await SecretsManager.getUserCredential({secretId: user.secretName!, region: region});
            script = script.concat(`CREATE USER IF NOT EXISTS '${user.username}'@'%' IDENTIFIED BY '${userCredential.password}';\n`);
            script = script.concat(`GRANT ${grants} ON ${databaseName}.* TO '${user.username}'@'%' WITH GRANT OPTION;\n`);
        }
        return script;
    }

    public static async dropUserScript(user: User): Promise<string> {
        return `DROP USER IF EXISTS '${user.username}'@'%';\n`;
    }

    public static async changeUserGrantScript(newUser: User, oldUser: User, databaseName: string): Promise<string> {
        let script = '';
        const deletedGrants = _.differenceBy(oldUser.grants, newUser.grants);
        if (deletedGrants && deletedGrants.length) {
            const grants = deletedGrants.join();
            script = script.concat(`REVOKE ${grants} ON ${databaseName}.* FROM '${newUser.username}'@'%';\n`);
        }
        const addedGrants = _.differenceBy(newUser.grants, oldUser.grants);
        if (addedGrants && addedGrants.length) {
            const grants = newUser.grants.join();
            script = script.concat(`GRANT ${grants} ON ${databaseName}.* TO '${newUser.username}'@'%' WITH GRANT OPTION;\n`);
        }
        return script;
    }
}
