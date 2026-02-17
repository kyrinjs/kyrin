/**
 * Kyrin Schema - Model Class
 * Provides CRUD operations and SQL generation
 */

import { z } from "zod";
import type { Database } from "../db/database";
import type { RunResult } from "../db/types";
import { BaseType } from "./types";

// ==================== Type Utilities ====================

/** Extract inferred type from schema columns */
export type InferColumns<T extends Record<string, BaseType<any>>> = {
  [K in keyof T]: z.infer<T[K]["zod"]>;
};

/** Schema columns definition */
export type SchemaColumns = Record<string, BaseType<any>>;

// ==================== SQL Type Mapping (Zod v4) ====================

/** Get Zod type from _def.type (Zod v4) */
function getZodType(zodType: any): string {
  return (
    zodType?._def?.type ||
    zodType?._zod?.def?.type ||
    zodType?.type ||
    "unknown"
  );
}

/** Unwrap Zod wrapper types (optional, default, nullable) */
function unwrapZodType(zodType: any): {
  inner: any;
  nullable: boolean;
  defaultValue: any;
} {
  let inner = zodType;
  let nullable = false;
  let defaultValue: any = undefined;

  // Keep unwrapping until we hit a base type
  let maxIterations = 5;
  while (maxIterations-- > 0) {
    const type = getZodType(inner);

    if (type === "optional") {
      nullable = true;
      inner = inner._def?.innerType || inner._zod?.def?.innerType;
      continue;
    }

    if (type === "nullable") {
      nullable = true;
      inner = inner._def?.innerType || inner._zod?.def?.innerType;
      continue;
    }

    if (type === "default") {
      // Get default value (it's a getter in Zod v4)
      const def = inner._def || inner._zod?.def;
      try {
        defaultValue =
          typeof def?.defaultValue === "function"
            ? def.defaultValue()
            : def?.defaultValue;
      } catch {
        defaultValue = undefined;
      }
      inner = def?.innerType;
      continue;
    }

    // Base type reached
    break;
  }

  return { inner, nullable, defaultValue };
}

function zodToSqlType(zodType: any): string {
  const { inner, nullable, defaultValue } = unwrapZodType(zodType);
  const type = getZodType(inner);

  // Map base types (Zod v4 uses lowercase type names)
  let sqlType: string;
  switch (type) {
    case "string":
      sqlType = "TEXT";
      break;
    case "number":
    case "int":
      sqlType = "INTEGER";
      break;
    case "boolean":
      sqlType = "INTEGER";
      break;
    case "date":
      sqlType = "TEXT";
      break;
    case "array":
      sqlType = "TEXT"; // Store as JSON
      break;
    default:
      sqlType = "TEXT"; // Fallback
  }

  // Add constraints
  if (!nullable) {
    sqlType += " NOT NULL";
  }
  if (defaultValue !== undefined) {
    if (typeof defaultValue === "string") {
      sqlType += ` DEFAULT '${defaultValue}'`;
    } else if (typeof defaultValue === "boolean") {
      sqlType += ` DEFAULT ${defaultValue ? 1 : 0}`;
    } else if (defaultValue instanceof Date) {
      sqlType += ` DEFAULT '${defaultValue.toISOString()}'`;
    } else {
      sqlType += ` DEFAULT ${defaultValue}`;
    }
  }

  return sqlType;
}

// ==================== Model Class ====================

export class Model<T extends SchemaColumns> {
  /** Inferred TypeScript type */
  declare $type: InferColumns<T>;
  private primaryKey: string;

  constructor(
    public readonly tableName: string,
    public readonly columns: T,
  ) {
    // Find primary key column
    this.primaryKey = "id"; // default
    for (const [name, type] of Object.entries(columns)) {
      if (type.constructor.name === "PrimaryKeyType") {
        this.primaryKey = name;
        break;
      }
    }
  }

  // ==================== SQL Generation ====================

