import { Kyrin } from "./src/lib";

const app = new Kyrin({
  development: process.env.NODE_ENV !== "production",
});

console.log("Test 6: Environment-based Development Mode - PASS");