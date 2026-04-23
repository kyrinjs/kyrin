/**
 * Kyrin Schema - Public API
 * Simple schema definition for auto database table creation
 */

import { z } from "zod";
import { StringType, NumberType, BooleanType, DateType } from "./types";
import { Model, type SchemaColumns, type InferColumns } from "./model";

// ==================== Type Functions (for Body Validation) ====================

/** String type for body validation */
export const string = () => z.string();

/** Number type for body validation */
export const number = () => z.number();

/** Boolean type for body validation */
export const boolean = () => z.boolean();

/** Date type for body validation */
export const date = () => z.date();

// ==================== Schema Functions ====================

/**
 * Create a Zod schema for body validation
 * @example
 * ```typescript
 * const data = await c.body(schema({
 *   name: string(),
 *   age: number()
 * }));
 * ```
 */
export function schema<T extends z.ZodRawShape>(shape: T) {
  return z.object(shape);
}

export type Schema<T> = z.ZodSchema<T>;

// ==================== Column Functions (for Database) ====================

/**
 * Column definitions for database models
 * @example
 * ```typescript
 * const User = model("users", {
 *   id: column.number().pk(),
 *   name: column.string(),
 *   email: column.string().optional()
 * });
 * ```
 */
export const column = {
  string: () => new StringType(),
  number: () => new NumberType(),
  boolean: () => new BooleanType(),
  date: () => new DateType(),
};

// ==================== Model Function ====================

/**
 * Define a database model
 * @param tableName - Name of the database table
 * @param columns - Column definitions
 * @example
 * ```typescript
 * const User = model("users", {
 *   id: column.number().pk(),
 *   name: column.string(),
 *   email: column.string().optional(),
 * });
 * ```
 */
export function model<T extends SchemaColumns>(
  tableName: string,
  columns: T
): Model<T> {
  return new Model(tableName, columns);
}

// ==================== Type Exports ====================

export { Model } from "./model";
export type { InferColumns, SchemaColumns } from "./model";
export {
  BaseType,
  StringType,
  NumberType,
  BooleanType,
  DateType,
  PrimaryKeyType,
} from "./types";
