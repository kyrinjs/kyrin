import { Kyrin, cors } from "./src/lib";

const app = new Kyrin({ development: true });

app.use(async (c, next) => {
  const start = Date.now();
  await next();
  console.log(`${c.method} ${c.path} - ${Date.now() - start}ms`);
});

app.get("/", () => "Hello");

console.log("Test 14: Middleware Function - PASS");