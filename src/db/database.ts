/**
 * Kyrin Framework - Database Factory
 * Unified database with config object and connection string support
 */

import { SQLiteClient } from "./clients/sqlite";
import { PostgreSQLClient } from "./clients/postgres";
import { MySQLClient } from "./clients/mysql";
import { TemplateQueryBuilder } from "./query-builder";
import { QueryBuilder } from "./knex-builder";
import { MigrationRunner } from "./migration/runner";
import { confirmMigration, printDryRun, printSuccess, printError, printSkipped } from "./migration/cli";
import type { DatabaseConfig, DatabaseClient } from "./types";
import type { Model } from "../schema/model";
import type { ColumnInfo } from "./migration/differ";
import { parseSchemas, type SchemaDef, type FieldDef, type SqlType } from "./schema-parser";

// ==================== Sync Options ====================

export interface SyncOptions {
  /** Drop and recreate tables (data loss!) */
  force?: boolean;
  /** Return SQL without executing */
  dryRun?: boolean;
}

// ==================== Connection String Parser ====================

function parseConnectionString(connectionString: string): DatabaseConfig {
  if (connectionString.startsWith("sqlite:")) {
    const path = connectionString.slice(7);
    return {
      type: "sqlite",
      filename: path === ":memory:" ? ":memory:" : path || ":memory:",
    };
  }

  if (
    connectionString.startsWith("postgres://") ||
    connectionString.startsWith("postgresql://")
  ) {
    const url = new URL(connectionString);
    return {
      type: "postgres",
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port) : 5432,
      database: url.pathname.slice(1) || undefined,
      username: url.username || undefined,
      password: url.password || undefined,
      ssl: url.searchParams.get("ssl") === "true",
    };
  }

  if (connectionString.startsWith("mysql://")) {
    const url = new URL(connectionString);
    return {
      type: "mysql",
      host: url.hostname || "localhost",
      port: url.port ? parseInt(url.port) : 3306,
      database: url.pathname.slice(1) || undefined,
      username: url.username || undefined,
      password: url.password || undefined,
      ssl: url.searchParams.get("ssl") === "true",
    };
  }

  throw new Error(
    `Unsupported connection string: ${connectionString}. Use sqlite:, postgres://, mysql://`
  );
}

// ==================== Database Class ====================

/**
 * Unified Database class
 * @example
 * ```typescript
 * const db = new Database({ type: "sqlite", filename: "./data.db" });
 * db.sql`SELECT * FROM users WHERE id = ${id}`.first();
 * ```
 */
export class Database implements DatabaseClient {
  private client: DatabaseClient;
  private models: Model<any>[] = [];

  constructor(config: DatabaseConfig) {
    switch (config.type) {
      case "sqlite":
        this.client = new SQLiteClient(config);
        break;
      case "postgres":
        this.client = new PostgreSQLClient(config);
        break;
      case "mysql":
        this.client = new MySQLClient(config);
        break;
      default:
        throw new Error(`Unsupported database type: ${(config as any).type}`);
    }
  }

  // ==================== Schema Management ====================

  /**
   * Register models for sync
   * @example `db.register(User, Post)`
   */
  register(...models: Model<any>[]): this {
    this.models.push(...models);
    return this;
  }

  /**
   * Define schema using modern object syntax.
   * 
   * @param schemas - Object with table names as keys and field definitions as values
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.schema({
   *   users: {
   *     id: { type: "integer", primary: true },
   *     name: { type: "string" },
   *     email: { type: "string", notNull: true },
   *     age: { type: "integer", nullable: true },
   *   },
   * });
   * ```
   */
  schema(schemas: Record<string, Record<string, FieldDef>>): this {
    const parsed = parseSchemas(schemas);
    for (const { table, columns } of parsed) {
      const exists = this._tableExists(table);
      if (!exists) {
        const sql = this._createTableSQL(table, columns);
        this.exec(sql);
      }
    }
    return this;
  }

  private _tableExists(tableName: string): boolean {
    try {
      this.client.queryOne(`SELECT 1 FROM ${tableName} LIMIT 1`);
      return true;
    } catch {
      return false;
    }
  }

  private _createTableSQL(tableName: string, columns: ColumnInfo[]): string {
    const colDefs = columns.map(c => {
      const parts = [c.name, c.type];
      if (c.primaryKey) parts.push("PRIMARY KEY");
      if (!c.nullable && !c.primaryKey) parts.push("NOT NULL");
      if (c.defaultValue !== null) parts.push(`DEFAULT ${c.defaultValue}`);
      return parts.join(" ");
    });
    return `CREATE TABLE ${tableName} (${colDefs.join(", ")})`;
  }

