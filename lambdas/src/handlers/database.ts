import * as mysql from 'mysql2/promise';
import {DatabaseCredential} from './secrets-manager';

interface DatabaseProps {
    credential: DatabaseCredential
    script: string;
}

export class Database {
    public static async execute(props: DatabaseProps): Promise<void> {
        let connection = null;
        try {
            connection = await mysql.createConnection({
                host: props.credential.host,
                port: props.credential.port,
                user: props.credential.username,
                password: props.credential.password,
                multipleStatements: true
            });
            await connection.beginTransaction();
            await connection.query(props.script);
            await connection.commit();
        } catch (error) {
            if (connection) await connection.rollback();
            throw error;
        } finally {
            if (connection) await connection.end();
        }
    }
}
