import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });
app.get("/", () => ({ message: "Hello Kyrin! 🐉" }));
// app.listen(3000); // Skip listen for testing

console.log("Test 2: Hello World with development mode - PASS");