import { Database, database } from "./src/lib";

const sqlite = new Database({ type: "sqlite", filename: "./app.db" });
const mysql = new Database({
  type: "mysql",
  host: "localhost",
  database: "myapp",
  username: "root",
  password: "pass",
});
const postgres = new Database({
  type: "postgres",
  host: "localhost",
  database: "myapp",
  username: "postgres",
  password: "pass",
});

console.log("Test 17: Database Types - PASS");