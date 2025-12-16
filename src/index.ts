/**
 * Kyrin Framework - Main Entry Point
 */
export { Kyrin } from "./core/kyrin";
export type { Handler, HandlerResponse, HttpMethod, KyrinConfig } from "./core/types";
export { Router } from "./router/router";
export { Context } from "./context/context";
export type { MiddlewareHandler, HookHandler, KyrinPlugin } from "./middleware/types";

// ==================== Example Usage ====================
import { Kyrin } from "./core/kyrin";

const app = new Kyrin({ development: true });

// ✨ Minimal API Examples

// Auto JSON - just return an object!
app.get("/", () => ({ message: "Hello Kyrin! 🚀" }));

// Auto Text - just return a string!
app.get("/text", () => "Hello World!");

// Traditional way - still works!
app.get("/json", (c) => c.json({ status: "ok" }));

// Path params with destructuring
app.get("/users/:id", (c) => ({
  id: c.param("id"),
  name: "John Doe",
}));

// Nested params
app.get("/users/:userId/posts/:postId", (c) => ({
  userId: c.param("userId"),
  postId: c.param("postId"),
}));

// Query params
app.get("/search", (c) => ({
  query: c.query("q"),
  page: c.query("page") ?? "1",
}));

// POST with body
app.post("/users", async (c) => {
  const body = await c.body<{ name: string }>();
  return c.json({ created: body.name }, 201);
});

// Redirect
app.get("/old", (c) => c.redirect("/"));

// 204 No Content - return null
app.delete("/users/:id", () => null);

app.listen(3000);
