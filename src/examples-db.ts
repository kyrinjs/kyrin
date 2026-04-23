/**
 * Kyrin Database - Use Case Examples
 * 
 * This file demonstrates how to use:
 * 1. KnexBuilder - chainable query API
 * 2. Auto Migration - code-first migration with CLI prompts
 */

import { database, type Database } from "./db/index";

// ==================== SETUP ====================

const db = database("sqlite::memory:");

// ==================== USE CASE 1: Basic CRUD with KnexBuilder ====================

async function useCase1_BasicCRUD() {
  console.log("\n========== USE CASE 1: Basic CRUD ==========\n");

  // Create table
  await db.exec(`
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      age INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // INSERT - single record
  await db.from("users").insert({
    name: "John",
    email: "john@test.com",
    age: 25,
  }).run();

  // INSERT - multiple records
  await db.from("users").insert([
    { name: "Jane", email: "jane@test.com", age: 30 },
    { name: "Mike", email: "mike@test.com", age: 28 },
  ]).run();

  // SELECT all
  const users = await db.from("users").select("id", "name", "email").all();
  console.log("All users:", users);

  // SELECT with WHERE
  const adult = await db.from("users")
    .select("id", "name", "age")
    .where("age", ">", 20)
    .orderBy("name")
    .all();
  console.log("Adults:", adult);

  // SELECT first
  const john = await db.from("users")
    .where("name", "=", "John")
    .first();
  console.log("John:", john);

  // UPDATE
  await db.from("users")
    .where("name", "=", "John")
    .update({ age: 26 })
    .run();

  // DELETE
  await db.from("users")
    .where("name", "=", "Mike")
    .delete()
    .run();

  const remaining = await db.from("users").all();
  console.log("After delete:", remaining);
}

// ==================== USE CASE 2: Advanced Queries ====================

async function useCase2_AdvancedQueries() {
  console.log("\n========== USE CASE 2: Advanced Queries ==========\n");

  await db.exec(`
    CREATE TABLE posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.exec("INSERT INTO posts (user_id, title, content, status) VALUES (1, 'First Post', 'Hello world', 'published')");
  await db.exec("INSERT INTO posts (user_id, title, content, status) VALUES (1, 'Draft Post', 'Work in progress', 'draft')");
  await db.exec("INSERT INTO posts (user_id, title, content, status) VALUES (2, 'Jane Post', 'Nice day', 'published')");

  // WHERE IN
  const posts = await db.from("posts")
    .select("id", "title", "status")
    .whereIn("status", ["published", "draft"])
    .all();
  console.log("Published/Draft:", posts);

  // WHERE LIKE
  const matching = await db.from("posts")
    .whereLike("title", "%Post%")
    .all();
  console.log("Matching 'Post':", matching);

  // WHERE NULL
  const noContent = await db.from("posts")
    .whereNull("content")
    .all();
  console.log("No content:", noContent);

  // ORDER BY DESC
  const latest = await db.from("posts")
    .orderByDesc("id")
    .limit(2)
    .all();
  console.log("Latest 2:", latest);

  // COUNT
  const total = await db.from("posts").total();
  console.log("Total posts:", total);
}

// ==================== USE CASE 3: Auto Migration ====================

async function useCase3_AutoMigration() {
  console.log("\n========== USE CASE 3: Auto Migration ==========\n");

  // First call - adds new columns
  const result1 = await db.migrate("products", [
    { name: "id", type: "INTEGER", nullable: false, defaultValue: null, primaryKey: true },
    { name: "name", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "price", type: "REAL", nullable: false, defaultValue: null, primaryKey: false },
  ], { dryRun: true });
  
  console.log("Dry run result:", result1);

  // Second call - no changes (skipped)
  const result2 = await db.migrate("products", [
    { name: "id", type: "INTEGER", nullable: false, defaultValue: null, primaryKey: true },
    { name: "name", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "price", type: "REAL", nullable: false, defaultValue: null, primaryKey: false },
  ]);
  
  console.log("Second migration (no changes):", result2);

  // Add new column - will prompt in real CLI
  const result3 = await db.migrate("products", [
    { name: "id", type: "INTEGER", nullable: false, defaultValue: null, primaryKey: true },
    { name: "name", type: "TEXT", nullable: false, defaultValue: null, primaryKey: false },
    { name: "price", type: "REAL", nullable: false, defaultValue: null, primaryKey: false },
    { name: "description", type: "TEXT", nullable: true, defaultValue: null, primaryKey: false },
  ], { dryRun: true });
  
  console.log("Add column dry run:", result3);
}

// ==================== USE CASE 4: Template Literal Query ====================

async function useCase4_TemplateLiteral() {
  console.log("\n========== USE CASE 4: Template Literal Query ==========\n");

  const userId = 1;
  const age = 25;

  // Using template literal (existing feature)
  const user = await db.sql`SELECT * FROM users WHERE id = ${userId}`.first();
  console.log("Template literal query:", user);

  const adults = await db.sql`SELECT * FROM users WHERE age > ${age}`.all();
  console.log("Adults via template:", adults);
}

// ==================== RUN ALL USE CASES ====================

async function main() {
  console.log("Starting Kyrin Database Examples...\n");
  
  await useCase1_BasicCRUD();
  await useCase2_AdvancedQueries();
  await useCase3_AutoMigration();
  await useCase4_TemplateLiteral();
  
  console.log("\n========== ALL EXAMPLES COMPLETE ==========\n");
  
  await db.close();
}

main().catch(console.error);