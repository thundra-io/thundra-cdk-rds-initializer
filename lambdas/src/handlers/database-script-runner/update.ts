import {CloudFormationCustomResourceUpdateEvent} from "aws-lambda";
import {Database} from "../database";
import {SecretsManager} from '../secrets-manager';
import {CustomResourceHandler} from "../base";

export class DatabaseScriptRunnerUpdateHandler extends CustomResourceHandler<CloudFormationCustomResourceUpdateEvent> {
    public async consumeEvent() {
        const props = this.event.ResourceProperties;
        const oldProps = this.event.OldResourceProperties;
        if (props.DatabaseAdminUserSecretName !== oldProps.DatabaseAdminUserSecretName || props.Script !== oldProps.Script) {
            const credential = await SecretsManager.getDatabaseCredential({
                region: props.Region,
                secretId: props.DatabaseAdminUserSecretName
            });
            await Database.execute({credential: credential, script: props.Script});
        }
        return {
            physicalResourceId: this.event.PhysicalResourceId,
            data: {},
        };
    }
}
