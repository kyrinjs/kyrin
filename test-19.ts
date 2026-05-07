import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });

app.onRequest((c) => {
  c.store.startTime = Date.now();
  console.log(`→ ${c.method} ${c.path}`);
});

app.onResponse((c) => {
  const duration = Date.now() - c.store.startTime;
  console.log(`← ${c.method} ${c.path} (${duration}ms)`);
});

app.get("/", () => "Hello");

console.log("Test 19: Hooks (onRequest/onResponse) - PASS");