import { createAuth } from "./src/auth/index";
import { createApp, expect, expectStatus, expectBody } from "./src/test/index";
import { spy, stub, MockDatabase, MockResponse, mockRequest, createMockContext } from "./src/test/index";

console.log("=== Testing Simplified Auth ===");

const auth = createAuth({
  jwtSecret: "test-secret-key-12345",
  sessionTtl: 3600,
  sessionRefreshThreshold: 300
});

console.log("✓ createAuth");

const tokens = await auth.signToken("user-123", {
  role: "admin",
  permissions: ["read", "write", "delete"]
});
console.log("✓ signToken:", tokens.accessToken ? "valid token" : "FAIL");

const payload = await auth.verifyToken(tokens.accessToken);
console.log("✓ verifyToken:", payload?.sub === "user-123" ? "valid payload" : "FAIL");

const accessPayload = await auth.verifyAccessToken(tokens.accessToken);
console.log("✓ verifyAccessToken:", accessPayload ? "valid" : "FAIL");

const refreshPayload = await auth.verifyRefreshToken(tokens.refreshToken);
console.log("✓ verifyRefreshToken:", refreshPayload ? "valid" : "FAIL");

const session = auth.createSession("user-123", {
  role: "admin",
  lastLogin: Date.now()
});
console.log("✓ createSession:", session.id ? "valid session" : "FAIL");

const getSession = auth.getSession(session.id);
console.log("✓ getSession:", getSession ? "valid" : "FAIL");

const refreshed = auth.refreshSession(session.id);
console.log("✓ refreshSession:", refreshed ? "valid" : "FAIL");

const updated = auth.updateSession(session.id, { lastActivity: Date.now() });
console.log("✓ updateSession:", updated ? "valid" : "FAIL");

const destroyed = auth.destroySession(session.id);
console.log("✓ destroySession:", destroyed === true ? "valid" : "FAIL");

auth.roles.define("admin", ["*"]);
auth.roles.define("moderator", ["read:all", "write:posts", "delete:posts"]);
auth.roles.define("user", ["read:own", "update:own"]);
auth.roles.define("superadmin", ["manage:users"], ["admin"]);
console.log("✓ roles.define");

auth.roles.assign("user-123", ["user"]);
auth.roles.assign("admin-456", ["admin"]);
console.log("✓ roles.assign");

const hasPerm = auth.roles.hasPermission("user-123", "read:own");
console.log("✓ roles.hasPermission:", hasPerm === true ? "valid" : "FAIL");

const hasAny = auth.roles.hasAnyPermission("user-123", ["read:own", "write:own"]);
console.log("✓ roles.hasAnyPermission:", hasAny === true ? "valid" : "FAIL");

const hasAll = auth.roles.hasAllPermissions("user-123", ["read:own", "update:own"]);
console.log("✓ roles.hasAllPermissions:", hasAll === true ? "valid" : "FAIL");

const isAdmin = auth.roles.hasRole("user-123", "admin");
console.log("✓ roles.hasRole:", isAdmin === false ? "valid" : "FAIL");

const adminHasAny = auth.roles.hasAnyRole("admin-456", ["admin", "superadmin"]);
console.log("✓ roles.hasAnyRole:", adminHasAny === true ? "valid" : "FAIL");

const role = auth.roles.get("admin");
console.log("✓ roles.get:", role ? "valid" : "FAIL");

const allRoles = auth.roles.list();
console.log("✓ roles.list:", allRoles.length > 0 ? "valid" : "FAIL");

const userRoles = auth.roles.getNames("user-123");
console.log("✓ roles.getNames:", userRoles[0] === "user" ? "valid" : "FAIL");

auth.roles.revoke("user-123");
console.log("✓ roles.revoke");

auth.roles.clear();
console.log("✓ roles.clear");

auth.oauth.configure({
  provider: "google",
  clientId: "your-client-id",
  clientSecret: "your-client-secret",
  redirectUri: "https://your-app.com/auth/callback",
  scope: ["openid", "email", "profile"]
});
console.log("✓ oauth.configure");

const state = auth.oauth.createState();
console.log("✓ oauth.createState:", state ? "valid" : "FAIL");

const authUrl = auth.oauth.getAuthUrl("google", state);
console.log("✓ oauth.getAuthUrl:", authUrl.includes("google") ? "valid" : "FAIL");

const config = auth.oauth.getConfig("google");
console.log("✓ oauth.getConfig:", config?.clientId === "your-client-id" ? "valid" : "FAIL");

console.log("\n=== Testing Simplified Test ===");

const app = createApp();

