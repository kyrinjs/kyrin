/**
 * Kyrin Database - Client Interface
 */

import type { RunResult, PreparedStatement, TransactionFn } from "./result";
import type { QueryBuilder } from "../query-builder";

/** Database client interface - all clients must implement this */
export interface DatabaseClient {
  /** Execute SELECT and return all rows */
  query<T = unknown>(sql: string, params?: any[]): T[] | Promise<T[]>;
  /** Execute SELECT and return first row */
  queryOne<T = unknown>(sql: string, params?: any[]): T | null | Promise<T | null>;
  /** Execute DDL statements */
  exec(sql: string): void | Promise<void>;
  /** Execute INSERT/UPDATE/DELETE */
  run(sql: string, params?: any[]): RunResult | Promise<RunResult>;
  /** Create reusable prepared statement */
  prepare<T = unknown>(sql: string): PreparedStatement<T>;
  /** Execute operations in transaction */
  transaction<T>(fn: () => T): T | Promise<T>;
  /** Close connection */
  close(): void | Promise<void>;
  /** Tagged template SQL */
  sql<T = unknown>(strings: TemplateStringsArray | string, ...values: any[]): QueryBuilder<T>;
}
