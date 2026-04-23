/**
 * Kyrin Migration - Migration Runner
 * Orchestrates the migration process
 */

import { MigrationTracker, type MigrationRecord } from "./tracker";
import { SchemaDiffer, type SchemaDiff, type ColumnInfo } from "./differ";
import type { DatabaseClient } from "../types/client";
import type { RunResult } from "../types";

export interface MigrationPlan {
  name: string;
  table: string;
  diff: SchemaDiff;
  sql: string[];
}

export interface MigrationResult {
  name: string;
  success: boolean;
  executed: string[];
  error?: string;
}

export class MigrationRunner {
  private tracker: MigrationTracker;
  private differ: SchemaDiffer;
  public client: DatabaseClient;

  constructor(client: DatabaseClient) {
    this.client = client;
    this.tracker = new MigrationTracker(client);
    this.differ = new SchemaDiffer(client);
  }

  async plan(
    tableName: string,
    codeColumns: ColumnInfo[],
    migrationName?: string
  ): Promise<MigrationPlan | null> {
    const name = migrationName || `migrate_${tableName}_${Date.now()}`;
    const exists = await this.differ.tableExists(tableName);
    
    if (!exists) {
      const createSql = this.differ.generateCreateSQL(tableName, codeColumns);
      return {
        name,
        table: tableName,
        diff: {
          table: tableName,
          added: codeColumns,
          removed: [],
          typeChanged: [],
          nullableChanged: [],
          defaultChanged: [],
        },
        sql: [createSql],
      };
    }
    
    const diff = await this.differ.compare(codeColumns, tableName);

    if (diff.added.length === 0 && diff.removed.length === 0 && diff.typeChanged.length === 0) {
      return null;
    }

    const sql = this.differ.generateAlterSQL(diff);

    return { name, table: tableName, diff, sql };
  }

  async execute(plan: MigrationPlan): Promise<MigrationResult> {
    const executed: string[] = [];
    const errors: string[] = [];

    try {
      for (const sql of plan.sql) {
        try {
          await this.tracker.client.exec(sql);
          executed.push(sql);
        } catch (e: any) {
          errors.push(e.message || sql);
          throw e;
        }
      }

      const checksum = this.generateChecksum(plan);
      await this.tracker.record(plan.name, checksum);

      return {
        name: plan.name,
        success: true,
        executed,
      };
    } catch (e: any) {
      return {
        name: plan.name,
        success: false,
        executed,
        error: e.message,
      };
    }
  }

  async getStatus(): Promise<MigrationRecord[]> {
    return this.tracker.getApplied();
  }

  async rollback(name: string): Promise<void> {
    await this.tracker.remove(name);
  }

  private generateChecksum(plan: MigrationPlan): string {
    const content = JSON.stringify(plan.diff);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}