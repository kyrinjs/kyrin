/**
 * Kyrin Database - Knex-style Chainable Query Builder
 * Modern, fluent SQL query builder
 * 
 * @example
 * ```typescript
 * import { database } from "kyrin";
 * 
 * const db = database("sqlite::memory:");
 * 
 * // SELECT all
 * const users = await db.from("users").all();
 * 
 * // SELECT with conditions
 * const adults = await db.from("users")
 *   .select("id", "name", "email")
 *   .where("age", ">", 18)
 *   .orderBy("name")
 *   .limit(10)
 *   .all();
 * 
 * // INSERT
 * await db.from("users").insert({ name: "John", email: "john@test.com" }).run();
 * 
 * // UPDATE
 * await db.from("users").where("id", 1).update({ name: "Jane" }).run();
 * 
 * // DELETE
 * await db.from("users").where("id", 1).delete().run();
 * ```
 * 
 * @module kyrin/db
 */

import type { RunResult } from "./types";
import type { DatabaseClient } from "./types/client";

type Operator = "=" | "!=" | ">" | ">=" | "<" | "<=" | "LIKE" | "NOT LIKE" | "IN" | "NOT IN" | "IS" | "IS NOT" | "BETWEEN";

interface WhereCondition {
  column: string;
  operator: Operator;
  value: any;
  logical: "AND" | "OR";
}

interface JoinCondition {
  type: "join" | "leftJoin" | "rightJoin" | "innerJoin" | "crossJoin";
  table: string;
  on1: string;
  on2: string;
}

interface OrderByClause {
  column: string;
  direction: "ASC" | "DESC";
}

/**
 * Knex-style Query Builder
 * 
 * Chainable methods for building SQL queries fluently.
 * 
 * @example
 * ```typescript
 * // SELECT all
 * const users = await db.from("users").all();
 * 
 * // SELECT with conditions
 * const adults = await db.from("users")
 *   .select("id", "name", "email")
 *   .where("age", ">", 18)
 *   .orderBy("name")
 *   .limit(10)
 *   .all();
 * 
 * // INSERT
 * await db.from("users").insert({ name: "John", email: "john@test.com" }).run();
 * 
 * // UPDATE
 * await db.from("users").where("id", 1).update({ name: "Jane" }).run();
 * 
 * // DELETE
 * await db.from("users").where("id", 1).delete().run();
 * ```
 */
export class QueryBuilder<T = unknown> {
  private _table: string = "";
  private _selects: string[] = ["*"];
  private _joins: JoinCondition[] = [];
  private _wheres: WhereCondition[] = [];
  private _whereRaws: { sql: string; params: any[]; logical: "AND" | "OR" }[] = [];
  private _orders: OrderByClause[] = [];
  private _limitVal?: number;
  private _offsetVal?: number;
  private _groups: string[] = [];
  private _havings: WhereCondition[] = [];
  private _havingRaws: { sql: string; params: any[] }[] = [];
  private _isInsert: boolean = false;
  private _isUpdate: boolean = false;
  private _isDelete: boolean = false;
  private _data: any | any[] = [];

  constructor(
    readonly client: DatabaseClient,
  ) {}

  // ==================== Core Methods ====================

  /**
   * Set the table name to query from.
   * 
   * @param table - The table name
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").all();
   * ```
   */
  from(table: string): this {
    this._table = table;
    return this;
  }

  /**
   * Alias for from(). Set the table name.
   * 
   * @param table - The table name
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.table("users").all();
   * ```
   */
  table(table: string): this {
    return this.from(table);
  }

  // ==================== Select ====================

  /**
   * Specify columns to select.
   * 
   * @param columns - Column names to select
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").select("id", "name", "email").all();
   * ```
   */
  select(...columns: string[]): this {
    this._selects = columns.length > 0 ? columns : ["*"];
    return this;
  }

  /**
   * Select all columns (asterisk).
   * 
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").selectAll().all();
   * ```
   */
  selectAll(): this {
    this._selects = ["*"];
    return this;
  }

