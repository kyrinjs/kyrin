/**
 * Test: Verify migration schema vs defined
 */

import { database } from "./db/index";

async function main() {
  const db = database("sqlite::memory:");

  // Define schema
  const columns = [
    { name: "id", type: "INTEGER", nullable: false, defaultValue: null, primaryKey: true },
    { name: "name", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "email", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "age", type: "INTEGER", nullable: true, defaultValue: null, primaryKey: false },
  ];

  console.log("=== Defined Schema ===");
  console.log(columns);

  // Run migration
  const result = await db.migrate("users", columns);
  
  console.log("\n=== Result ===");
  console.log(result);

  // Check actual table
  const actual = await db.query("PRAGMA table_info(users)");
  console.log("\n=== Actual Table ===");
  console.log(actual);

  await db.close();
}

main().catch(console.error);