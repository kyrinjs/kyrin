/**
 * Kyrin Framework
 * Entry Point - Example Usage
 */
import { Kyrin } from "./core/kyrin";

const app = new Kyrin({ development: true });

// ✨ Minimal API Example
app.get("/", (c) => c.text("Hello Kyrin! 🚀"));

app.get("/json", (c) => c.json({ message: "Hello World" }));

app.get("/users/:id", (c) => {
  const id = c.param("id");
  return c.json({ id, name: "John Doe" });
});

app.get("/users/:userId/posts/:postId", (c) => {
  return c.json({
    userId: c.param("userId"),
    postId: c.param("postId"),
  });
});

app.post("/users", async (c) => {
  const body = await c.body<{ name: string }>();
  return c.json({ created: body.name }, 201);
});

app.get("/search", (c) => {
  const q = c.query("q");
  return c.json({ query: q });
});

app.listen(3000);
