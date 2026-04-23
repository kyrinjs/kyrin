/**
 * @fileoverview MySQL Client for Kyrin Framework
 * @description MySQL database client implementation using mysql2 package
 * @module kyrin/db/clients/mysql
 */

import mysql, { type Pool, type RowDataPacket, type ResultSetHeader } from "mysql2/promise";
import type { MySQLDatabaseConfig } from "../types/config";
import type { RunResult, PreparedStatement, TransactionFn } from "../types/result";
import { QueryBuilder } from "../query-builder";

/**
 * MySQL Database Client
 * @description MySQL client using mysql2 package with connection pooling
 * @example
 * ```typescript
 * const db = new MySQLClient({
 *   host: "localhost",
 *   port: 3306,
 *   database: "mydb",
 *   username: "root",
 *   password: "pass"
 * });
 * 
 * const users = await db.query<User>("SELECT * FROM users WHERE age > ?", [18]);
 * ```
 */
export class MySQLClient {
  private pool: Pool;

  /**
   * Create a new MySQL client
   * @param {MySQLDatabaseConfig} config - Configuration options
   * @example
   * ```typescript
   * const db = new MySQLClient({ type: "mysql" });
   * const db2 = new MySQLClient({
   *   host: "localhost",
   *   port: 3306,
   *   database: "mydb",
   *   username: "root",
   *   password: "pass",
   *   ssl: true
   * });
   * ```
   */
  constructor(config: MySQLDatabaseConfig = { type: "mysql" }) {
    this.pool = mysql.createPool({
      host: config.host ?? "localhost",
      port: config.port ?? 3306,
      database: config.database ?? "mysql",
      user: config.username ?? "root",
      password: config.password ?? "",
      ssl: config.ssl ? { rejectUnauthorized: true } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  /**
   * Execute SELECT query and return all matching rows
   * @param {string} sql - SQL query string
   * @param {any[]} [params] - Query parameters
   * @returns {Promise<T[]>} Array of matching rows
   * @example
   * ```typescript
   * const users = await db.query<User>("SELECT * FROM users WHERE age > ?", [18]);
   * const allUsers = await db.query<User>("SELECT * FROM users");
   * ```
   */
  query<T = unknown>(sql: string, params?: any[]): Promise<T[]> {
    return this.pool.query<RowDataPacket[]>(sql, params).then(([rows]) => rows as T[]);
  }

  /**
   * Execute SELECT query and return first matching row
   * @param {string} sql - SQL query string
   * @param {any[]} [params] - Query parameters
   * @returns {Promise<T | null>} First matching row or null
   * @example
   * ```typescript
   * const user = await db.queryOne<User>("SELECT * FROM users WHERE id = ?", [1]);
   * ```
   */
  queryOne<T = unknown>(sql: string, params?: any[]): Promise<T | null> {
    return this.pool.query<RowDataPacket[]>(sql, params).then(([rows]) => rows[0] as T ?? null);
  }

  /**
   * Execute DDL statements (CREATE, DROP, ALTER, etc.)
   * @param {string} sql - DDL SQL statement
   * @example
   * ```typescript
   * await db.exec("CREATE TABLE users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255))");
   * await db.exec("DROP TABLE IF EXISTS users");
   * ```
   */
  exec(sql: string): void {
    this.pool.execute(sql).then(() => {});
  }

  /**
   * Execute INSERT/UPDATE/DELETE and return result
   * @param {string} sql - DML SQL statement
   * @param {any[]} [params] - Query parameters
   * @returns {Promise<RunResult>} Result with changes and lastInsertRowid
   * @example
   * ```typescript
   * const result = await db.run("INSERT INTO users (name) VALUES (?)", ["John"]);
   * console.log(result.changes); // number of affected rows
   * console.log(result.lastInsertRowid); // auto-increment ID
   * ```
   */
  run(sql: string, params?: any[]): Promise<RunResult> {
    return this.pool.execute<ResultSetHeader>(sql, params).then(([result]) => ({
      changes: result.affectedRows,
      lastInsertRowid: result.insertId,
    }));
  }

  /**
   * Create a reusable prepared statement
   * @param {string} sql - SQL statement to prepare
   * @returns {PreparedStatement<T>} Prepared statement object
   * @example
   * ```typescript
   * const stmt = db.prepare<User>("SELECT * FROM users WHERE id = ?");
   * const users = await stmt.all(1);
   * const user = await stmt.get(1);
   * await stmt.run(1);
   * stmt.finalize();
   * ```
   */
  prepare<T = unknown>(sql: string): PreparedStatement<T> {
    return {
      all: (...params: any[]) => this.pool.query<RowDataPacket[]>(sql, params).then(([rows]) => rows as T[]),
      get: (...params: any[]) => this.pool.query<RowDataPacket[]>(sql, params).then(([rows]) => rows[0] as T ?? null),
      run: (...params: any[]) => this.pool.execute<ResultSetHeader>(sql, params).then(([result]) => ({
        changes: result.affectedRows,
        lastInsertRowid: result.insertId,
      })),
      finalize: () => {},
    };
  }

  /**
   * Execute operations in a transaction with automatic rollback on error
   * @param {() => T} fn - Function to execute within transaction
   * @returns {Promise<T>} Result of the function
   * @example
   * ```typescript
   * const result = await db.transaction(() => {
   *   await db.run("INSERT INTO users (name) VALUES (?)", ["Alice"]);
   *   await db.run("INSERT INTO posts (title) VALUES (?)", ["Hello"]);
   *   return { success: true };
   * });
   * ```
   */
  transaction<T>(fn: () => T): Promise<T> {
    return this.pool.getConnection().then(async (conn) => {
      await conn.beginTransaction();
      try {
        const result = fn();
        await conn.commit();
        conn.release();
        return result;
      } catch (e) {
        await conn.rollback();
        conn.release();
        throw e;
      }
    });
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
   * Close the database connection pool
   * @example
   * ```typescript
   * await db.close();
   * ```
   */
  close(): void {
    this.pool.end().then(() => {});
  }

  /**
   * Get the native mysql2 pool instance
   * @returns {Pool} Native mysql2 Pool instance
   */
  get native() {
    return this.pool;
  }
}