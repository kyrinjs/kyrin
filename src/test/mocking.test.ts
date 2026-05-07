import { describe, test, expect } from "bun:test";
import { spy, stub, MockDatabase, MockResponse, mockRequest, createMockContext } from "./mocking";

describe("Mocking Utilities", () => {
  describe("spy", () => {
    test("should track calls", () => {
      const fn = spy((a: number, b: number) => a + b);
      fn(1, 2);
      fn(3, 4);

      expect(fn.mock.calls.length).toBe(2);
      expect(fn.mock.calls[0]).toEqual([1, 2]);
      expect(fn.mock.calls[1]).toEqual([3, 4]);
    });

    test("should return configured value", () => {
      const fn = spy(() => "default");
      fn.mockReturnValue("custom");

      expect(fn()).toBe("custom");
    });

    test("should resolve promise", async () => {
      const fn = spy(async () => "async");
      fn.mockResolvedValue("resolved");

      const result = await fn();
      expect(result).toBe("resolved");
    });

    test("should reject promise", async () => {
      const fn = spy(async () => "async");
      fn.mockRejectedValue(new Error("fail"));

      await expect(fn()).rejects.toThrow("fail");
    });

    test("should use implementation", () => {
      const fn = spy(() => "original");
      fn.mockImplementation(() => "mocked");

      expect(fn()).toBe("mocked");
    });

    test("should reset", () => {
      const fn = spy((x: number) => x);
      fn(1);
      fn(2);
      fn.reset();

      expect(fn.mock.calls.length).toBe(0);
    });
  });

  describe("stub", () => {
    test("should return stub for any property", () => {
      const s = stub<{ foo: { bar: string } }>();
      expect(s.foo.bar).toBeDefined();
    });

    test("should have mock property", () => {
      const s = stub<{ mock: { calls: number[] } }>();
      expect(s.mock.calls).toEqual([]);
    });
  });

  describe("MockDatabase", () => {
    test("should return empty array when no data", async () => {
      const db = new MockDatabase();
      const result = await db.from("users").all();
      expect(result).toEqual([]);
    });

    test("should insert and retrieve data", async () => {
      const db = new MockDatabase();
      const user = await db.from("users").insert({ name: "John" });
      expect(user.name).toBe("John");
      expect(user.id).toBe(1);
    });

    test("should query with where clause", async () => {
      const db = new MockDatabase();
      await db.from("users").insert({ name: "John" });
      await db.from("users").insert({ name: "Jane" });

      const user = await db.from("users").where("name", "John").first();
      expect(user?.name).toBe("John");
    });

    test("should clear all data", () => {
      const db = new MockDatabase();
      db.setTableData("users", [{ id: 1, name: "John" }]);
      db.clear();

      expect(db.from("users").all()).resolves.toEqual([]);
    });
  });

  describe("MockResponse", () => {
    test("should build response with status", () => {
      const res = new MockResponse().status(404).build();
      expect(res.status).toBe(404);
    });

    test("should build JSON response", () => {
      const res = new MockResponse().json({ hello: "world" }).build();
      expect(res.headers.get("Content-Type")).toBe("application/json");
    });

    test("should build text response", () => {
      const res = new MockResponse().text("hello").build();
      expect(res.headers.get("Content-Type")).toBe("text/plain");
    });

    test("should set custom headers", () => {
      const res = new MockResponse().header("X-Custom", "value").build();
      expect(res.headers.get("X-Custom")).toBe("value");
    });
  });

  describe("mockRequest", () => {
    test("should create request with defaults", () => {
      const req = mockRequest();
      expect(req.method).toBe("GET");
      expect(req.headers.get("Content-Type")).toBe("application/json");
    });

    test("should override request properties", () => {
      const req = mockRequest({ method: "POST" });
      expect(req.method).toBe("POST");
    });
  });

  describe("createMockContext", () => {
    test("should create context with defaults", () => {
      const ctx = createMockContext();
      expect(ctx.path).toBe("/");
      expect(ctx.method).toBe("GET");
      expect(ctx.params).toEqual({});
    });

    test("should create context with overrides", () => {
      const ctx = createMockContext({
        path: "/users/123",
        method: "POST",
        params: { id: "123" },
        body: { name: "John" },
      });

      expect(ctx.path).toBe("/users/123");
      expect(ctx.method).toBe("POST");
      expect(ctx.params).toEqual({ id: "123" });
    });
  });
});