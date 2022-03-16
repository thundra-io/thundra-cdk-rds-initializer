import {CloudFormationCustomResourceCreateEvent} from 'aws-lambda';
import {v4} from 'uuid';
import {Database} from '../database';
import {SecretsManager} from '../secrets-manager';
import {CustomResourceHandler} from '../base';

export class DatabaseScriptRunnerCreateHandler extends CustomResourceHandler<CloudFormationCustomResourceCreateEvent> {
    public async consumeEvent() {
        const props = this.event.ResourceProperties;
        const physicalResourceId = v4();
        const credential = await SecretsManager.getDatabaseCredential({
            region: props.Region,
            secretId: props.DatabaseAdminUserSecretName
        });
        await Database.execute({credential: credential, script: props.Script});
        return {
            physicalResourceId: physicalResourceId,
            data: {},
        };
    }
}
