import * as ec2 from '@aws-cdk/aws-ec2'
import * as secretsmanager from '@aws-cdk/aws-secretsmanager'


export interface DatabaseInitializerProps {
    /**
     * Prefix to be used to name custom resources
     */
    readonly prefix: string;
    /**
     * Secret to be used for database connection
     */
    readonly databaseAdminUserSecret: secretsmanager.ISecret;
    /**
     * Vpc where custom resource lambda will be deployed
     */
    readonly vpc?: ec2.IVpc;
    /**
     * Subnet where custom resource lambda will be deployed
     */
    readonly vpcSubnets?: ec2.SubnetSelection;
    /**
     * SecurityGroup that custom resource lambda will use
     */
    readonly securityGroups?: ec2.ISecurityGroup[];
    /**
     * Database engine type. Like MySQL or PostgreSQL
     */
    readonly databaseEngine: DatabaseEngine;
}

export enum DatabaseEngine {
    MySQL = 'MySQL',
    PostgreSQL = 'PostgreSQL'
}

export enum DatabaseUserGrant {
    /**
     * Grant all privileges at specified access level except GRANT OPTION and PROXY.
     */
    ALL_PRIVILEGES = 'ALL PRIVILEGES',
    /**
     * Enable use of ALTER TABLE.Levels: Global, database, table.
     */
    ALTER = 'ALTER',
    /**
     * Enable stored routines to be altered or dropped.Levels: Global, database, routine.
     */
    ALTER_ROUTINE = 'ALTER ROUTINE',
    /**
     * Enable database and table creation.Levels: Global, database, table.
     */
    CREATE = 'CREATE',
    /**
     * Enable role creation.Level: Global.
     */
    CREATE_ROLE = 'CREATE ROLE',
    /**
     * Enable stored routine creation.Levels: Global, database.
     */
    CREATE_ROUTINE = 'CREATE ROUTINE',
    /**
     * Enable tablespaces and log file groups to be created, altered, or dropped.Level: Global.
     */
    CREATE_TABLESPACE = 'CREATE TABLESPACE',
    /**
     * Enable use of CREATE TEMPORARY TABLE.Levels: Global, database.
     */
    CREATE_TEMPORARY_TABLES = 'CREATE TEMPORARY TABLES',
    /**
     * Enable use of CREATE USER, DROP USER, RENAME USER, and REVOKE ALL PRIVILEGES.Level: Global.
     */
    CREATE_USER = 'CREATE USER',
    /**
     * Enable views to be created or altered.Levels: Global, database, table.
     */
    CREATE_VIEW = 'CREATE VIEW',
    /**
     * Enable use of DELETE.Level: Global, database, table.
     */
    DELETE = 'DELETE',
    /**
     * Enable databases, tables, and views to be dropped.Levels: Global, database, table.
     */
    DROP = 'DROP',
    /**
     * Enable roles to be dropped.Level: Global.
     */
    DROP_ROLE = 'DROP ROLE',
    /**
     * Enable use of events for the Event Scheduler.Levels: Global, database.
     */
    EVENT = 'EVENT',
    /**
     * Enable the user to execute stored routines.Levels: Global, database, routine.
     */
    EXECUTE = 'EXECUTE',
    /**
     * Enable the user to cause the server to read or write files.Level: Global.
     */
    FILE = 'FILE',
    /**
     * Enable privileges to be granted to or removed from other accounts.Levels: Global, database, table, routine, proxy.
     */
    GRANT_OPTION = 'GRANT OPTION',
    /**
     * Enable indexes to be created or dropped.Levels: Global, database, table.
     */
    INDEX = 'INDEX',
    /**
     * Enable use of INSERT.Levels: Global, database, table, column.
     */
    INSERT = 'INSERT',
    /**
     * Enable use of LOCK TABLES on tables for which you have the SELECT privilege.Levels: Global, database.
     */
    LOCK_TABLES = 'LOCK TABLES',
    /**
     * Enable the user to see all processes with SHOW PROCESSLIST.Level: Global.
     */
    PROCESS = 'PROCESS',
    /**
     * Enable user proxying.Level: From user to user.
     */
    PROXY = 'PROXY',
    /**
     * Enable foreign key creation.Levels: Global, database, table, column.
     */
    REFERENCE = 'REFERENCE',
    /**
     * Enable use of FLUSH operations.Level: Global.
     */
    RELOAD = 'RELOAD',
    /**
     * Enable the user to ask where source or replica servers are.Level: Global.
     */
    REPLICATION_CLIENT = 'REPLICATION CLIENT',
    /**
     * Enable replicas to read binary log events from the source.Level: Global.
     */
    REPLICATION_SLAVE = 'REPLICATION_SLAVE',
    /**
     * Enable use of SELECT.Levels: Global, database, table, column.
     */
    SELECT = 'SELECT',
    /**
     * Enable SHOW DATABASES to show all databases.Level: Global.
     */
    SHOW_DATABASES = 'SHOW DATABASES',
    /**
     * Enable use of SHOW CREATE VIEW.Levels: Global, database, table.
     */
    SHOW_VIEW = 'SHOW VIEW',
    /**
     * Enable use of mysqladmin shutdown.Level: Global.
     */
    SHUTDOWN = 'SHUTDOWN',
    /**
     * Enable use of other administrative operations such as CHANGE REPLICATION SOURCE TO, CHANGE MASTER TO, KILL,
     * PURGE BINARY LOGS, SET GLOBAL, and mysqladmin debug command.Level: Global.
     */
    SUPER = 'SUPER',
    /**
     * Enable trigger operations.Levels: Global, database, table.
     */
    TRIGGER = 'TRIGGER',
    /**
     * Enable use of UPDATE.Levels: Global, database, table, column.
     */
    UPDATE = 'UPDATE',
    /**
     * Synonym for “no privileges”
     */
    USAGE = 'USAGE'
}
