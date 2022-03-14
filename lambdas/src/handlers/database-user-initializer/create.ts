import {CloudFormationCustomResourceCreateEvent} from 'aws-lambda';
import {v4} from 'uuid';
import {Database} from '../database';
import {SecretsManager} from '../secrets-manager';
import {CustomResourceHandler} from '../base';
import {ScriptBuilder} from '../script-builder';

export class DatabaseUserInitializerCreateHandler extends CustomResourceHandler<CloudFormationCustomResourceCreateEvent> {
    public async consumeEvent() {
        const props = this.event.ResourceProperties;
        const physicalResourceId = v4();
        const credential = await SecretsManager.getDatabaseCredential({
            region: props.Region,
            secretId: props.DatabaseAdminUserSecretName
        });
        let script = '';
        for (const databaseUser of props.DatabaseUsers) {
            script = script.concat(await ScriptBuilder.createUserScript(databaseUser, credential.dbname, props.Region));
        }
        if (script) {
            script = script.concat('FLUSH PRIVILEGES;\n');
            await Database.execute({credential: credential, script: script});
        }
        return {
            physicalResourceId: physicalResourceId,
            data: {},
        };
    }
}
