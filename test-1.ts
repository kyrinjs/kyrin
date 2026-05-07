import { Kyrin, cors } from "./src/lib";

const app = new Kyrin();
app.get("/", () => ({ message: "Hello Kyrin!" }));

console.log("Test 1: Basic app with cors middleware - PASS");