  // ==================== Where ====================

  /**
   * Add WHERE condition.
   * Supports both simple equality and operator-based conditions.
   * 
   * @param column - Column name
   * @param valueOrOperator - Value or operator (>, <, >=, <=, !=, LIKE, etc.)
   * @param valueIfOperator - Value if operator is provided
   * @returns this - For method chaining
   * @example
   * ```typescript
   * // Simple equality
   * db.from("users").where("id", 1).first();
   * 
   * // With operator
   * db.from("users").where("age", ">", 18).all();
   * ```
   */
  where(column: string, valueOrOperator: any, valueIfOperator?: any): this {
    if (valueIfOperator !== undefined) {
      this._wheres.push({ column, operator: valueOrOperator, value: valueIfOperator, logical: "AND" });
    } else {
      this._wheres.push({ column, operator: "=", value: valueOrOperator, logical: "AND" });
    }
    return this;
  }

  /**
   * Add WHERE condition for id column.
   * 
   * @param id - The id value
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereId(1).first();
   * ```
   */
  whereId(id: number | string): this {
    return this.where("id", id);
  }

  /**
   * Add WHERE IN condition.
   * 
   * @param column - Column name
   * @param values - Array of values to match
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereIn("status", ["active", "pending"]).all();
   * ```
   */
  whereIn(column: string, values: any[]): this {
    this._wheres.push({ column, operator: "IN", value: values, logical: "AND" });
    return this;
  }

  /**
   * Add WHERE column IS NULL condition.
   * 
   * @param column - Column name
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereNull("deleted_at").all();
   * ```
   */
  whereNull(column: string): this {
    this._wheres.push({ column, operator: "IS", value: null, logical: "AND" });
    return this;
  }

  /**
   * Add WHERE column IS NOT NULL condition.
   * 
   * @param column - Column name
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereNotNull("email").all();
   * ```
   */
  whereNotNull(column: string): this {
    this._wheres.push({ column, operator: "IS NOT", value: null, logical: "AND" });
    return this;
  }

  /**
   * Add WHERE column LIKE pattern condition.
   * 
   * @param column - Column name
   * @param pattern - SQL LIKE pattern
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereLike("name", "%john%").all();
   * ```
   */
  whereLike(column: string, pattern: string): this {
    return this.where(column, "LIKE", pattern);
  }

  /**
   * Add WHERE column BETWEEN range condition.
   * 
   * @param column - Column name
   * @param range - Two-element array [min, max]
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereBetween("age", [18, 30]).all();
   * ```
   */
  whereBetween(column: string, range: [any, any]): this {
    this._wheres.push({ column, operator: "BETWEEN", value: range, logical: "AND" });
    return this;
  }

  /**
   * Add raw WHERE clause with parameters.
   * 
   * @param sql - Raw SQL WHERE clause
   * @param params - Parameters for the clause
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").whereRaw("age > ? AND status = ?", 18, "active").all();
   * ```
   */
  whereRaw(sql: string, ...params: any[]): this {
    this._whereRaws.push({ sql, params, logical: "AND" });
    return this;
  }

  /**
   * Add OR WHERE condition.
   * 
   * @param column - Column name
   * @param value - Value to match
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").where("active", true).orWhere("admin", true).all();
   * ```
   */
  orWhere(column: string, value: any): this {
    this._wheres.push({ column, operator: "=", value, logical: "OR" });
    return this;
  }

  // ==================== Join ====================

  /**
   * Add INNER JOIN clause.
   * 
   * @param table - Table name to join
   * @param on1 - Left side of ON condition (table.column)
   * @param on2 - Right side of ON condition (table.column)
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").join("posts", "users.id", "posts.user_id").all();
   * ```
   */
  join(table: string, on1: string, on2: string): this {
    this._joins.push({ type: "innerJoin", table, on1, on2 });
    return this;
  }

