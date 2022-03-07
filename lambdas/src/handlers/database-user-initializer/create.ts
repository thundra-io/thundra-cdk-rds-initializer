import { CloudFormationCustomResourceCreateEvent } from 'aws-lambda';
import { v4 } from 'uuid';
import { Database } from '../../database';
import { SecretsManager } from '../../secrets-manager';
import { CustomResourceHandler } from '../base';

export class DatabaseUserInitializerCreateHandler extends CustomResourceHandler<CloudFormationCustomResourceCreateEvent> {
  public async consumeEvent() {
    const props = this.event.ResourceProperties;
    const physicalResourceId = v4();
    const adminSecret = await SecretsManager.getSecret({ region: props.Region, secretId: props.DatabaseAdminUserSecretName });
    console.log(`SECRET:\n${JSON.stringify(adminSecret)}`);
    let script = '';
    for (const databaseUser of props.DatabaseUsers) {
      const grants = databaseUser.grants.join();
      if (databaseUser.isIAMUser) {
        script = script.concat(`CREATE USER IF NOT EXISTS '${databaseUser.username}'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';\n`);
        script = script.concat(`GRANT ${grants} ON ${adminSecret.dbname}.* TO '${databaseUser.username}'@'%' WITH GRANT OPTION;\n`);
      } else {
        const secret = await SecretsManager.getSecret({ secretId: databaseUser.secretName, region: props.Region });
        script = script.concat(`CREATE USER IF NOT EXISTS '${secret.username}'@'%' IDENTIFIED BY '${secret.password}';\n`);
        script = script.concat(`GRANT ${grants} ON ${adminSecret.dbname}.* TO '${secret.username}'@'%' WITH GRANT OPTION;\n`);
      }
    }
    if (script) {
      script = script.concat('FLUSH PRIVILEGES;');
      console.log(`SCRIPT:\n${script}`);
      const data = await Database.execute({ secret: adminSecret, script: script });
      console.log(`RESPONSE:\n${JSON.stringify(data)}`);
      return {
        physicalResourceId: physicalResourceId,
        data: data,
      };
    }
    return {
      physicalResourceId: physicalResourceId,
      data: {},
    };
  }
}
