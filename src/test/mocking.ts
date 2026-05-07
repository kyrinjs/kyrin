export interface MockFunction<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  mock: MockCalls<T>;
  _returnValue?: ReturnType<T>;
  _resolvedValue?: Awaited<ReturnType<T>>;
  _rejectedValue?: Error;
  _implementation?: T | null;
  mockReturnValue(value: ReturnType<T>): this;
  mockResolvedValue(value: Awaited<ReturnType<T>>): this;
  mockRejectedValue(error: Error): this;
  mockImplementation(fn: T): this;
  reset(): void;
  restore(): void;
}

interface MockCalls<T extends (...args: any[]) => any> {
  calls: Parameters<T>[];
  results: { value: ReturnType<T> }[];
  instances: unknown[];
}

export function spy<T extends (...args: any[]) => any>(
  fn?: T
): MockFunction<T> {
  const mockFn = function (...args: Parameters<T>): ReturnType<T> {
    mockFn.mock.calls.push(args);
    if (mockFn._returnValue !== undefined) {
      mockFn.mock.results.push({ value: mockFn._returnValue });
      return mockFn._returnValue as ReturnType<T>;
    }
    if (mockFn._resolvedValue !== undefined) {
      const promise = Promise.resolve(mockFn._resolvedValue);
      mockFn.mock.results.push({ value: promise as any });
      return promise as ReturnType<T>;
    }
    if (mockFn._rejectedValue !== undefined) {
      const promise = Promise.reject(mockFn._rejectedValue);
      mockFn.mock.results.push({ value: promise as any });
      return promise as ReturnType<T>;
    }
    if (mockFn._implementation) {
      const result = mockFn._implementation(...args);
      mockFn.mock.results.push({ value: result });
      return result;
    }
    mockFn.mock.results.push({ value: undefined as any });
    return undefined as ReturnType<T>;
  } as MockFunction<T>;

  mockFn.mock = {
    calls: [],
    results: [],
    instances: [],
  };

  mockFn._returnValue = undefined;
  mockFn._resolvedValue = undefined;
  mockFn._rejectedValue = undefined;
  mockFn._implementation = fn ?? null;

  mockFn.mockReturnValue = function (value: ReturnType<T>) {
    mockFn._returnValue = value;
    return mockFn;
  };

  mockFn.mockResolvedValue = function (value: Awaited<ReturnType<T>>) {
    mockFn._resolvedValue = value;
    return mockFn;
  };

  mockFn.mockRejectedValue = function (error: Error) {
    mockFn._rejectedValue = error;
    return mockFn;
  };

  mockFn.mockImplementation = function (fn: T) {
    mockFn._implementation = fn;
    return mockFn;
  };

  mockFn.reset = function () {
    mockFn.mock.calls = [];
    mockFn.mock.results = [];
    mockFn.mock.instances = [];
  };

  mockFn.restore = function () {
    mockFn._returnValue = undefined;
    mockFn._resolvedValue = undefined;
    mockFn._rejectedValue = undefined;
    mockFn._implementation = null;
  };

  return mockFn;
}

export function stub<T>(): T {
  const mockObj = {
    mock: {
      calls: [] as any[],
      results: [] as any[],
    },
  };

  return new Proxy(
    mockObj,
    {
      get(target, prop) {
        if (prop === "mock") {
          return target.mock;
        }
        return (...args: any[]) => {
          target.mock.calls.push(args);
          target.mock.results.push({ value: undefined });
          return undefined as any;
        };
      },
    }
  ) as T;
}

export class MockDatabase {
  private tables: Map<string, any[]> = new Map();

  from(table: string) {
    return {
      all: () => Promise.resolve(this.tables.get(table) ?? []),
      first: () => {
        const rows = this.tables.get(table) ?? [];
        return Promise.resolve(rows[0] ?? null);
      },
      insert: (data: any) => {
        const rows = this.tables.get(table) ?? [];
        const newRow = { id: rows.length + 1, ...data };
        rows.push(newRow);
        this.tables.set(table, rows);
        return Promise.resolve(newRow);
      },
      where: (field: string, value: any) => {
        const rows = this.tables.get(table) ?? [];
        return {
          first: () => Promise.resolve(rows.find((r) => r[field] === value) ?? null),
          all: () => Promise.resolve(rows.filter((r) => r[field] === value)),
        };
      },
    };
  }

  setTableData(table: string, data: any[]) {
    this.tables.set(table, data);
  }

  clear() {
    this.tables.clear();
  }
}

export class MockResponse {
  private _status: number = 200;
  private _headers: Record<string, string> = {};
  private _body: unknown = null;

  status(code: number): this {
    this._status = code;
    return this;
  }

  json(data: unknown): this {
    this._headers["Content-Type"] = "application/json";
    this._body = data;
    return this;
  }

  text(data: string): this {
    this._headers["Content-Type"] = "text/plain";
    this._body = data;
    return this;
  }

  header(key: string, value: string): this {
    this._headers[key] = value;
    return this;
  }

  build(): Response {
    return new Response(this._body === null ? null : JSON.stringify(this._body), {
      status: this._status,
      headers: this._headers,
    });
  }
}

export function mockRequest(overrides: Partial<Request> = {}): Request {
  const defaultHeaders = new Headers({
    "Content-Type": "application/json",
  });

  return new Request("http://localhost/", {
    method: "GET",
    headers: defaultHeaders,
    ...overrides,
  });
}

export function createMockContext(overrides: {
  path?: string;
  method?: string;
  params?: Record<string, string>;
  body?: unknown;
} = {}) {
  const method = overrides.method ?? "GET";
  const req = mockRequest({ method });

  return {
    req,
    method,
    params: overrides.params ?? {},
    store: {} as Record<string, unknown>,
    set: {
      status: 200,
      headers: {} as Record<string, string>,
    },
    path: overrides.path ?? "/",
    query: (key: string) => null,
    param: (key: string) => null,
    body: async () => overrides.body ?? {},
    json: (data: unknown, status?: number) => new Response(JSON.stringify(data), { status: status ?? 200 }),
    send: (data: string, status?: number) => new Response(data, { status: status ?? 200 }),
    notFound: () => new Response("Not Found", { status: 404 }),
  };
}