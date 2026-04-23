/**
 * Kyrin Database - Template Query Builder
 * Simple query builder using template literals
 */

import type { RunResult } from "./types";
import type { DatabaseClient } from "./types/client";

/**
 * Template literal query builder
 * @example
 * ```typescript
 * db.sql`SELECT * FROM users WHERE age > ${18}`.all();
 * db.sql`SELECT * FROM users WHERE id = ${id}`.first();
 * db.sql`INSERT INTO users (name) VALUES (${name})`.run();
 * ```
 */
export class TemplateQueryBuilder<T = unknown> {
  constructor(
    readonly client: DatabaseClient,
    readonly sqlQuery: string,
    readonly params: any[]
  ) {}

  all(): T[] | Promise<T[]> {
    return this.client.query<T>(this.sqlQuery, this.params);
  }

  first(): T | null | Promise<T | null> {
    return this.client.queryOne<T>(this.sqlQuery, this.params);
  }

  run(): RunResult | Promise<RunResult> {
    return this.client.run(this.sqlQuery, this.params);
  }
}

/** @deprecated Use TemplateQueryBuilder */
export { TemplateQueryBuilder as QueryBuilder };
