# Changelog

## [0.0.1-experimental.1] - 2025-12-14

Middleware support is here! Now you can add CORS, auth, logging, or whatever you need.

**New stuff:**

- `use()` for global middleware
- `onRequest()` / `onResponse()` hooks
- `guard()` to protect groups of routes
- Built-in `cors()` plugin
- `c.store` for passing data between middleware
- `c.set.headers` / `c.set.status` for response customization

## [0.0.0-initial.3] - 2025-12-13

Added SQLite support using Bun's native driver.

**New stuff:**

- Native SQLite via `bun:sqlite`
- Template literal queries: `` db.sql`SELECT * FROM users` ``
- `.all()`, `.first()`, `.run()` methods
- Transaction support with auto-rollback

## [0.0.0-initial.2] - 2025-12-12

Route organization and performance improvements.

**New stuff:**

- Route groups with `app.route("/prefix", router)`
- Better body parsing: `c.body<T>()`, `c.text()`, `c.formData()`

**Improvements:**

- Faster path parsing
- Better TypeScript inference

## [0.0.0-initial.1] - 2025-12-12

Initial release. Basic routing with RadixTree, context helpers, auto-response.