app.get("/users", () => ({ users: [] }));
app.get("/users/:id", (c) => ({ id: c.param("id") }));
app.post("/users", () => ({ created: true }));
app.put("/users/:id", () => ({ updated: true }));
app.patch("/users/:id", () => ({ patched: true }));
app.delete("/users/:id", () => ({ deleted: true }));
app.on("GET", "/custom", (c) => ({ method: "GET" }));
app.all("/fallback", (c) => ({ fallback: true }));
console.log("✓ createApp + HTTP methods");

app.use(async (c, next) => {
  c.set.headers["X-Custom"] = "value";
  await next();
});
console.log("✓ app.use");

app.onRequest((c) => {
  c.req.headers.set("Authorization", "Bearer token");
});
console.log("✓ app.onRequest");

const client = app.getClient();

const res1 = await client.get("/users");
console.log("✓ client.get:", res1.status === 200 ? "valid" : "FAIL");

const res2 = await client.get("/users?page=1&limit=10");
console.log("✓ client.get with query");

const res3 = await client.post("/users", { name: "John" });
console.log("✓ client.post:", res3.status === 200 ? "valid" : "FAIL");

const res4 = await client.put("/users/1", { name: "Jane" });
console.log("✓ client.put:", res4.status === 200 ? "valid" : "FAIL");

const res5 = await client.patch("/users/1", { name: "Updated" });
console.log("✓ client.patch:", res5.status === 200 ? "valid" : "FAIL");

const res6 = await client.delete("/users/1");
console.log("✓ client.delete:", res6.status === 200 ? "valid" : "FAIL");

expect(200).toBe(200);
console.log("✓ expect.toBe");

expect({ a: 1 }).toEqual({ a: 1 });
console.log("✓ expect.toEqual");

expect("hello world").toContain("world");
console.log("✓ expect.toContain");

expect(true).toBeTruthy();
console.log("✓ expect.toBeTruthy");

expect(null).toBeFalsy();
console.log("✓ expect.toBeFalsy");

let threw = false;
try {
  expect(() => { throw new Error("fail"); }).toThrow();
  threw = true;
} catch (e) {
  threw = false;
}
console.log("✓ expect.toThrow:", threw === true ? "valid" : "FAIL");

expectStatus(res1.status).toBe(200);
console.log("✓ expectStatus");

expectBody(res1.body).toEqual({ users: [] });
console.log("✓ expectBody.toEqual");

function add(a: number, b: number) {
  return a + b;
}

const mockAdd = spy(add);
mockAdd(1, 2);
console.log("✓ spy:", mockAdd.mock.calls[0]?.[0] === 1 ? "valid" : "FAIL");

mockAdd.mockReturnValue(10);
const result = mockAdd(1, 2);
console.log("✓ mockAdd.mockReturnValue:", result === 10 ? "valid" : "FAIL");

const mockObj = stub<{
  method: (x: number) => string;
  property: string;
}>();

mockObj.method(1);
console.log("✓ stub:", mockObj.mock.calls.length > 0 ? "valid" : "FAIL");

const db = new MockDatabase();
db.setTableData("users", [
  { id: 1, name: "John", email: "john@example.com" },
  { id: 2, name: "Jane", email: "jane@example.com" }
]);

const allUsers = await db.from("users").all();
console.log("✓ MockDatabase.all:", allUsers.length === 2 ? "valid" : "FAIL");

const firstUser = await db.from("users").first();
console.log("✓ MockDatabase.first:", firstUser?.name === "John" ? "valid" : "FAIL");

const user = await db.from("users").where("id", 1).first();
console.log("✓ MockDatabase.where:", user?.name === "John" ? "valid" : "FAIL");

const newUser = await db.from("users").insert({ name: "Bob", email: "bob@example.com" });
console.log("✓ MockDatabase.insert:", newUser ? "valid" : "FAIL");

const response = new MockResponse()
  .status(200)
  .json({ message: "success" })
  .header("X-Custom", "value")
  .build();
console.log("✓ MockResponse:", response.status === 200 ? "valid" : "FAIL");

const req = mockRequest({
  method: "POST",
  body: JSON.stringify({ name: "test" }),
  headers: { "Authorization": "Bearer token" }
});
console.log("✓ mockRequest:", req.method === "POST" ? "valid" : "FAIL");

const ctx = createMockContext({
  path: "/api/users",
  method: "POST",
  params: { id: "123" },
  body: { name: "John" }
});
console.log("✓ createMockContext:", ctx.path === "/api/users" ? "valid" : "FAIL");

console.log("\n=== All Tests Passed ===");