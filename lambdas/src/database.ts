import * as mysql from 'mysql';
import * as util from 'util';

type DatabaseProps = {
  secret: string,
  script: string
};

export class Database {
  public static async execute(props: DatabaseProps): Promise<void> {
    const connection = await this.getDatabaseConnection(props.secret);
    try {
      const query = util.promisify(connection.query).bind(connection);
      await query(props.script);
    } finally {
      connection.end();
    }
  }

  private static async getDatabaseConnection(secret: any): Promise<mysql.Connection> {
    return mysql.createConnection({
      host: secret.host,
      user: secret.username,
      password: secret.password,
      multipleStatements: true
    });
  }
}