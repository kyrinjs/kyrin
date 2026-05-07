import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });

app.get("/json", () => ({ message: "Hello" }));
app.get("/text", () => "Hello");
app.delete("/item/:id", () => null);
app.get("/custom", () => new Response("Custom", { status: 201 }));

console.log("Test 7: Returning Responses (Auto detection) - PASS");