  /**
   * Sync database schema with registered models
   * @param options.force - Drop and recreate tables (default: false)
   * @param options.dryRun - Return SQL without executing (default: false)
   * @example
   * ```typescript
   * await db.sync();                    // Safe mode: add new columns only
   * await db.sync({ force: true });     // Force mode: drop + create
   * await db.sync({ dryRun: true });   // Return SQL strings (still async!)
   * ```
   */
  async sync(options: SyncOptions = {}): Promise<string[] | void> {
    const statements: string[] = [];

    for (const model of this.models) {
      if (options.force) {
        statements.push(`DROP TABLE IF EXISTS ${model.tableName}`);
        statements.push(model.toCreateSQL());
      } else {
        statements.push(model.toCreateSQL());
        const alterStatements = await model.toAlterSQL(this);
        statements.push(...alterStatements);
      }
    }

    if (options.dryRun) {
      return statements;
    }

    for (const sql of statements) {
      await this.exec(sql);
    }
  }

  // ==================== Query Methods ====================

  query<T = unknown>(sql: string, params?: any[]): T[] | Promise<T[]> {
    return this.client.query<T>(sql, params);
  }

  queryOne<T = unknown>(sql: string, params?: any[]): T | null | Promise<T | null> {
    return this.client.queryOne<T>(sql, params);
  }

  exec(sql: string): void | Promise<void> {
    return this.client.exec(sql);
  }

  run(sql: string, params?: any[]) {
    return this.client.run(sql, params);
  }

  prepare<T = unknown>(sql: string) {
    return this.client.prepare<T>(sql);
  }

  transaction<T>(fn: () => T): T | Promise<T> {
    return this.client.transaction(fn);
  }

  sql<T = unknown>(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): TemplateQueryBuilder<T> {
    return this.client.sql<T>(strings, ...values);
  }

  from<T = unknown>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.client).from(table);
  }

  // ==================== Migration Methods ====================

  /**
   * Migrate table schema - auto-detect changes and prompt for confirmation
   * @param tableName - Table name to migrate
   * @param codeColumns - Column definitions from code
   * @param options - Migration options
   * @example
   * ```typescript
   * await db.migrate('users', [
   *   { name: 'id', type: 'INTEGER', nullable: false, defaultValue: null, primaryKey: true },
   *   { name: 'email', type: 'TEXT', nullable: false, defaultValue: null, primaryKey: false },
   * ]);
   * ```
   */
  async migrate(
    tableName: string,
    codeColumns: ColumnInfo[],
    options: { dryRun?: boolean; force?: boolean } = {}
  ): Promise<{ success: boolean; plan?: any; executed?: string[] }> {
    const runner = new MigrationRunner(this.client);

    if (options.force) {
      await this.client.exec(`DROP TABLE IF EXISTS ${tableName}`);
      await this.client.exec(`
        CREATE TABLE ${tableName} (
          ${codeColumns.map(c => `${c.name} ${c.type}${c.primaryKey ? " PRIMARY KEY" : ""}${c.nullable ? "" : " NOT NULL"}`).join(", ")}
        )
      `);
      return { success: true };
    }

    const plan = await runner.plan(tableName, codeColumns);

    if (!plan) {
      printSkipped("No schema changes detected");
      return { success: true };
    }

    if (options.dryRun) {
      await printDryRun(plan);
      return { success: true, plan };
    }

    const diff = plan.diff;
    const hasDataLoss = diff.removed.length > 0 || diff.typeChanged.length > 0;

    if (hasDataLoss) {
      const confirmed = await confirmMigration(plan);
      if (!confirmed) {
        console.log("Migration cancelled.");
        return { success: false };
      }
    }

    const result = await runner.execute(plan);

    if (result.success) {
      printSuccess(result);
    } else {
      printError(result);
    }

    return { success: result.success, plan, executed: result.executed };
  }

  /**
   * Get migration status
   */
  async migrationStatus(): Promise<any[]> {
    const runner = new MigrationRunner(this.client);
    return runner.getStatus();
  }

  /**
   * Rollback migration by name
   */
  async migrateRollback(name: string): Promise<void> {
    const runner = new MigrationRunner(this.client);
    await runner.rollback(name);
  }

  close(): void | Promise<void> {
    return this.client.close();
  }
}

// ==================== Factory Function ====================

/**
 * Create database from connection string
 * @example
 * ```typescript
 * const db = database("sqlite:./data.db");
 * const db = database("sqlite::memory:");
 * ```
 */
export function database(connectionString: string): Database {
  return new Database(parseConnectionString(connectionString));
}
