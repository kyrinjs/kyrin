/**
 * Kyrin Database - Modern Schema Example
 */

import { Kyrin } from "./core/index";

async function main() {
  console.log("\n========== Modern Schema ==========\n");

  const app = new Kyrin({
    port: 3000,
    development: true,
    database: { type: "sqlite", filename: ":memory:" },
  });

  // Define schema - this creates tables
  app.schema({
    users: {
      id: { type: "integer", primary: true },
      name: { type: "string" },
      email: { type: "string", notNull: true },
      age: { type: "integer", nullable: true },
    },
    posts: {
      id: { type: "integer", primary: true },
      user_id: { type: "integer" },
      title: { type: "string", notNull: true },
      content: { type: "string", nullable: true },
    },
  });

  // Use database
  const db = app.db();

  // Insert
  await db.from("users").insert({ name: "John", email: "john@test.com", age: 25 }).run();

  // Query
  const users = await db.from("users").all();
  console.log("Users:", users);

  console.log("\n========== Done! ==========\n");
}

main().catch(console.error);