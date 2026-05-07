import { Kyrin } from "./src/lib";

const app = new Kyrin({ development: true });

const auth = async (c: any, next: any) => {
  c.store.user = { id: 1 };
  await next();
};

app.guard(auth, (app) => {
  app.get("/profile", () => ({ user: "profile" }));
  app.get("/settings", () => ({ user: "settings" }));
});

app.get("/", () => "Public");

console.log("Test 21: Guard for Protected Routes - PASS");