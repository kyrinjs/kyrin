import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });

app.static("./public");
app.static("./public", { prefix: "/assets" });

console.log("Test 10: Static Files - PASS");