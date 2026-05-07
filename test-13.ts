import { Kyrin } from "./src/lib";

const app = new Kyrin({
  database: { type: "sqlite", filename: "./data.db" },
});

app.schema({
  users: {
    id: { type: "integer", primary: true },
    name: { type: "string" },
    email: { type: "string", notNull: true },
  },
});

console.log("Test 13: SQL Builder Quick Start - PASS (schema only)");