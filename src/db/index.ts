/**
 * Kyrin Database Module
 */

// Unified Database
export { Database, database } from "./database";
export type { SyncOptions } from "./database";

// Clients
export { SQLiteClient } from "./clients/sqlite";
export { PostgreSQLClient } from "./clients/postgres";
export { MySQLClient } from "./clients/mysql";

// Query Builder
export { QueryBuilder } from "./query-builder";

// Types
export type {
  SQLiteConfig,
  PostgresDatabaseConfig,
  MySQLDatabaseConfig,
  DatabaseConfig,
  DatabaseClient,
  DatabaseType,
  RunResult,
  PreparedStatement,
  TransactionFn,
} from "./types";
