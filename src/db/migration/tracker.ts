/**
 * Kyrin Migration - Migration Tracker
 * Tracks applied migrations in database
 */

import type { DatabaseClient } from "../types/client";

export interface MigrationRecord {
  id: number;
  name: string;
  appliedAt: string;
  checksum: string;
}

export class MigrationTracker {
  public client: DatabaseClient;
  
  constructor(client: DatabaseClient) {
    this.client = client;
  }

  async ensureTable(): Promise<void> {
    const sql = `
      CREATE TABLE IF NOT EXISTS _migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at TEXT NOT NULL,
        checksum TEXT NOT NULL
      )
    `;
    await this.client.exec(sql);
  }

  async getApplied(): Promise<MigrationRecord[]> {
    await this.ensureTable();
    return this.client.query<MigrationRecord>("SELECT * FROM _migrations ORDER BY id");
  }

  async isApplied(name: string): Promise<boolean> {
    await this.ensureTable();
    const result = await this.client.queryOne<MigrationRecord>(
      "SELECT * FROM _migrations WHERE name = ?",
      [name]
    );
    return result !== null;
  }

  async record(name: string, checksum: string): Promise<void> {
    await this.ensureTable();
    await this.client.run(
      "INSERT INTO _migrations (name, applied_at, checksum) VALUES (?, ?, ?)",
      [name, new Date().toISOString(), checksum]
    );
  }

  async remove(name: string): Promise<void> {
    await this.client.run("DELETE FROM _migrations WHERE name = ?", [name]);
  }

  async clear(): Promise<void> {
    await this.client.exec("DELETE FROM _migrations");
  }
}