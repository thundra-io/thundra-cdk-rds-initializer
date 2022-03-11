import * as mysql from 'mysql2/promise';

type DatabaseProps = {
  secret: any,
  script: string
};

export class Database {
  public static async execute(props: DatabaseProps): Promise<void> {
    let connection = null;
    try {
      connection = await mysql.createConnection({
        host: props.secret.host,
        user: props.secret.username,
        password: props.secret.password,
        multipleStatements: true
      });
      await connection.beginTransaction();
      const [response, meta] = await connection.query(props.script);
      await connection.commit();
    } catch (error) {
      if (connection) await connection.rollback();
      throw error;
    } finally {
      if (connection) await connection.end();
    }
  }
}