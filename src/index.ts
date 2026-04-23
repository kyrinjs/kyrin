/**
 * Kyrin Framework - Main Entry Point
 * Re-exports all public APIs from the framework
 *
 * @example
 * ```typescript
 * import { Kyrin, Router, Context, model } from "kyrin";
 *
 * const app = new Kyrin();
 * app.get("/", () => ({ message: "Hello!" }));
 * app.listen(3000);
 * ```
 */

// ==================== Core ====================
export { Kyrin } from "./core/kyrin";
export type { Handler, HandlerResponse, HttpMethod, KyrinConfig } from "./core/types";

// ==================== Router ====================
export { Router } from "./router/router";

// ==================== Context ====================
export { Context } from "./context/context";

// ==================== Middleware ====================
export type { MiddlewareHandler, HookHandler, KyrinPlugin } from "./middleware/types";

// ==================== Schema ====================
export { model, string, number, boolean, date, schema, column } from "./schema";
