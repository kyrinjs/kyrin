import { Kyrin } from "./src/lib";

const app = new Kyrin({
  onError: (err, c) => {
    return c.json({ error: err.message }, 500);
  }
});

console.log("Test 11: Custom Error Handler - PASS");