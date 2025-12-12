/**
 * Kyrin Framework - Main Entry Point
 *
 * Minimal Web Framework for Bun
 */

import type { Handler, HttpMethod, KyrinConfig } from "./types";
import { Router } from "@/router/router";
import { Context } from "@/context";

export class Kyrin {
  private router: Router;
  private config: KyrinConfig;

  constructor(config: KyrinConfig = {}) {
    this.router = new Router();
    this.config = {
      port: config.port ?? 3000,
      hostname: config.hostname ?? "localhost",
      development: config.development ?? false,
    };
  }

  // ==================== Routing Methods ====================
  /**
   * Register a GET route
   * @example app.get('/users', (c) => c.json({ users: [] }))
   */
  get(path: string, handler: Handler): this {
    this.router.get(path, handler);
    return this;
  }

  /**
   * Register a POST route
   * @example app.post('/users', async (c) => { const body = await c.body(); return c.json(body, 201); })
   */
  post(path: string, handler: Handler): this {
    this.router.post(path, handler);
    return this;
  }

  /**
   * Register a PUT route
   */
  put(path: string, handler: Handler): this {
    this.router.put(path, handler);
    return this;
  }

  /**
   * Register a DELETE route
   */
  delete(path: string, handler: Handler): this {
    this.router.delete(path, handler);
    return this;
  }

  /**
   * Register a PATCH route
   */
  patch(path: string, handler: Handler): this {
    this.router.patch(path, handler);
    return this;
  }

  /**
   * Register an OPTIONS route
   */
  options(path: string, handler: Handler): this {
    this.router.options(path, handler);
    return this;
  }

  /**
   * Register a HEAD route
   */
  head(path: string, handler: Handler): this {
    this.router.head(path, handler);
    return this;
  }

  /**
   * Register a route for all HTTP methods
   * @example app.all('/health', (c) => c.text('OK'))
   */
  all(path: string, handler: Handler): this {
    this.router.all(path, handler);
    return this;
  }

  /**
   * Register a route with custom HTTP method
   * @example app.on('CUSTOM', '/endpoint', handler)
   */
  on(method: HttpMethod, path: string, handler: Handler): this {
    this.router.on(method, path, handler);
    return this;
  }

  // ==================== Request Handler ====================
  /**
   * Handle incoming request
   */
  private async handleRequest(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const method = req.method as HttpMethod;
    const path = url.pathname;

    // Match route
    const result = this.router.match(method, path);

    if (result) {
      // สร้าง Context พร้อม params จาก router
      const ctx = new Context(req, result.params);

      try {
        return await result.handler(ctx);
      } catch (error) {
        console.error("Handler Error:", error);
        return new Response("Internal Server Error", { status: 500 });
      }
    }

    // 404 Not Found
    return new Response("Not Found", { status: 404 });
  }

  // ==================== Server ====================
  /**
   * Start the server
   * @param port - Optional port override
   * @example app.listen(3000)
   */
  listen(port?: number): void {
    const finalPort = port ?? this.config.port!;
    const hostname = this.config.hostname!;

    const server = Bun.serve({
      port: finalPort,
      hostname: hostname,
      development: this.config.development,
      fetch: (req) => this.handleRequest(req),
      error: (err) => {
        console.error("Server Error:", err);
        return new Response("Internal Server Error", { status: 500 });
      },
    });

    console.log(`🚀 Kyrin running at http://${hostname}:${finalPort}`);
  }
}
