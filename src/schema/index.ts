/**
 * Kyrin Schema - Public API
 * Simple schema definition for auto database table creation
 */

import { z } from "zod";
import { StringType, NumberType, BooleanType, DateType } from "./types";
import { Model, type SchemaColumns, type InferColumns } from "./model";

// ==================== Type Functions ====================

/** String column → TEXT */
export const string = () => new StringType();

/** Number column → INTEGER */
export const number = () => new NumberType();

/** Boolean column → INTEGER (0/1) */
export const boolean = () => new BooleanType();

/** Date column → TEXT (ISO string) */
export const date = () => new DateType();

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

// ==================== Model Function ====================

/**
 * Define a database model
 * @param tableName - Name of the database table
 * @param columns - Column definitions
 * @example
 * ```typescript
 * const User = model("users", {
 *   id: number(),
 *   name: string(),
 *   email: string().optional(),
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
