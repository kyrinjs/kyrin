/**
 * Kyrin Database - Migration Data Loss Warning Example
 * 
 * This demonstrates the CLI prompt when auto migration detects
 * that existing data may be lost.
 */

import { database } from "./db/index";

async function main() {
  console.log("\n========== Migration with Data Loss Warning ==========\n");

  const db = database("sqlite::memory:");

  // Step 1: Create table with existing data
  console.log("1. Creating initial table with data...\n");
  
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      old_field TEXT
    )
  `);

  // Insert some data (including data in old_field that will be dropped)
  await db.exec("INSERT INTO users (name, email, status, old_field) VALUES ('John', 'john@test.com', 'active', 'data1')");
  await db.exec("INSERT INTO users (name, email, status, old_field) VALUES ('Jane', 'jane@test.com', 'active', 'data2')");
  await db.exec("INSERT INTO users (name, email, status, old_field) VALUES ('Mike', 'mike@test.com', 'inactive', 'data3')");

  const before = await db.query("SELECT * FROM users");
  console.log("Current data:", before);

  // Step 2: Define NEW schema (missing old_field, adding new columns)
  console.log("\n2. Running migration with NEW schema...\n");
  console.log("New schema removes 'old_field' and adds 'age' and 'city'");
  console.log("This should trigger data loss warning!\n");

  // This will detect:
  // - old_field will be REMOVED (data loss!)
  // - age will be ADDED
  // - city will be ADDED
  
  // Using the CLI will prompt for confirmation
  // For this example, we'll use dryRun to show what would happen
  
  const result = await db.migrate("users", [
    { name: "id", type: "INTEGER", nullable: false, defaultValue: null, primaryKey: true },
    { name: "name", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "email", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "status", type: "TEXT", nullable: true, defaultValue: null, primaryKey: false },
    { name: "age", type: "INTEGER", nullable: true, defaultValue: null, primaryKey: false },
    { name: "city", type: "TEXT", nullable: true, defaultValue: null, primaryKey: false },
  ], { dryRun: true });

  console.log("\n--- RESULT ---");
  console.log(result);

  console.log("\n========== What CLI would show ==========\n");
  console.log(`
╔══════════════════════════════════════════════════╗
║ ⚠ MIGRATION WARNING - DATA LOSS RISK           ║
╠══════════════════════════════════════════════════╣
║ Table: users                                    ║
║                                                ║
║ Changes:                                       ║
║ • - column: old_field (will be dropped)         ║
║ • + column: age (INTEGER)                      ║
║ • + column: city (TEXT)                       ║
║                                                ║
║ ⚠ WARNING: 1 column will be DROPPED            ║
║ Data loss: ~3 rows affected in old_field        ║
║                                                ║
║ Continue with migration? [y/N]:                ║
╚═════════════════════════════════════��════════════╝
  `);

  await db.close();
  
  console.log("Done!");
}

main().catch(console.error);