import { Kyrin } from "./src/lib";

const app = new Kyrin({
  port: 3000,
  hostname: "localhost",
  development: true,
  onError: (err, c) => c.json({ error: err.message }, 500),
});

console.log("Test 3: Basic Configuration - PASS");