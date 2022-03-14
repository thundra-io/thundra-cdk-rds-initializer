import * as _ from 'lodash';
import {CloudFormationCustomResourceUpdateEvent} from 'aws-lambda';
import {Database} from '../database';
import {SecretsManager} from '../secrets-manager';
import {CustomResourceHandler} from '../base';
import {ScriptBuilder} from '../script-builder';

export class DatabaseUserInitializerUpdateHandler extends CustomResourceHandler<CloudFormationCustomResourceUpdateEvent> {
    public async consumeEvent() {
        const props = this.event.ResourceProperties;
        const oldProps = this.event.OldResourceProperties;

        const credential = await SecretsManager.getDatabaseCredential({
            region: props.Region,
            secretId: props.DatabaseAdminUserSecretName
        });

        let script = '';

        if (props.DatabaseAdminUserSecretName === oldProps.DatabaseAdminUserSecretName) {
            const removedUsers: any = _.differenceBy(oldProps.DatabaseUsers, props.DatabaseUsers, 'username');
            for (const removedUser of removedUsers) {
                script = script.concat(await ScriptBuilder.dropUserScript(removedUser));
            }

            const addedUsers: any = _.differenceBy(props.DatabaseUsers, oldProps.DatabaseUsers, 'username');
            for (const addedUser of addedUsers) {
                script = script.concat(await ScriptBuilder.createUserScript(addedUser, credential.dbname, props.Region));
            }

            for (const newUser of props.DatabaseUsers) {
                for (const oldUser of oldProps.DatabaseUsers) {
                    if (newUser.username === oldUser.username) {
                        if (newUser.isIAMUser === oldUser.isIAMUser) {
                            script = script.concat(await ScriptBuilder.changeUserGrantScript(newUser, oldUser, credential.dbname));
                        } else {
                            script = script.concat(await ScriptBuilder.dropUserScript(newUser));
                            script = script.concat(await ScriptBuilder.createUserScript(newUser, credential.dbname, props.Region));
                        }
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
