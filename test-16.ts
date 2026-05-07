import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });

app.get("/users", () => ({ users: [] }));
app.post("/users", () => ({ created: true }));
app.put("/users/:id", () => ({ updated: true }));
app.patch("/users/:id", () => ({ patched: true }));
app.delete("/users/:id", () => null);

console.log("Test 16: Basic Routes - PASS");