  /** Generate CREATE TABLE SQL */
  toCreateSQL(): string {
    const cols = Object.entries(this.columns).map(([name, type]) => {
      const sqlType = zodToSqlType(type.zod);
      // Check if this is the primary key column
      if (name === this.primaryKey) {
        return `${name} INTEGER PRIMARY KEY AUTOINCREMENT`;
      }
      return `${name} ${sqlType}`;
    });
    return `CREATE TABLE IF NOT EXISTS ${this.tableName} (${cols.join(", ")})`;
  }

  /** Get existing columns from database */
  private getExistingColumns(db: Database): string[] {
    const result = db.query<{ name: string }>(
      `PRAGMA table_info(${this.tableName})`,
    );
    return result.map((row) => row.name);
  }

  /** Generate ALTER TABLE statements for new columns (safe mode) */
  toAlterSQL(db: Database): string[] {
    const existing = new Set(this.getExistingColumns(db));
    const statements: string[] = [];

    for (const [name, type] of Object.entries(this.columns)) {
      if (!existing.has(name)) {
        const sqlType = zodToSqlType(type.zod);
        statements.push(
          `ALTER TABLE ${this.tableName} ADD COLUMN ${name} ${sqlType}`,
        );
      }
    }

    return statements;
  }

  // ==================== CRUD Operations ====================

  /** Create a new record */
  create(db: Database, data: Partial<InferColumns<T>>): InferColumns<T> {
    const keys = Object.keys(data).filter((k) => k !== this.primaryKey);
    const values = keys.map((k) => {
      const val = (data as any)[k];
      // Convert Date to ISO string
      if (val instanceof Date) return val.toISOString();
      // Convert boolean to 0/1
      if (typeof val === "boolean") return val ? 1 : 0;
      // Convert array to JSON
      if (Array.isArray(val)) return JSON.stringify(val);
      return val;
    });

    const placeholders = keys.map(() => "?").join(", ");
    const sql = `INSERT INTO ${this.tableName} (${keys.join(
      ", "
    )}) VALUES (${placeholders})`;
    const result = db.run(sql, values);

    // Return created record with primary key
    return { ...data, [this.primaryKey]: result.lastInsertRowid } as InferColumns<T>;
  }

  /** Find all records (optional where clause) */
  findAll(db: Database, where?: Partial<InferColumns<T>>): InferColumns<T>[] {
    if (!where || Object.keys(where).length === 0) {
      return db.query<InferColumns<T>>(`SELECT * FROM ${this.tableName}`);
    }

    const conditions = Object.keys(where)
      .map((k) => `${k} = ?`)
      .join(" AND ");
    const values = Object.values(where);
    return db.query<InferColumns<T>>(
      `SELECT * FROM ${this.tableName} WHERE ${conditions}`,
      values,
    );
  }

  /** Find one record */
  findOne(
    db: Database,
    where: Partial<InferColumns<T>>,
  ): InferColumns<T> | null {
    const conditions = Object.keys(where)
      .map((k) => `${k} = ?`)
      .join(" AND ");
    const values = Object.values(where);
    return db.queryOne<InferColumns<T>>(
      `SELECT * FROM ${this.tableName} WHERE ${conditions} LIMIT 1`,
      values,
    );
  }

  /** Update records */
  update(
    db: Database,
    where: Partial<InferColumns<T>>,
    data: Partial<InferColumns<T>>,
  ): RunResult {
    const setClause = Object.keys(data)
      .map((k) => `${k} = ?`)
      .join(", ");
    const whereClause = Object.keys(where)
      .map((k) => `${k} = ?`)
      .join(" AND ");
    const values = [...Object.values(data), ...Object.values(where)];
    return db.run(
      `UPDATE ${this.tableName} SET ${setClause} WHERE ${whereClause}`,
      values,
    );
  }

  /** Delete records */
  delete(db: Database, where: Partial<InferColumns<T>>): RunResult {
    const conditions = Object.keys(where)
      .map((k) => `${k} = ?`)
      .join(" AND ");
    const values = Object.values(where);
    return db.run(`DELETE FROM ${this.tableName} WHERE ${conditions}`, values);
  }
}
