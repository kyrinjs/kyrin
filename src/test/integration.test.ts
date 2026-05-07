import { describe, test, expect } from "bun:test";
import { createApp } from "./test-helpers";

describe("Integration Testing - Router & Context", () => {
  test("should match dynamic route params", async () => {
    const app = createApp();
    app.get("/users/:id", (c) => ({ userId: c.param("id") }));

    const client = app.getClient();
    const res = await client.get("/users/123");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ userId: "123" });
  });

  test("should match multiple params", async () => {
    const app = createApp();
    app.get("/posts/:postId/comments/:commentId", (c) => ({
      postId: c.param("postId"),
      commentId: c.param("commentId"),
    }));

    const client = app.getClient();
    const res = await client.get("/posts/5/comments/10");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ postId: "5", commentId: "10" });
  });

  test("should handle empty query string", async () => {
    const app = createApp();
    app.get("/search", (c) => ({ query: c.query("q"), hasQuery: c.hasQuery("q") }));

    const client = app.getClient();
    const res = await client.get("/search");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ query: null, hasQuery: false });
  });

  test("should handle JSON body parsing", async () => {
    const app = createApp();
    app.post("/api/data", async (c) => {
      const body = await c.body();
      return { received: body };
    });

    const client = app.getClient();
    const res = await client.post("/api/data", { name: "test", value: 123 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: { name: "test", value: 123 } });
  });

  test("should chain multiple middlewares", async () => {
    const app = createApp();
    let order: string[] = [];

    app.use(async (c, next) => {
      order.push("1-start");
      await next();
      order.push("1-end");
    });

    app.use(async (c, next) => {
      order.push("2-start");
      await next();
      order.push("2-end");
    });

    app.get("/chain", () => ({ ok: true }));

    const client = app.getClient();
    const res = await client.get("/chain");

    expect(res.status).toBe(200);
    expect(order).toEqual(["1-start", "2-start", "2-end", "1-end"]);
  });

  test("should handle POST with empty body", async () => {
    const app = createApp();
    app.post("/api/data", async (c) => ({ received: true }));

    const client = app.getClient();
    const res = await client.post("/api/data");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
  });

  test("should handle route with wildcard", async () => {
    const app = createApp();
    app.get("/files/*", (c) => ({ path: c.path }));

    const client = app.getClient();
    const res = await client.get("/files/docs/readme.pdf");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ path: "/files/docs/readme.pdf" });
  });

  test("should handle multiple routes", async () => {
    const app = createApp();
    app.get("/users", () => ({ users: [] }));
    app.get("/users/:id", (c) => ({ id: c.param("id") }));
    app.post("/users", () => ({ created: true }));
    app.delete("/users/:id", (c) => ({ deleted: c.param("id") }));

    const client = app.getClient();

    expect((await client.get("/users")).body).toEqual({ users: [] });
    expect((await client.get("/users/5")).body).toEqual({ id: "5" });
    expect((await client.post("/users")).body).toEqual({ created: true });
    expect((await client.delete("/users/5")).body).toEqual({ deleted: "5" });
  });

  test("should handle middleware that short-circuits", async () => {
    const app = createApp();
    app.use(async (c, next) => {
      return new Response("Blocked", { status: 403 });
    });
    app.get("/secret", () => ({ secret: "data" }));

    const client = app.getClient();
    const res = await client.get("/secret");

    expect(res.status).toBe(403);
    expect(res.body).toBe("Blocked");
  });

  test("should handle 404 for unmatched route", async () => {
    const app = createApp();
    app.get("/exists", () => ({ exists: true }));

    const client = app.getClient();
    const res = await client.get("/does-not-exist");

    expect(res.status).toBe(404);
  });
});