  /**
   * Add LEFT JOIN clause.
   * 
   * @param table - Table name to join
   * @param on1 - Left side of ON condition
   * @param on2 - Right side of ON condition
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").leftJoin("posts", "users.id", "posts.user_id").all();
   * ```
   */
  leftJoin(table: string, on1: string, on2: string): this {
    this._joins.push({ type: "leftJoin", table, on1, on2 });
    return this;
  }

  /**
   * Add RIGHT JOIN clause.
   * 
   * @param table - Table name to join
   * @param on1 - Left side of ON condition
   * @param on2 - Right side of ON condition
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").rightJoin("posts", "users.id", "posts.user_id").all();
   * ```
   */
  rightJoin(table: string, on1: string, on2: string): this {
    this._joins.push({ type: "rightJoin", table, on1, on2 });
    return this;
  }

  /**
   * Add CROSS JOIN clause.
   * 
   * @param table - Table name to join
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").crossJoin("tags").all();
   * ```
   */
  crossJoin(table: string): this {
    this._joins.push({ type: "crossJoin", table, on1: "1", on2: "1" });
    return this;
  }

  // ==================== Order & Pagination ====================

  /**
   * Add ORDER BY clause.
   * 
   * @param column - Column name to order by
   * @param direction - Sort direction (ASC or DESC)
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").orderBy("name").all();
   * db.from("users").orderBy("created_at", "DESC").all();
   * ```
   */
  orderBy(column: string, direction: "ASC" | "DESC" = "ASC"): this {
    this._orders.push({ column, direction });
    return this;
  }

  /**
   * Add ORDER BY DESC clause.
   * 
   * @param column - Column name to order by
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").orderByDesc("created_at").all();
   * ```
   */
  orderByDesc(column: string): this {
    return this.orderBy(column, "DESC");
  }

  /**
   * Add LIMIT clause.
   * 
   * @param n - Number of rows to limit
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").limit(10).all();
   * ```
   */
  limit(n: number): this {
    this._limitVal = n;
    return this;
  }

  /**
   * Add OFFSET clause.
   * 
   * @param n - Number of rows to skip
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").offset(10).all();
   * ```
   */
  offset(n: number): this {
    this._offsetVal = n;
    return this;
  }

  /**
   * Pagination shortcut. Sets LIMIT and OFFSET based on page number.
   * 
   * @param page - Page number (1-indexed)
   * @param perPage - Number of rows per page (default: 10)
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("users").page(2, 20).all(); // Skip first 20, get next 20
   * ```
   */
  page(page: number, perPage: number = 10): this {
    this._limitVal = perPage;
    this._offsetVal = (page - 1) * perPage;
    return this;
  }

  // ==================== Group ====================

  /**
   * Add GROUP BY clause.
   * 
   * @param columns - Column names to group by
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("orders").groupBy("status").all();
   * ```
   */
  groupBy(...columns: string[]): this {
    this._groups.push(...columns);
    return this;
  }

  /**
   * Add HAVING clause.
   * 
   * @param column - Column name
   * @param value - Value to compare
   * @returns this - For method chaining
   * @example
   * ```typescript
   * db.from("orders").groupBy("status").having("count", ">", 5).all();
   * ```
   */
  having(column: string, value: any): this {
    this._havings.push({ column, operator: "=", value, logical: "AND" });
    return this;
  }

  // ==================== Insert/Update/Delete ====================

  /**
   * INSERT record(s) into table.
   * 
   * @param data - Object for single insert, or array for bulk insert
   * @returns this - For method chaining
   * @example
   * ```typescript
   * // Single insert
   * await db.from("users").insert({ name: "John", email: "john@test.com" }).run();
   * 
   * // Bulk insert
   * await db.from("users").insert([
   *   { name: "John", email: "john@test.com" },
   *   { name: "Jane", email: "jane@test.com" }
   * ]).run();
   * ```
   */
  insert(data: any | any[]): this {
    this._data = data;
    this._isInsert = true;
    return this;
  }

