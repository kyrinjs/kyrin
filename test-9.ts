import { Kyrin, cors, db } from "./src/lib";

const app = new Kyrin({ development: true });

// Note: db.connect requires actual DB setup - skip for import test
// db.connect({ client: "sqlite", connection: { filename: "./app.db" }, useNullAsDefault: true });

app.use(cors());

app.onRequest((c) => {
  c.store.start = Date.now();
});

app.onResponse((c) => {
  console.log(`${c.method} ${c.path} - ${Date.now() - c.store.start}ms`);
});

app.get("/", () => ({ status: "ok" }));

console.log("Test 9: Complete Mini App - PASS (import only)");