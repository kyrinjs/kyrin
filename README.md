# Kyrin

A simple, fast web framework for [Bun](https://bun.sh).

[![npm version](https://img.shields.io/npm/v/kyrin.svg)](https://npmjs.com/package/kyrin)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

> Currently, this project is a solo effort and still in early development.

## Install

```bash
bun add kyrin
```

## Quick Start

```typescript
import { Kyrin, cors } from "kyrin";

const app = new Kyrin();

app.use(cors());
app.get("/", () => ({ message: "Hello!" }));
app.listen(3000);
```

## Routing

```typescript
app.get("/users", () => db.sql`SELECT * FROM users`.all());
app.get("/users/:id", (c) => ({ id: c.param("id") }));
app.post("/users", async (c) => {
  const body = await c.body<{ name: string }>();
  return { created: body.name };
});
```

## Middleware

```typescript
// Global
app.use(async (c, next) => {
  console.log(`${c.method} ${c.path}`);
  await next();
});

// Hooks
app.onRequest((c) => {
  c.store.start = Date.now();
});
app.onResponse((c) => {
  console.log(`${Date.now() - c.store.start}ms`);
});

// Protected routes
app.guard(auth, (app) => {
  app.get("/admin", () => "secret");
});
```

## CORS

```typescript
app.use(cors()); // allow all
app.use(cors({ origin: "https://example.com", credentials: true }));
```

## Database

```typescript
import { Database } from "kyrin";

const db = new Database({ type: "sqlite", filename: "./app.db" });

// Query
const users = db.sql`SELECT * FROM users`.all();
const user = db.sql`SELECT * FROM users WHERE id = ${id}`.first();

// Insert
db.sql`INSERT INTO users (name) VALUES (${"John"})`.run();
```

## Context

```typescript
app.get("/example", async (c) => {
  c.method; // GET
  c.path; // /example
  c.param("id"); // path param
  c.query("page"); // query param
  c.header("Authorization");
  await c.body(); // JSON body

  c.store.user; // middleware data
  c.set.headers["X-ID"] = "123";

  return c.json({ ok: true });
});
```

## Requirements

[Bun](https://bun.sh) >= 1.0.0

## License

MIT