  /**
   * Alias for insert(). Insert a single record.
   * 
   * @param data - Object to insert
   * @returns this - For method chaining
   * @example
   * ```typescript
   * await db.from("users").create({ name: "John" }).run();
   * ```
   */
  create(data: any): this {
    return this.insert(data);
  }

  /**
   * UPDATE record(s) in table.
   * Must be combined with where() to specify which rows to update.
   * 
   * @param data - Object with columns to update
   * @returns this - For method chaining
   * @example
   * ```typescript
   * await db.from("users").where("id", 1).update({ name: "Jane" }).run();
   * ```
   */
  update(data: any): this {
    this._data = data;
    this._isUpdate = true;
    return this;
  }

  /**
   * DELETE record(s) from table.
   * Must be combined with where() to specify which rows to delete.
   * 
   * @returns this - For method chaining
   * @example
   * ```typescript
   * await db.from("users").where("id", 1).delete().run();
   * ```
   */
  delete(): this {
    this._isDelete = true;
    return this;
  }

  /**
   * Soft delete - sets a deletion timestamp column instead of actually deleting.
   * 
   * @param column - Column name to set (default: "deleted_at")
   * @returns this - For method chaining
   * @example
   * ```typescript
   * await db.from("users").where("id", 1).softDelete().run();
   * await db.from("users").where("id", 1).softDelete("removed_at").run();
   * ```
   */
  softDelete(column: string = "deleted_at"): this {
    this._data = { [column]: new Date().toISOString() };
    this._isUpdate = true;
    return this;
  }

  // ==================== Build ====================

