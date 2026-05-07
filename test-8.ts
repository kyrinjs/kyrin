import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });

app.get("/data", (c) => c.json({ ok: true }));
app.get("/page", (c) => c.html("<h1>Hello</h1>"));
app.get("/message", (c) => c.send("Plain text"));

console.log("Test 8: Context Response Helpers - PASS");