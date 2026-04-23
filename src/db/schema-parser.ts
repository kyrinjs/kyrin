/**
 * Kyrin Database - Schema Parser
 * Modern schema definition parser
 */

export type SqlType = "string" | "integer" | "real" | "bool" | "date";

export interface FieldDef {
  type: SqlType;
  nullable?: boolean;
  notNull?: boolean;
  primary?: boolean;
  default?: any;
}

export type SchemaDef = Record<string, FieldDef>;

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: any;
  primaryKey: boolean;
}

function parseType(type: string): string {
  switch (type) {
    case "string": return "TEXT";
    case "integer": return "INTEGER";
    case "real": return "REAL";
    case "bool": return "INTEGER";
    case "date": return "TEXT";
    default: return "TEXT";
  }
}

export function parseSchema(schema: SchemaDef): ColumnInfo[] {
  return Object.entries(schema).map(([name, def]) => {
    const type = parseType(def.type);
    // Default: NOT NULL unless explicitly nullable
    const isNullable = def.nullable === true;
    return {
      name,
      type,
      nullable: isNullable,
      primaryKey: def.primary ?? (name === "id"),
      defaultValue: def.default ?? null,
    };
  });
}

export function parseSchemas(
  schemas: Record<string, Record<string, FieldDef>>
): { table: string; columns: ColumnInfo[] }[] {
  return Object.entries(schemas).map(([table, schema]) => ({
    table,
    columns: parseSchema(schema),
  }));
}