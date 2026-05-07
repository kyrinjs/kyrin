import { Kyrin, Database, model, string, number, boolean } from "./src/lib";

const User = model("users", {
  id: number(),
  name: string(),
  email: string().optional(),
  isActive: boolean().default(true),
});

const db = new Database({ type: "sqlite", filename: "./app.db" });
db.register(User);
db.sync({ force: true });

console.log("Test 15: Schema Model - PASS");