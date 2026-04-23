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

// Query Builder (Knex-style)
export { QueryBuilder } from "./knex-builder";
export { QueryBuilder as KnexBuilder } from "./knex-builder";

// Legacy Query Builder (template literal)
export { QueryBuilder as TemplateQueryBuilder } from "./query-builder";

// Migration
export { MigrationTracker } from "./migration/tracker";
export { SchemaDiffer } from "./migration/differ";
export { MigrationRunner } from "./migration/runner";
export type { ColumnInfo, TableSchema, SchemaDiff, MigrationPlan, MigrationResult } from "./migration";

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