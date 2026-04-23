/**
 * Kyrin Framework - Database Factory
 * Unified database with config object and connection string support
 */

import { SQLiteClient } from "./clients/sqlite";
import { PostgreSQLClient } from "./clients/postgres";
import { MySQLClient } from "./clients/mysql";
import { QueryBuilder } from "./query-builder";
import type { DatabaseConfig, DatabaseClient } from "./types";
import type { Model } from "../schema/model";

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
   * Sync database schema with registered models
   * @param options.force - Drop and recreate tables (default: false)
   * @param options.dryRun - Return SQL without executing (default: false)
   * @example
   * ```typescript
   * await db.sync();                    // Safe mode: add new columns only
   * await db.sync({ force: true });     // Force mode: drop + create
   * db.sync({ dryRun: true });        // Return SQL strings
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
  ): QueryBuilder<T> {
    return this.client.sql<T>(strings, ...values);
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
