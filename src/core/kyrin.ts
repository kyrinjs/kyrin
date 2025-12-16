/**
 * Kyrin Framework - Main Application Class
 * Minimal Web Framework for Bun
 */

import type {
  Handler,
  HandlerResponse,
  HttpMethod,
  KyrinConfig,
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

  constructor(config: KyrinConfig = {}) {
    this.router = new Router();
    this.config = {
      port: config.port ?? 3000,
      hostname: config.hostname ?? "localhost",
      development: config.development ?? false,
    };
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

  get(path: string, handler: Handler): this {
    this.router.get(path, handler);
    return this;
  }

  post(path: string, handler: Handler): this {
    this.router.post(path, handler);
    return this;
  }

  put(path: string, handler: Handler): this {
    this.router.put(path, handler);
    return this;
  }

  delete(path: string, handler: Handler): this {
    this.router.delete(path, handler);
    return this;
  }

  patch(path: string, handler: Handler): this {
    this.router.patch(path, handler);
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
      console.error("Handler Error:", error);

      if (this.config.development) {
        // แสดง error details ใน development
        return new Response(`Error: ${error}\n\n${(error as any).stack}`, {
          status: 500,
          headers: { "Content-Type": "text/plain" },
        });
      }

      // ซ่อน details ใน production
      return new Response("Internal Server Error", { status: 500 });
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
