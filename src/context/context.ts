/**
 * Kyrin Framework - Context
 * Request/Response handling for route handlers
 */

export class Context {
  readonly req: Request;
  private _url?: URL;
  readonly params: Record<string, string>;

  /** Shared store for middleware data */
  store: Record<string, unknown> = {};

  /** Response options (headers, status) */
  set = {
    status: 200,
    headers: {} as Record<string, string>,
  };

  constructor(req: Request, params: Record<string, string> = {}) {
    this.req = req;
    this.params = params;
  }

  // ==================== Request Properties ====================

  /** HTTP Method (GET, POST, etc.) */
  get method(): string {
    return this.req.method;
  }

  /** Request pathname */
  get path(): string {
    return this.url.pathname;
  }

  /** All request headers */
  get headers(): Headers {
    return this.req.headers;
  }

  // ==================== Request Helpers ====================

  /** Get a specific request header */
  header(name: string): string | null {
    return this.req.headers.get(name);
  }

  /** Get path parameter (e.g., :id) */
  param(key: string): string | null {
    return this.sanitize(this.params[key] ?? null);
  }

  /** Get query parameter (e.g., ?page=1) */
  query(key: string): string | null {
    return this.sanitize(this.url.searchParams.get(key));
  }

  /** Get all query parameters */
  queryAll(): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of this.url.searchParams) {
      const sanitized = this.sanitize(value);
      if (sanitized !== null) {
        result[key] = sanitized;
      } else {
        result[key] = "";
      }
    }
    return result;
  }

  /** Check if query parameter exists */
  hasQuery(key: string): boolean {
    return this.url.searchParams.has(key);
  }

  /** Escape HTML special chars to prevent XSS */
  private sanitize(value: string | null): string | null {
    if (value === null) return null;
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;");
  }

  // ==================== Body Parsing ====================

  /**
   * Parse request body as JSON
   * @example
   * const data = await c.body<{ name: string }>();
   * const { name, email } = await c.body();
   */
  async body<T = unknown>(): Promise<T> {
    return (await this.req.json()) as T;
  }

  /** Get request body as raw text */
  async text(): Promise<string> {
    return await this.req.text();
  }

  /** Get request body as FormData */
  async formData() {
    return await this.req.formData();
  }

  // ==================== Response Helpers ====================

  /** Send JSON response */
  json<T = unknown>(data: T, status?: number): Response {
    return new Response(JSON.stringify(data), {
      status: status ?? this.set.status,
      headers: { "Content-Type": "application/json", ...this.set.headers },
    });
  }

  /** Send plain text response */
  send(data: string, status?: number): Response {
    return new Response(data, {
      status: status ?? this.set.status,
      headers: { "Content-Type": "text/plain", ...this.set.headers },
    });
  }

  /** Send HTML response */
  html(data: string, status?: number): Response {
    return new Response(data, {
      status: status ?? this.set.status,
      headers: { "Content-Type": "text/html", ...this.set.headers },
    });
  }

  /** Redirect to another URL */
  redirect(url: string, status = 302): Response {
    return new Response(null, {
      status,
      headers: { Location: url },
    });
  }

  /** Return 404 Not Found */
  notFound(): Response {
    return new Response("Not Found", { status: 404 });
  }

  // ==================== Private ====================

  private get url(): URL {
    return (this._url ??= new URL(this.req.url));
  }
}
