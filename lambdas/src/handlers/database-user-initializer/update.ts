import * as _ from 'lodash';
import {CloudFormationCustomResourceUpdateEvent} from 'aws-lambda';
import {Database} from '../database';
import {SecretsManager} from '../secrets-manager';
import {CustomResourceHandler} from '../base';
import {ScriptBuilder} from '../script-builder';
import {User} from "../user";

export class DatabaseUserInitializerUpdateHandler extends CustomResourceHandler<CloudFormationCustomResourceUpdateEvent> {
    public async consumeEvent() {
        const props = this.event.ResourceProperties;
        const oldProps = this.event.OldResourceProperties;
        const databaseUsers = props.DatabaseUsers as User[];
        const oldDatabaseUsers = oldProps.DatabaseUsers as User[];

        const credential = await SecretsManager.getDatabaseCredential({
            region: props.Region,
            secretId: props.DatabaseAdminUserSecretName
        });

        let script = '';

        if (props.DatabaseAdminUserSecretName === oldProps.DatabaseAdminUserSecretName) {
            const removedUsers: any = _.differenceBy(oldDatabaseUsers, databaseUsers, 'username');
            for (const removedUser of removedUsers) {
                script = script.concat(await ScriptBuilder.dropUserScript(removedUser));
            }

            const addedUsers: any = _.differenceBy(databaseUsers, oldDatabaseUsers, 'username');
            for (const addedUser of addedUsers) {
                script = script.concat(await ScriptBuilder.createUserScript(addedUser, credential.dbname, props.Region));
            }

            for (const newUser of databaseUsers) {
                const index: number = oldDatabaseUsers.map(user => user.username).indexOf(newUser.username);
                if (index > -1) {
                    const oldUser = oldDatabaseUsers[index];
                    if (newUser.isIAMUser === oldUser.isIAMUser) {
                        script = script.concat(await ScriptBuilder.changeUserGrantScript(newUser, oldUser, credential.dbname));
                    } else {
                        script = script.concat(await ScriptBuilder.dropUserScript(newUser));
                        script = script.concat(await ScriptBuilder.createUserScript(newUser, credential.dbname, props.Region));
                    }
                }
            }
        } else {
            for (const databaseUser of props.DatabaseUsers) {
                script = script.concat(await ScriptBuilder.createUserScript(databaseUser, credential.dbname, props.Region));
            }
        }

        if (script) {
            script = script.concat('FLUSH PRIVILEGES;\n');
            await Database.execute({credential: credential, script: script});
        }
        return {
            physicalResourceId: this.event.PhysicalResourceId,
            data: {},
        };
    }
}
