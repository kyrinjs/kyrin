/**
 * @fileoverview PostgreSQL Client for Kyrin Framework
 * @description PostgreSQL database client implementation using postgres package
 * @module kyrin/db/clients/postgres
 */

import postgres from "postgres";
import type { PostgresDatabaseConfig } from "../types/config";
import type { RunResult, PreparedStatement, TransactionFn } from "../types/result";
import { QueryBuilder } from "../query-builder";

/**
 * PostgreSQL Database Client
 * @description High-performance PostgreSQL client using postgres npm package
 * @example
 * ```typescript
 * const db = new PostgreSQLClient({
 *   host: "localhost",
 *   port: 5432,
 *   database: "mydb",
 *   username: "user",
 *   password: "pass"
 * });
 * 
 * const users = await db.query("SELECT * FROM users WHERE age > $1", [18]);
 * ```
 */
export class PostgreSQLClient {
  private client: any;

  /**
   * Create a new PostgreSQL client
   * @param {PostgresDatabaseConfig} config - Configuration options
   * @example
   * ```typescript
   * const db = new PostgreSQLClient({ type: "postgres" });
   * const db2 = new PostgreSQLClient({
   *   host: "localhost",
   *   port: 5432,
   *   database: "mydb",
   *   username: "user",
   *   password: "pass",
   *   ssl: true
   * });
   * ```
   */
  constructor(config: PostgresDatabaseConfig = { type: "postgres" }) {
    this.client = postgres({
      host: config.host ?? "localhost",
      port: config.port ?? 5432,
      database: config.database ?? "postgres",
      username: config.username ?? "postgres",
      password: config.password ?? "",
      ssl: config.ssl ? "prefer" : false,
    });
  }

  /**
   * Execute SELECT query and return all matching rows
   * @param {string} sql - SQL query string
   * @param {any[]} [params] - Query parameters
   * @returns {Promise<T[]>} Array of matching rows
   * @example
   * ```typescript
   * const users = await db.query<User>("SELECT * FROM users WHERE age > $1", [18]);
   * const allUsers = await db.query<User>("SELECT * FROM users");
   * ```
   */
  query<T = unknown>(sql: string, params?: any[]): Promise<T[]> {
    return this.client.unsafe(sql, params);
  }

  /**
   * Execute SELECT query and return first matching row
   * @param {string} sql - SQL query string
   * @param {any[]} [params] - Query parameters
   * @returns {Promise<T | null>} First matching row or null
   * @example
   * ```typescript
   * const user = await db.queryOne<User>("SELECT * FROM users WHERE id = $1", [1]);
   * ```
   */
  queryOne<T = unknown>(sql: string, params?: any[]): Promise<T | null> {
    return this.client.unsafe(sql, params).then((r: any) => r[0] ?? null);
  }

  /**
   * Execute DDL statements (CREATE, DROP, ALTER, etc.)
   * @param {string} sql - DDL SQL statement
   * @example
   * ```typescript
   * await db.exec("CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT)");
   * await db.exec("DROP TABLE IF EXISTS users");
   * ```
   */
  exec(sql: string): void {
    this.client.unsafe(sql).then(() => {});
  }

  /**
   * Execute INSERT/UPDATE/DELETE and return result
   * @param {string} sql - DML SQL statement
   * @param {any[]} [params] - Query parameters
   * @returns {Promise<RunResult>} Result with changes and lastInsertRowid
   * @example
   * ```typescript
   * const result = await db.run("INSERT INTO users (name) VALUES ($1)", ["John"]);
   * console.log(result.changes); // number of affected rows
   * ```
   */
  run(sql: string, params?: any[]): Promise<RunResult> {
    return this.client.unsafe(sql, params).then((r: any) => ({ changes: r.count ?? 0, lastInsertRowid: 0 }));
  }

  /**
   * Create a reusable prepared statement
   * @param {string} sql - SQL statement to prepare
   * @returns {PreparedStatement<T>} Prepared statement object
   * @example
   * ```typescript
   * const stmt = db.prepare<User>("SELECT * FROM users WHERE id = $1");
   * const users = await stmt.all(1);
   * const user = await stmt.get(1);
   * await stmt.run(1);
   * stmt.finalize();
   * ```
   */
  prepare<T = unknown>(sql: string): PreparedStatement<T> {
    const stmt = this.client.prepare(sql);
    return {
      all: (...params: any[]) => stmt.bind(...params),
      get: (...params: any[]) => stmt.bind(...params).then((r: any) => r[0] ?? null),
      run: (...params: any[]) => stmt.bind(...params).then((r: any) => ({ changes: r.count ?? 0, lastInsertRowid: 0 })),
      finalize: () => stmt.free(),
    };
  }

  /**
   * Execute operations in a transaction with automatic rollback on error
   * @param {TransactionFn<T>} fn - Function to execute within transaction
   * @returns {Promise<T>} Result of the function
   * @example
   * ```typescript
   * const result = await db.transaction(() => {
   *   await db.run("INSERT INTO users (name) VALUES ($1)", ["Alice"]);
   *   await db.run("INSERT INTO posts (title) VALUES ($1)", ["Hello"]);
   *   return { success: true };
   * });
   * ```
   */
  transaction<T>(fn: TransactionFn<T>): Promise<T> {
    const tr = this.client.transaction(fn);
    return tr();
  }

  /**
   * Execute SQL with tagged template literal syntax
   * @param {TemplateStringsArray | string} strings - Template strings or SQL string
   * @param {...any[]} values - Values to interpolate
   * @returns {QueryBuilder<T>} Query builder instance
   * @example
   * ```typescript
   * const users = await db.sql`SELECT * FROM users WHERE age > ${18}`.all();
   * const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first();
   * await db.sql`INSERT INTO users (name) VALUES (${name})`.run();
   * ```
   */
  sql<T = unknown>(
    strings: TemplateStringsArray | string,
    ...values: any[]
  ): QueryBuilder<T> {
    let sqlQuery: string;
    let params: any[];

    if (typeof strings === "string") {
      sqlQuery = strings;
      params = values[0] ?? [];
    } else {
      sqlQuery = strings.join("?");
      params = values;
    }

    return new QueryBuilder(this as any, sqlQuery, params);
  }

  /**
   * Close the database connection
   * @example
   * ```typescript
   * await db.close();
   * ```
   */
  close(): void {
    this.client.end();
  }

  /**
   * Get the native postgres client instance
   * @returns {any} Native postgres Sql instance
   */
  get native() {
    return this.client;
  }
}