  private transform(value: any): any {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "boolean") return value ? 1 : 0;
    if (Array.isArray(value)) return JSON.stringify(value);
    return value;
  }

  private buildSelect(): { sql: string; params: any[] } {
    const selects = this._selects.join(", ");
    let sql = `SELECT ${selects} FROM ${this._table}`;
    const params: any[] = [];

    for (const join of this._joins) {
      const joinType = join.type === "innerJoin" ? "" : join.type.toUpperCase().replace("JOIN", " ").trim() + " ";
      if (join.type === "crossJoin") {
        sql += ` CROSS JOIN ${join.table}`;
      } else {
        sql += ` ${joinType}JOIN ${join.table} ON ${join.on1} = ${join.on2}`;
      }
    }

    if (this._wheres.length > 0 || this._whereRaws.length > 0) {
      const conditions: string[] = [];
      
      for (const where of this._wheres) {
        let condition: string;
        
        if (where.operator === "IN" || where.operator === "NOT IN") {
          const placeholders = where.value.map(() => "?").join(", ");
          condition = `${where.column} ${where.operator} (${placeholders})`;
          params.push(...where.value);
        } else if (where.operator === "BETWEEN") {
          condition = `${where.column} BETWEEN ? AND ?`;
          params.push(where.value[0], where.value[1]);
        } else if (where.operator === "IS" || where.operator === "IS NOT") {
          condition = `${where.column} ${where.operator} NULL`;
        } else {
          condition = `${where.column} ${where.operator} ?`;
          params.push(where.value);
        }
        
        conditions.push(condition);
      }

      for (const raw of this._whereRaws) {
        const logical = raw.logical;
        const condition = `(${raw.sql})`;
        if (conditions.length > 0) {
          conditions[conditions.length - 1] += ` ${logical} ${condition}`;
        } else {
          conditions.push(condition);
        }
        params.push(...raw.params);
      }

      sql += ` WHERE ${conditions.join(" ")}`;
    }

    if (this._groups.length > 0) {
      sql += ` GROUP BY ${this._groups.join(", ")}`;
    }

    if (this._havings.length > 0) {
      const havings = this._havings.map(h => `${h.column} ${h.operator} ?`).join(" AND ");
      sql += ` HAVING ${havings}`;
      params.push(...this._havings.map(h => h.value));
    }

    if (this._orders.length > 0) {
      const orderBys = this._orders.map(o => `${o.column} ${o.direction}`).join(", ");
      sql += ` ORDER BY ${orderBys}`;
    }

    if (this._limitVal !== undefined) {
      sql += ` LIMIT ?`;
      params.push(this._limitVal);
    }

    if (this._offsetVal !== undefined) {
      sql += ` OFFSET ?`;
      params.push(this._offsetVal);
    }

    return { sql, params };
  }

  // ==================== Execute ====================

  /**
   * Execute the query and return all matching rows.
   * 
   * @returns Promise<T[]> - Array of matching rows
   * @example
   * ```typescript
   * const users = await db.from("users").all();
   * ```
   */
  all(): T[] | Promise<T[]> {
    if (this._isInsert || this._isUpdate || this._isDelete) {
      return this.exec() as any;
    }
    const { sql, params } = this.buildSelect();
    return this.client.query<T>(sql, params);
  }

  /**
   * Execute the query and return the first matching row.
   * Automatically adds LIMIT 1 to the query.
   * 
   * @returns Promise<T | null> - First matching row or null
   * @example
   * ```typescript
   * const user = await db.from("users").where("id", 1).first();
   * ```
   */
  first(): T | null | Promise<T | null> {
    if (this._isInsert || this._isUpdate || this._isDelete) {
      return this.exec() as any;
    }
    const originalLimit = this._limitVal;
    this._limitVal = 1;
    const { sql, params } = this.buildSelect();
    this._limitVal = originalLimit;
    return this.client.queryOne<T>(sql, params);
  }

  /**
   * Execute INSERT, UPDATE, or DELETE and return the result.
   * 
   * @returns Promise<RunResult> - Result with changes and lastInsertRowid
   * @example
   * ```typescript
   * const result = await db.from("users").insert({ name: "John" }).run();
   * console.log(result.changes);
   * ```
   */
  run(): RunResult | Promise<RunResult> {
    return this.exec();
  }

  /**
   * Get the generated SQL query string.
   * Useful for debugging or logging.
   * 
   * @returns string - The SQL query string
   * @example
   * ```typescript
   * const sql = db.from("users").where("age", ">", 18).toSQL();
   * console.log(sql); // "SELECT * FROM users WHERE age > ?"
   * ```
   */
  toSQL(): string {
    if (this._isInsert) {
      if (Array.isArray(this._data)) {
        if (this._data.length === 0) return "";
        const keys = Object.keys(this._data[0]);
        const placeholders = this._data.map(() => `(${keys.map(() => "?").join(", ")})`).join(", ");
        return `INSERT INTO ${this._table} (${keys.join(", ")}) VALUES ${placeholders}`;
      } else {
        const keys = Object.keys(this._data);
        const placeholders = keys.map(() => "?").join(", ");
        return `INSERT INTO ${this._table} (${keys.join(", ")}) VALUES (${placeholders})`;
      }
    }

    if (this._isUpdate) {
      const sets = Object.keys(this._data).map(k => `${k} = ?`).join(", ");
      return `UPDATE ${this._table} SET ${sets}`;
    }

    if (this._isDelete) {
      return this.buildSelect().sql;
    }

    return this.buildSelect().sql;
  }

  /**
   * Get the query parameters (values for placeholders).
   * 
   * @returns any[] - Array of parameter values
   * @example
   * ```typescript
   * const params = db.from("users").where("age", ">", 18).getParams();
   * console.log(params); // [18]
   * ```
   */
  getParams(): any[] {
    if (this._isInsert) {
      if (Array.isArray(this._data)) {
        const keys = Object.keys(this._data[0]);
        return this._data.flatMap(d => keys.map(k => this.transform(d[k])));
      } else {
        return Object.keys(this._data).map(k => this.transform(this._data[k]));
      }
    }

    if (this._isUpdate) {
      const values = Object.keys(this._data).map(k => this.transform(this._data[k]));
      const wheres = this._wheres;
      const whereParams: any[] = [];
      for (const w of wheres) {
        if (w.operator === "IN") {
          const placeholders = w.value.map(() => "?").join(", ");
          whereParams.push(...w.value);
        } else {
          whereParams.push(w.value);
        }
      }
      return [...values, ...whereParams];
    }

    if (this._isDelete) {
      return this._wheres.map(w => w.value);
    }

    return this.buildSelect().params;
  }

  /**
   * Count total rows that match the query.
   * 
   * @param column - Column to count (default: "*")
   * @returns Promise<number> - Total count
   * @example
   * ```typescript
   * const count = await db.from("users").where("active", true).count();
   * ```
   */
  async count(column: string = "*"): Promise<number> {
    const { sql, params } = this.buildSelect();
    const countSql = sql.replace(/SELECT .+? FROM/, `SELECT COUNT(${column}) as _count FROM`);
    const result = await this.client.queryOne<{ _count: number }>(countSql, params);
    return result?._count ?? 0;
  }

  /**
   * Alias for count(). Get total rows.
   * 
   * @returns Promise<number> - Total count
   * @example
   * ```typescript
   * const total = await db.from("users").total();
   * ```
   */
  async total(): Promise<number> {
    return this.count();
  }

  /**
   * Check if any rows match the query.
   * 
   * @returns Promise<boolean> - True if rows exist
   * @example
   * ```typescript
   * const exists = await db.from("users").where("id", 1).exists();
   * ```
   */
  async exists(): Promise<boolean> {
    const result = await this.count();
    return result > 0;
  }

  // ==================== Private Exec ====================

  private exec(): RunResult | Promise<RunResult> {
    const table = this._table;

    if (this._isInsert) {
      if (Array.isArray(this._data)) {
        if (this._data.length === 0) {
          return Promise.resolve({ changes: 0, lastInsertRowid: 0 });
        }
        const keys = Object.keys(this._data[0]);
        const placeholders = this._data.map(() => `(${keys.map(() => "?").join(", ")})`).join(", ");
        const values = this._data.flatMap(d => keys.map(k => this.transform(d[k])));
        return this.client.run(`INSERT INTO ${table} (${keys.join(", ")}) VALUES ${placeholders}`, values);
      } else {
        const keys = Object.keys(this._data);
        const placeholders = keys.map(() => "?").join(", ");
        const values = keys.map(k => this.transform(this._data[k]));
        return this.client.run(`INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`, values);
      }
    }

    if (this._isUpdate) {
      const sets = Object.keys(this._data).map(k => `${k} = ?`).join(", ");
      const values = Object.keys(this._data).map(k => this.transform(this._data[k]));
      const wheres = this._wheres;
      const whereParams: any[] = [];
      const whereSql = wheres.map((w: WhereCondition) => {
        if (w.operator === "IN") {
          const placeholders = w.value.map(() => "?").join(", ");
          whereParams.push(...w.value);
          return `${w.column} IN (${placeholders})`;
        }
        whereParams.push(w.value);
        return `${w.column} ${w.operator} ?`;
      }).join(" AND ");
      return this.client.run(`UPDATE ${table} SET ${sets} WHERE ${whereSql}`, [...values, ...whereParams]);
    }

    if (this._isDelete) {
      const wheres = this._wheres;
      const whereParams: any[] = [];
      const whereSql = wheres.map((w: WhereCondition) => {
        if (w.operator === "IN") {
          const placeholders = w.value.map(() => "?").join(", ");
          whereParams.push(...w.value);
          return `${w.column} IN (${placeholders})`;
        }
        whereParams.push(w.value);
        return `${w.column} ${w.operator} ?`;
      }).join(" AND ");
      return this.client.run(`DELETE FROM ${table} WHERE ${whereSql}`, whereParams);
    }

    return Promise.resolve({ changes: 0, lastInsertRowid: 0 });
  }
}

/**
 * @deprecated Use QueryBuilder instead. This export is for backwards compatibility.
 */
export { QueryBuilder as KnexBuilder };