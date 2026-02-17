/**
 * Kyrin Framework - Main Application Class
 * Minimal Web Framework for Bun
 */

import type { ZodSchema, z } from "zod";
import type {
  Handler,
  HandlerResponse,
  HttpMethod,
  KyrinConfig,
  ErrorHandler,
} from "./types";
import type {
  MiddlewareHandler,
  HookHandler,
  KyrinPlugin,
} from "../middleware/types";
import { Router } from "../router/router";
import { Context } from "../context/context";
import { compose } from "../middleware/compose";

/**
 * Kyrin Application
 * Main entry point for creating web applications
 *
 * @example
 * ```typescript
 * const app = new Kyrin();
 * app.use(cors());
 * app.get("/", () => ({ message: "Hello!" }));
 * app.listen(3000);
 * ```
 */
export class Kyrin {
  private router: Router;
  private config: KyrinConfig;
  private middlewares: MiddlewareHandler[] = [];
  private requestHooks: HookHandler[] = [];
  private responseHooks: HookHandler[] = [];
  private errorHandler: ErrorHandler;

  constructor(config: KyrinConfig = {}) {
    this.router = new Router();
    this.config = {
      port: config.port ?? 3000,
      hostname: config.hostname ?? "localhost",
      development: config.development ?? false,
    };
    this.errorHandler = config.onError ?? this.defaultErrorHandler;
  }

