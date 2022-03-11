import { CloudFormationCustomResourceUpdateEvent } from 'aws-lambda';
import { Database } from '../../database';
import { SecretsManager } from '../../secrets-manager';
import { CustomResourceHandler } from '../base';
import * as _ from 'lodash';

export class DatabaseUserInitializerUpdateHandler extends CustomResourceHandler<CloudFormationCustomResourceUpdateEvent> {
  public async consumeEvent() {
    const props = this.event.ResourceProperties;
    const oldProps = this.event.OldResourceProperties;
    const adminSecret = await SecretsManager.getSecret({ region: props.Region, secretId: props.DatabaseAdminUserSecretName });
    let script = '';

    const removedUsers: any = _.differenceBy(oldProps.DatabaseUsers, props.DatabaseUsers, 'username');
    for (const removedUser of removedUsers) {
      script = script.concat(`DROP USER IF EXISTS '${removedUser.username}'@'%';\n`);
    }

    const addedUsers: any = _.differenceBy(props.DatabaseUsers, oldProps.DatabaseUsers, 'username');
    for (const addedUser of addedUsers) {
      const grants = addedUser.grants.join();
      if (addedUser.isIAMUser) {
        script = script.concat(`CREATE USER IF NOT EXISTS '${addedUser.username}'@'%' IDENTIFIED WITH AWSAuthenticationPlugin AS 'RDS';\n`);
        script = script.concat(`GRANT ${grants} ON ${adminSecret.dbname}.* TO '${addedUser.username}'@'%' WITH GRANT OPTION;\n`);
      } else {
        const secret = await SecretsManager.getSecret({ secretId: addedUser.secretName, region: props.Region });
        script = script.concat(`CREATE USER IF NOT EXISTS '${addedUser.username}'@'%' IDENTIFIED BY '${secret.password}';\n`);
        script = script.concat(`GRANT ${grants} ON ${adminSecret.dbname}.* TO '${addedUser.username}'@'%' WITH GRANT OPTION;\n`);
      }
    }

    for (const newUser of props.DatabaseUsers) {
      for (const oldUser of oldProps.DatabaseUsers) {
        if (newUser.username === oldUser.username) {
          const deletedGrants: any = _.differenceBy(oldUser.grants, newUser.grants);
          if (deletedGrants && deletedGrants.length) {
            const grants = deletedGrants.join();
            script = script.concat(`REVOKE ${grants} ON ${adminSecret.dbname}.* FROM '${newUser.username}'@'%';\n`);
          }
          const addedGrants: any = _.differenceBy(newUser.grants, oldUser.grants);
          if (addedGrants && addedGrants.length) {
            const grants = newUser.grants.join();
            script = script.concat(`GRANT ${grants} ON ${adminSecret.dbname}.* TO '${newUser.username}'@'%' WITH GRANT OPTION;\n`);
          }
        }
      }
    }

    if (script) {
      script = script.concat('FLUSH PRIVILEGES;\n');
      await Database.execute({ secret: adminSecret, script: script });
    }
    return {
      physicalResourceId: this.event.PhysicalResourceId,
      data: {},
    };
  }
}
