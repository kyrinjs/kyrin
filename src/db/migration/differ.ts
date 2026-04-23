/**
 * Kyrin Migration - Schema Differ
 * Detects schema differences between code definitions and database
 */

import type { DatabaseClient } from "../types/client";

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: any;
  primaryKey: boolean;
}

export interface TableSchema {
  tableName: string;
  columns: ColumnInfo[];
}

export interface SchemaDiff {
  table: string;
  added: ColumnInfo[];
  removed: ColumnInfo[];
  typeChanged: { column: string; from: string; to: string }[];
  nullableChanged: { column: string; from: boolean; to: boolean }[];
  defaultChanged: { column: string; from: any; to: any }[];
  removedRows?: number;
}

export class SchemaDiffer {
  constructor(private client: DatabaseClient) {}

  async tableExists(tableName: string): Promise<boolean> {
    try {
      await this.client.queryOne(`SELECT 1 FROM ${tableName} LIMIT 1`);
      return true;
    } catch {
      return false;
    }
  }

  async getTableSchema(tableName: string): Promise<TableSchema> {
    const exists = await this.tableExists(tableName);
    const columns = exists ? await this.getColumns(tableName) : [];
    return { tableName, columns };
  }

  private async getColumns(tableName: string): Promise<ColumnInfo[]> {
    const dbType = this.getDbType();
    
    if (dbType === "sqlite") {
      return this.getSqliteColumns(tableName);
    } else if (dbType === "postgres") {
      return this.getPostgresColumns(tableName);
    } else if (dbType === "mysql") {
      return this.getMySqlColumns(tableName);
    }
    return [];
  }

  private getDbType(): string {
    const constructorName = this.client.constructor.name;
    if (constructorName.includes("SQLite")) return "sqlite";
    if (constructorName.includes("PostgreSQL")) return "postgres";
    if (constructorName.includes("MySQL")) return "mysql";
    return "sqlite";
  }

  private async getSqliteColumns(tableName: string): Promise<ColumnInfo[]> {
    const rows = await this.client.query<any>(`PRAGMA table_info(${tableName})`);
    return rows.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: row.notnull === 0,
      defaultValue: row.dflt_value,
      primaryKey: row.pk === 1,
    }));
  }

  private async getPostgresColumns(tableName: string): Promise<ColumnInfo[]> {
    const rows = await this.client.query<any>(`
      SELECT c.column_name, c.data_type, c.is_nullable, c.column_default, 
             CASE WHEN pk.column_name IS NOT NULL THEN TRUE ELSE FALSE END as is_primary
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage ku ON tc.constraint_name = ku.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
      ) pk ON c.column_name = pk.column_name
      WHERE c.table_name = $1
      ORDER BY c.ordinal_position
    `, [tableName]);
    
    return rows.map((row: any) => ({
      name: row.column_name,
      type: row.data_type.toUpperCase(),
      nullable: row.is_nullable === "YES",
      defaultValue: row.column_default,
      primaryKey: row.is_primary,
    }));
  }

  private async getMySqlColumns(tableName: string): Promise<ColumnInfo[]> {
    const rows = await this.client.query<any>(`SHOW FULL COLUMNS FROM ${tableName}`);
    return rows.map((row: any) => ({
      name: row.Field,
      type: row.Type,
      nullable: row.Null === "YES",
      defaultValue: row.Default,
      primaryKey: row.Key === "PRI",
    }));
  }

  async compare(codeColumns: ColumnInfo[], dbTableName: string): Promise<SchemaDiff> {
    const dbSchema = await this.getTableSchema(dbTableName);
    const dbColumnsMap = new Map(dbSchema.columns.map(c => [c.name, c]));
    
    const added: ColumnInfo[] = [];
    const removed: ColumnInfo[] = [];
    const typeChanged: { column: string; from: string; to: string }[] = [];
    const nullableChanged: { column: string; from: boolean; to: boolean }[] = [];
    const defaultChanged: { column: string; from: any; to: any }[] = [];

    for (const codeCol of codeColumns) {
      const dbCol = dbColumnsMap.get(codeCol.name);
      if (!dbCol) {
        added.push(codeCol);
      } else {
        if (this.normalizeType(codeCol.type) !== this.normalizeType(dbCol.type)) {
          typeChanged.push({
            column: codeCol.name,
            from: dbCol.type,
            to: codeCol.type,
          });
        }
        if (codeCol.nullable !== dbCol.nullable) {
          nullableChanged.push({
            column: codeCol.name,
            from: dbCol.nullable,
            to: codeCol.nullable,
          });
        }
      }
    }

    for (const dbCol of dbSchema.columns) {
      const codeCol = codeColumns.find(c => c.name === dbCol.name);
      if (!codeCol) {
        removed.push(dbCol);
      }
    }

    // Count rows affected by removed columns
    let removedRows = 0;
    if (removed.length > 0) {
      try {
        for (const col of removed) {
          const countResult = await this.client.queryOne<{ cnt: number }>(
            `SELECT COUNT(*) as cnt FROM ${dbTableName} WHERE ${col.name} IS NOT NULL`
          );
          removedRows += countResult?.cnt ?? 0;
        }
      } catch {
        // Ignore counting errors
      }
    }

    return {
      table: dbTableName,
      added,
      removed,
      typeChanged,
      nullableChanged,
      defaultChanged,
      removedRows,
    };
  }

  private normalizeType(type: string): string {
    return type.toUpperCase().replace(/\s*\(\d+\)/, "").replace(/VARCHAR\(\d+\)/, "VARCHAR");
  }

  hasDataLoss(diff: SchemaDiff): boolean {
    return diff.removed.length > 0 || diff.typeChanged.length > 0;
  }

  generateAlterSQL(diff: SchemaDiff): string[] {
    const statements: string[] = [];

    for (const col of diff.added) {
      const nullable = col.nullable ? "" : " NOT NULL";
      const defaultStr = col.defaultValue !== null ? ` DEFAULT ${col.defaultValue}` : "";
      statements.push(`ALTER TABLE ${diff.table} ADD COLUMN ${col.name} ${col.type}${nullable}${defaultStr}`);
    }

    for (const change of diff.typeChanged) {
      statements.push(`ALTER TABLE ${diff.table} ALTER COLUMN ${change.column} TYPE ${change.to}`);
    }

    return statements;
  }

  generateCreateSQL(tableName: string, columns: ColumnInfo[]): string {
    const colDefs = columns.map(c => {
      const nullable = c.nullable ? "" : " NOT NULL";
      const pk = c.primaryKey ? " PRIMARY KEY" : "";
      const defaultStr = c.defaultValue !== null ? ` DEFAULT ${c.defaultValue}` : "";
      return `${c.name} ${c.type}${pk}${nullable}${defaultStr}`;
    });
    return `CREATE TABLE ${tableName} (${colDefs.join(", ")})`;
  }
}