  private defaultErrorHandler(error: Error, c: Context): Response {
    console.error("Handler Error:", error);
    if (this.config.development) {
      return new Response(`Error: ${error}\n\n${(error as any).stack}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      });
    }
    return new Response("Internal Server Error", { status: 500 });
  }

  // ==================== Middleware ====================

  /**
   * Add global middleware or plugin
   * @example
   * app.use(cors());
   * app.use(async (c, next) => { await next(); });
   */
  use(middleware: MiddlewareHandler | KyrinPlugin): this {
    if (typeof middleware === "function") {
      this.middlewares.push(middleware);
    } else {
      if (middleware.middleware) this.middlewares.push(middleware.middleware);
      if (middleware.onRequest) this.requestHooks.push(middleware.onRequest);
      if (middleware.onResponse) this.responseHooks.push(middleware.onResponse);
    }
    return this;
  }

  /**
   * Add hook to run before request handler
   * @example
   * app.onRequest((c) => { c.store.start = Date.now(); });
   */
  onRequest(handler: HookHandler): this {
    this.requestHooks.push(handler);
    return this;
  }

  /**
   * Add hook to run after response
   * @example
   * app.onResponse((c) => { console.log(`${Date.now() - c.store.start}ms`); });
   */
  onResponse(handler: HookHandler): this {
    this.responseHooks.push(handler);
    return this;
  }

  /**
   * Group routes with a middleware
   * @example
   * app.guard(auth, (app) => {
   *   app.get("/admin", handler);
   * });
   */
  guard(middleware: MiddlewareHandler, fn: (app: Kyrin) => void): this {
    const guardedApp = new Kyrin();
    fn(guardedApp);

    for (const route of guardedApp.router.getRoutes()) {
      const wrappedHandler: Handler = async (c) => {
        let result: HandlerResponse;
        await middleware(c, async () => {
          result = await route.handler(c);
        });
        return result!;
      };
      this.on(route.method, route.path, wrappedHandler);
    }
    return this;
  }

  // ==================== Route Methods ====================

  get(path: string, handler: Handler): this;
  get<T extends z.ZodTypeAny>(path: string, schema: T, handler: (ctx: Context & { body: () => Promise<z.infer<T>> }) => HandlerResponse): this;
  get(path: string, schemaOrHandler: any, handler?: any): this {
    return this.registerRoute("GET", path, schemaOrHandler, handler);
  }

  post(path: string, handler: Handler): this;
  post<T extends z.ZodTypeAny>(path: string, schema: T, handler: (ctx: Context & { body: () => Promise<z.infer<T>> }) => HandlerResponse): this;
  post(path: string, schemaOrHandler: any, handler?: any): this {
    return this.registerRoute("POST", path, schemaOrHandler, handler);
  }

  put(path: string, handler: Handler): this;
  put<T extends z.ZodTypeAny>(path: string, schema: T, handler: (ctx: Context & { body: () => Promise<z.infer<T>> }) => HandlerResponse): this;
  put(path: string, schemaOrHandler: any, handler?: any): this {
    return this.registerRoute("PUT", path, schemaOrHandler, handler);
  }

  delete(path: string, handler: Handler): this;
  delete<T extends z.ZodTypeAny>(path: string, schema: T, handler: (ctx: Context & { body: () => Promise<z.infer<T>> }) => HandlerResponse): this;
  delete(path: string, schemaOrHandler: any, handler?: any): this {
    return this.registerRoute("DELETE", path, schemaOrHandler, handler);
  }

  patch(path: string, handler: Handler): this;
  patch<T extends z.ZodTypeAny>(path: string, schema: T, handler: (ctx: Context & { body: () => Promise<z.infer<T>> }) => HandlerResponse): this;
  patch(path: string, schemaOrHandler: any, handler?: any): this {
    return this.registerRoute("PATCH", path, schemaOrHandler, handler);
  }

  /**
   * Register route with optional schema validation
   */
  private registerRoute(
    method: HttpMethod,
    path: string,
    schemaOrHandler: any,
    handler?: any
  ): this {
    // If second arg is a Zod schema
    if (schemaOrHandler?._def || schemaOrHandler?.parse) {
      const schema = schemaOrHandler;
      const actualHandler = handler;

      const validatedHandler: Handler = async (c) => {
        const body = await c.body();
        const validated = schema.parse(body);
        // Create new context with validated body
        const validatedCtx = Object.create(c);
        validatedCtx.body = async () => validated;
        return actualHandler(validatedCtx);
      };

      this.router.on(method, path, validatedHandler);
    } else {
      // No schema, normal handler
      this.router.on(method, path, schemaOrHandler);
    }
    return this;
  }

  options(path: string, handler: Handler): this {
    this.router.options(path, handler);
    return this;
  }

  head(path: string, handler: Handler): this {
    this.router.head(path, handler);
    return this;
  }

  all(path: string, handler: Handler): this {
    this.router.all(path, handler);
    return this;
  }

  on(method: HttpMethod, path: string, handler: Handler): this {
    this.router.on(method, path, handler);
    return this;
  }

  /**
   * Serve static files from a directory
   * @example
   * app.static("./public");
   * app.static("./assets", { prefix: "/assets" });
   */
  static(rootPath: string, options: { prefix?: string } = {}): this {
    const prefix = options.prefix ?? "";
    const fs = require("fs");
    const path = require("path");

    const staticHandler: Handler = async (c) => {
      const urlPath = c.path.slice(prefix.length) || "/";
      const filePath = path.join(rootPath, urlPath);
      
      // Security: prevent directory traversal
      if (!filePath.startsWith(path.resolve(rootPath))) {
        return c.notFound();
      }

      try {
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          return c.notFound();
        }
        const file = Bun.file(filePath);
        return new Response(file);
      } catch {
        return c.notFound();
      }
    };

    // Register route for all paths under prefix
    this.get(`${prefix}/*`, staticHandler);
    return this;
  }

  // ==================== Route Groups ====================

  /**
   * Mount a router with a prefix
   * @example
   * app.route("/users", userRouter);
   */
  route(prefix: string, router: Router): this {
    const routes = router.getRoutes();
    for (const route of routes) {
      this.on(route.method, `${prefix}${route.path}`, route.handler);
    }
    return this;
  }

  // ==================== Response Helpers ====================

  private toResponse(result: HandlerResponse, ctx: Context): Response {
    if (result instanceof Response) {
      return result;
    }
    if (typeof result === "string") {
      return new Response(result, {
        status: ctx.set.status,
        headers: { "Content-Type": "text/plain", ...ctx.set.headers },
      });
    }
    if (result === null || result === undefined) {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify(result), {
      status: ctx.set.status,
      headers: { "Content-Type": "application/json", ...ctx.set.headers },
    });
  }

  // ==================== Request Handler ====================

  private async handleRequest(req: Request): Promise<Response> {
    const method = req.method as HttpMethod;
    const url = req.url;

    // Fast path extraction
    const queryIndex = url.indexOf("?");
    const pathStart = url.indexOf("/", 8);
    const path =
      queryIndex === -1
        ? url.slice(pathStart)
        : url.slice(pathStart, queryIndex);

    const result = this.router.match(method, path);

    if (!result) {
      return new Response("Not Found", { status: 404 });
    }

    const ctx = new Context(req, result.params);

    try {
      // Run request hooks
      for (const hook of this.requestHooks) {
        const hookResult = await hook(ctx);
        if (hookResult instanceof Response) return hookResult;
      }

      let response: Response;

      // No middleware - fast path
      if (this.middlewares.length === 0) {
        const handlerResult = await result.handler(ctx);
        response = this.toResponse(handlerResult, ctx);
      } else {
        // With middleware - onion execution
        const composed = compose(this.middlewares);
        const middlewareResponse = await composed(ctx, async () => {
          const handlerResult = await result.handler(ctx);
          return this.toResponse(handlerResult, ctx);
        });
        response =
          middlewareResponse ??
          new Response("Internal Server Error", { status: 500 });
      }

      // Run response hooks
      for (const hook of this.responseHooks) {
        await hook(ctx);
      }

      return response;
    } catch (error) {
      return this.errorHandler(error as Error, ctx);
    }
  }

  // ==================== Server ====================

  /**
   * Start the HTTP server
   */
  listen(port?: number): void {
    const finalPort = port ?? this.config.port!;
    const hostname = this.config.hostname!;

    Bun.serve({
      port: finalPort,
      hostname,
      development: this.config.development,
      fetch: (req) => this.handleRequest(req),
      error: (err) => {
        console.error("Server Error:", err);
        return new Response("Internal Server Error", { status: 500 });
      },
    });

    console.log(`🐲 Kyrin running at http://${hostname}:${finalPort}`);
  }
}
