/**
 * Kyrin Framework
 * High-performance minimal web framework for Bun
 *
 * @example
 * ```typescript
 * import { Kyrin, cors } from "kyrin";
 *
 * const app = new Kyrin();
 * app.use(cors());
 * app.get("/", () => ({ message: "Hello!" }));
 * app.listen(3000);
 * ```
 */

// Core
export { Kyrin } from "./core/kyrin";
export type {
  Handler,
  HandlerResponse,
  HttpMethod,
  KyrinConfig,
  LookupResult,
} from "./core/types";

// Router
export { Router } from "./router/router";

// Context
export { Context } from "./context/context";

// Database
export { Database, database, SQLiteClient } from "./db";
export type {
  DatabaseConfig,
  DatabaseClient,
  SQLiteConfig,
  RunResult,
  PreparedStatement,
} from "./db";

// Middleware
export type {
  MiddlewareHandler,
  HookHandler,
  KyrinPlugin,
  PluginFactory,
} from "./middleware";
export { compose } from "./middleware";

// Plugins
export { cors, logger } from "./plugins";
export type { CorsOptions, LoggerOptions } from "./plugins";
