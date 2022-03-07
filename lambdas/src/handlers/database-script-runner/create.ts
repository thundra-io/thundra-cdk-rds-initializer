import { CloudFormationCustomResourceCreateEvent } from 'aws-lambda';
import { v4 } from 'uuid';
import { Database } from '../../database';
import { SecretsManager } from '../../secrets-manager';
import { CustomResourceHandler } from '../base';

export class DatabaseScriptRunnerCreateHandler extends CustomResourceHandler<CloudFormationCustomResourceCreateEvent> {
  public async consumeEvent() {
    const props = this.event.ResourceProperties;
    const physicalResourceId = v4();
    const secret = await SecretsManager.getSecret({ region: props.Region, secretId: props.DatabaseAdminUserSecretName });
    const data = await Database.execute({ secret: secret, script: props.Script });
    return {
      physicalResourceId: physicalResourceId,
      data: data,
    };
  }
}
