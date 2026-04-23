/**
 * Kyrin Framework - SQLite Client
 * High-performance SQLite client using bun:sqlite
 */

import { Database } from "bun:sqlite";
import type {
  SQLiteConfig,
  RunResult,
  PreparedStatement,
  TransactionFn,
  NativeStatement,
} from "../types";
import { TemplateQueryBuilder } from "../query-builder";

export class SQLiteClient {
  private db: Database;
  private stmtCache = new Map<string, NativeStatement<unknown>>();

  /**
   * Create SQLite database connection
   * @example
   * ```typescript
   * const db = new SQLiteClient({ filename: "./data.db" });
   * ```
   */
  constructor(config: SQLiteConfig = {}) {
    const filename = config.filename ?? ":memory:";
    this.db = new Database(filename, {
      readonly: config.readonly ?? false,
      create: config.create ?? true,
    });

    if (config.wal !== false && !config.readonly) {
      this.db.exec("PRAGMA journal_mode = WAL");
    }
  }

  // ==================== Query Methods ====================

  /**
   * Execute SELECT and return all rows
   * @example `db.query<User>("SELECT * FROM users WHERE age > ?", [18])`
   */
  query<T = unknown>(sql: string, params?: any[] | Record<string, any>): T[] {
    const stmt = this.db.prepare(sql);
    return params
      ? (stmt.all(...(Array.isArray(params) ? params : [params])) as T[])
      : (stmt.all() as T[]);
  }

  /**
   * Execute SELECT and return first row
   * @example `db.queryOne<User>("SELECT * FROM users WHERE id = ?", [1])`
   */
  queryOne<T = unknown>(
    sql: string,
    params?: any[] | Record<string, any>
  ): T | null {
    const stmt = this.db.prepare(sql);
    const result = params
      ? stmt.get(...(Array.isArray(params) ? params : [params]))
      : stmt.get();
    return (result as T) ?? null;
  }

  /**
   * Execute DDL statements (CREATE, DROP, etc.)
   * @example `db.exec("CREATE TABLE users (id INTEGER PRIMARY KEY)")`
   */
  exec(sql: string): void {
    this.db.exec(sql);
  }

  /**
   * Execute INSERT/UPDATE/DELETE and return result
   * @example `db.run("INSERT INTO users (name) VALUES (?)", ["John"])`
   */
  run(sql: string, params?: any[] | Record<string, any>): RunResult {
    const stmt = this.db.prepare(sql);
    return params
      ? stmt.run(...(Array.isArray(params) ? params : [params]))
      : stmt.run();
  }

  // ==================== Prepared Statements ====================

  /**
   * Create reusable prepared statement
   * @example
   * ```typescript
   * const find = db.prepare<User>("SELECT * FROM users WHERE id = ?");
   * const user = find.get(1);
   * find.finalize();
   * ```
   */
  prepare<T = unknown>(sql: string): PreparedStatement<T> {
    const stmt = this.db.prepare(sql) as NativeStatement<T>;
    return {
      all: (...params: any[]) => stmt.all(...params) as T[],
      get: (...params: any[]) => (stmt.get(...params) as T) ?? null,
      run: (...params: any[]) => stmt.run(...params),
      finalize: () => stmt.finalize(),
    };
  }

  // ==================== Transactions ====================

  /**
   * Execute operations in transaction (auto rollback on error)
   * @example
   * ```typescript
   * db.transaction(() => {
   *   db.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);
   *   db.run("INSERT INTO users (name) VALUES (?)", ["Bob"]);
   * });
   * ```
   */
  transaction<T>(fn: TransactionFn<T>): T {
    this.db.exec("BEGIN TRANSACTION");
    try {
      const result = fn();
      this.db.exec("COMMIT");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  // ==================== Minimal SQL API ====================

  /**
   * Execute SQL with tagged template or single method
   * @example
   * ```typescript
   * db.sql`SELECT * FROM users WHERE age > ${18}`.all();
   * db.sql`SELECT * FROM users WHERE id = ${id}`.first();
   * db.sql`INSERT INTO users (name) VALUES (${name})`.run();
   * db.sql("SELECT * FROM users").all();
   * ```
   */
  sql<T = unknown>(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): TemplateQueryBuilder<T> {
    let sqlQuery: string;
    let params: any[];

    if (typeof strings === "string") {
      sqlQuery = strings;
      params = values[0] ?? [];
    } else {
      // Optimized: use join instead of reduce
      sqlQuery = strings.join("?");
      params = values;
    }

    return new TemplateQueryBuilder<T>(this, sqlQuery, params);
  }

  // ==================== Lifecycle ====================

  /** Close database connection */
  close(): void {
    // Clear statement cache
    this.stmtCache.forEach((stmt) => stmt.finalize());
    this.stmtCache.clear();
    this.db.close();
  }

  /** Get native Bun Database instance */
  get native(): Database {
    return this.db;
  }
}
