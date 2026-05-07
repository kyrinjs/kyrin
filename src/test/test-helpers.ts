import type { Handler, HandlerResponse, HttpMethod, KyrinConfig } from "../core/types";
import type { MiddlewareHandler } from "../middleware/types";
import { Router } from "../router/router";
import { Context } from "../context/context";
import { compose } from "../middleware/compose";

export interface TestRequest {
  method: HttpMethod;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface TestResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export class TestClient {
  private app: TestKyrin;

  constructor(app: TestKyrin) {
    this.app = app;
  }

  async get(path: string, headers?: Record<string, string>): Promise<TestResponse> {
    return this.app.fetch("GET", path, headers);
  }

  async post(path: string, body?: unknown, headers?: Record<string, string>): Promise<TestResponse> {
    return this.app.fetch("POST", path, headers, body);
  }

  async put(path: string, body?: unknown, headers?: Record<string, string>): Promise<TestResponse> {
    return this.app.fetch("PUT", path, headers, body);
  }

  async delete(path: string, headers?: Record<string, string>): Promise<TestResponse> {
    return this.app.fetch("DELETE", path, headers);
  }

  async patch(path: string, body?: unknown, headers?: Record<string, string>): Promise<TestResponse> {
    return this.app.fetch("PATCH", path, headers, body);
  }
}

export class TestKyrin {
  private router: Router;
  private middlewares: MiddlewareHandler[] = [];
  private requestHooks: ((c: Context) => void | Response | Promise<void | Response>)[] = [];

  constructor() {
    this.router = new Router();
  }

  use(middleware: MiddlewareHandler): this {
    this.middlewares.push(middleware);
    return this;
  }

  onRequest(handler: (c: Context) => void | Response | Promise<void | Response>): this {
    this.requestHooks.push(handler);
    return this;
  }

  get(path: string, handler: Handler): this {
    this.router.on("GET", path, handler);
    return this;
  }

  post(path: string, handler: Handler): this {
    this.router.on("POST", path, handler);
    return this;
  }

  put(path: string, handler: Handler): this {
    this.router.on("PUT", path, handler);
    return this;
  }

  delete(path: string, handler: Handler): this {
    this.router.on("DELETE", path, handler);
    return this;
  }

  patch(path: string, handler: Handler): this {
    this.router.on("PATCH", path, handler);
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

  getClient(): TestClient {
    return new TestClient(this);
  }

  private toResponse(result: HandlerResponse, ctx: Context): Response {
    if (result instanceof Response) return result;
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

  async fetch(
    method: HttpMethod,
    path: string,
    headers: Record<string, string> = {},
    body?: unknown
  ): Promise<TestResponse> {
    let urlString: string;
    if (path.includes("?")) {
      const [pathOnly, query] = path.split("?");
      const urlObj = new URL(`http://localhost${pathOnly}`);
      urlObj.search = query ?? "";
      urlString = urlObj.toString();
    } else {
      urlString = `http://localhost${path}`;
    }
    const reqHeaders = new Headers(headers);

    let request: Request;
    if (body !== undefined) {
      reqHeaders.set("Content-Type", "application/json");
      request = new Request(urlString, {
        method,
        headers: reqHeaders,
        body: JSON.stringify(body),
      });
    } else {
      request = new Request(urlString, { method, headers: reqHeaders });
    }

    const result = this.router.match(method, path);
    if (!result) {
      return {
        status: 404,
        headers: {},
        body: null,
      };
    }

    const ctx = new Context(request, result.params ?? {});

    for (const hook of this.requestHooks) {
      const hookResult = await hook(ctx);
      if (hookResult instanceof Response) {
        return await this.responseToTestResponse(hookResult);
      }
    }

    let response: Response;
    if (this.middlewares.length === 0) {
      const handlerResult = await result.handler(ctx);
      response = this.toResponse(handlerResult, ctx);
    } else {
      const composed = compose(this.middlewares);
      const middlewareResponse = await composed(ctx, async () => {
        const handlerResult = await result.handler(ctx);
        return this.toResponse(handlerResult, ctx);
      });
      response = middlewareResponse ?? new Response("Internal Server Error", { status: 500 });
    }

    return await this.responseToTestResponse(response);
  }

  private async responseToTestResponse(res: Response): Promise<TestResponse> {
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => (headers[k] = v));
    const contentType = res.headers.get("content-type") ?? "";
    let body: unknown;
    if (contentType.includes("application/json")) {
      const text = await res.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    } else {
      body = await res.text();
    }
    return {
      status: res.status,
      headers,
      body,
    };
  }
}

export function createApp(): TestKyrin {
  return new TestKyrin();
}

export function expectStatus(status: number) {
  return {
    toBe(expected: number) {
      if (status !== expected) {
        throw new Error(`Expected status ${expected}, got ${status}`);
      }
    },
  };
}

export function expectBody(body: unknown) {
  return {
    toEqual(expected: unknown) {
      if (JSON.stringify(body) !== JSON.stringify(expected)) {
        throw new Error(`Expected body ${JSON.stringify(expected)}, got ${JSON.stringify(body)}`);
      }
    },
    toContain(expected: string) {
      if (typeof body !== "string" || !body.includes(expected)) {
        throw new Error(`Expected body to contain "${expected}"`);
      }
    },
  };
}