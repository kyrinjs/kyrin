/**
 * Kyrin Framework - Examples
 * Usage examples for the Kyrin framework
 *
 * @example
 * ```typescript
 * import { Kyrin, schema, string, column, model } from "kyrin";
 *
 * const app = new Kyrin({ development: true });
 *
 * // Auto JSON - just return an object!
 * app.get("/", () => ({ message: "Hello Kyrin!" }));
 *
 * // Auto Text - just return a string!
 * app.get("/text", () => "Hello World!");
 *
 * // Traditional way - still works!
 * app.get("/json", (c) => c.json({ status: "ok" }));
 *
 * // Path params with destructuring
 * app.get("/users/:id", (c) => ({
 *   id: c.param("id"),
 *   name: "John Doe",
 * }));
 *
 * // Nested params
 * app.get("/users/:userId/posts/:postId", (c) => ({
 *   userId: c.param("userId"),
 *   postId: c.param("postId"),
 * }));
 *
 * // Query params
 * app.get("/search", (c) => ({
 *   query: c.query("q"),
 *   page: c.query("page") ?? "1",
 * }));
 *
 * // POST with body validation
 * app.post("/users", async (c) => {
 *   const body = await c.body(schema({
 *     name: string()
 *   })) as { name: string };
 *   return c.json({ created: body.name }, 201);
 * });
 *
 * // Database model example
 * const User = model("users", {
 *   id: column.number().pk(),
 *   name: column.string(),
 *   email: column.string().optional()
 * });
 *
 * // Redirect
 * app.get("/old", (c) => c.redirect("/"));
 *
 * // 204 No Content - return null
 * app.delete("/users/:id", () => null);
 *
 * app.listen(3000);
 * ```
 */

import { Kyrin } from "./core/kyrin";
import { schema, string, column, model } from "./schema";

const app = new Kyrin({ development: true });

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

// POST with body validation
app.post("/users", async (c) => {
  const body = await c.body(schema({
    name: string()
  })) as { name: string };
  return c.json({ created: body.name }, 201);
});

// Database model example
const User = model("users", {
  id: column.number().pk(),
  name: column.string(),
  email: column.string().optional()
});

// Redirect
app.get("/old", (c) => c.redirect("/"));

// 204 No Content - return null
app.delete("/users/:id", () => null);

app.listen(3000);