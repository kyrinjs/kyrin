import { describe, test, expect } from "bun:test";
import { createApp } from "./test-helpers";

describe("TestKyrin - Unit Test Helpers", () => {
  test("should create app and register GET route", async () => {
    const app = createApp();
    app.get("/hello", () => ({ message: "Hello World" }));

    const client = app.getClient();
    const res = await client.get("/hello");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Hello World" });
  });

  test("should return 404 for unknown route", async () => {
    const app = createApp();
    app.get("/exists", () => ({ ok: true }));

    const client = app.getClient();
    const res = await client.get("/unknown");

    expect(res.status).toBe(404);
  });

  test("should handle POST request with body", async () => {
    const app = createApp();
    app.post("/users", (c) => c.body());

    const client = app.getClient();
    const res = await client.post("/users", { name: "John" });

    expect(res.status).toBe(200);
  });

  test("should handle PUT request", async () => {
    const app = createApp();
    app.put("/users/:id", (c) => ({ id: c.params.id, updated: true }));

    const client = app.getClient();
    const res = await client.put("/users/123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: "123", updated: true });
  });

  test("should handle DELETE request", async () => {
    const app = createApp();
    app.delete("/users/:id", (c) => ({ deleted: true }));

    const client = app.getClient();
    const res = await client.delete("/users/456");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ deleted: true });
  });

  test("should handle PATCH request", async () => {
    const app = createApp();
    app.patch("/users/:id", (c) => ({ patched: true }));

    const client = app.getClient();
    const res = await client.patch("/users/789", { name: "Jane" });

    expect(res.status).toBe(200);
  });

  test("should work with middleware", async () => {
    const app = createApp();
    app.use(async (c, next) => {
      c.set.headers["X-Custom"] = "header";
      await next();
    });
    app.get("/test", () => ({ ok: true }));

    const client = app.getClient();
    const res = await client.get("/test");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  test("should return string response", async () => {
    const app = createApp();
    app.get("/text", () => "Plain text response");

    const client = app.getClient();
    const res = await client.get("/text");

    expect(res.status).toBe(200);
    expect(res.body).toBe("Plain text response");
  });

  test("should return null response with 204", async () => {
    const app = createApp();
    app.get("/empty", () => null);

    const client = app.getClient();
    const res = await client.get("/empty");

    expect(res.status).toBe(204);
  });

  test("should handle onRequest hook", async () => {
    const app = createApp();
    app.onRequest((c) => {
      if (c.path === "/blocked") {
        return new Response("Blocked", { status: 403 });
      }
    });
    app.get("/allowed", () => ({ ok: true }));

    const client = app.getClient();
    const res = await client.get("/blocked");

    expect(res.status).toBe(403);
  });
});