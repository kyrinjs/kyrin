/**
 * Kyrin Database - Result Types
 */

import type { Statement as BunStatement } from "bun:sqlite";

// ==================== Query Results ====================

/** Result from INSERT/UPDATE/DELETE operations */
export interface RunResult {
  /** Number of rows affected */
  changes: number;
  /** Row ID of last inserted row */
  lastInsertRowid: number | bigint;
}

// ==================== Prepared Statement ====================

/** Prepared statement wrapper with type safety */
export interface PreparedStatement<T = unknown> {
  /** Get all matching rows */
  all(...params: any[]): T[] | Promise<T[]>;
  /** Get first matching row */
  get(...params: any[]): T | null | Promise<T | null>;
  /** Execute INSERT/UPDATE/DELETE */
  run(...params: any[]): RunResult | Promise<RunResult>;
  /** Release resources */
  finalize(): void;
}

// ==================== Transaction ====================

/** Transaction callback function */
export type TransactionFn<T> = () => T;

// ==================== Internal ====================

export type NativeStatement<T> = BunStatement<T>;
