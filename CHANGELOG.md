# Changelog

## [0.0.1-experimental.4] - 2026-02-18

Custom error handlers, static file serving, validation, and custom primary keys!

**New Features:**

- **Error Handler Plugin** - Define custom error handlers in constructor: `new Kyrin({ onError: (err, c) => ... })`
- **Static File Serving** - Serve files easily: `app.static("./public", { prefix: "/assets" })`
- **Request Validation** - Validate body with Zod: `app.post("/users", schema, handler)`
- **Custom Primary Key** - Define custom PK: `sku: string().pk()` instead of hardcoded `id`

## [0.0.1-experimental.3] - 2025-12-17

Auto database schema generation! Define models in TypeScript and sync to SQLite automatically.

**New stuff:**

- `model()` to define database tables
- Type functions: `string()`, `number()`, `boolean()`, `date()`
- Modifiers: `.optional()`, `.default()`, `.nullable()`, `.array()`
- `db.register()` to register models
- `db.sync()` - safe mode (adds new columns only)
- `db.sync({ force: true })` - force mode (drops and recreates)
- `db.sync({ dryRun: true })` - returns SQL without executing
- CRUD operations: `Model.create()`, `.findAll()`, `.findOne()`, `.update()`, `.delete()`
- Type inference with `Model.$type`

**Dependencies:**

- Zod v4 bundled internally (users don't need to install)

## [0.0.1-experimental.2] - 2025-12-17

development mode enabled to see errors and logs in the response

**New stuff:**

- `development` mode for debugging

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
