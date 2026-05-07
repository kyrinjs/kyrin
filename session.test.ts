import { describe, test, expect } from "bun:test";
import {
  createSession,
  getSession,
  refreshSession,
  updateSession,
  destroySession,
  destroyAllUserSessions,
  getUserSessions,
  setSessionConfig,
  getSessionConfig,
} from "./src/auth/session";

describe("Session Management", () => {
  test("create and get session", () => {
    const session = createSession("user-123", { role: "admin" });

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe("user-123");
    expect(session.data.role).toBe("admin");
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  test("get session returns null for invalid id", () => {
    const session = getSession("invalid-id");
    expect(session).toBeNull();
  });

  test("refresh session updates expiry", () => {
    const session = createSession("user-456");
    const originalExpiry = session.expiresAt;

    const refreshed = refreshSession(session.id);
    expect(refreshed).not.toBeNull();
    expect(refreshed!.expiresAt).toBeGreaterThanOrEqual(originalExpiry);
  });

  test("update session data", () => {
    const session = createSession("user-789", { role: "user" });
    const updated = updateSession(session.id, { role: "admin" });

    expect(updated).not.toBeNull();
    expect(updated!.data.role).toBe("admin");
  });

  test("destroy session", () => {
    const session = createSession("user-destroy");
    const destroyed = destroySession(session.id);

    expect(destroyed).toBe(true);
    expect(getSession(session.id)).toBeNull();
  });

  test("destroyAllUserSessions", () => {
    createSession("user-multi", { role: "admin" });
    createSession("user-multi", { role: "admin" });
    createSession("user-other", { role: "user" });

    const count = destroyAllUserSessions("user-multi");
    expect(count).toBe(2);

    expect(getUserSessions("user-multi-1").length).toBe(0);
  });

  test("getUserSessions", () => {
    createSession("user-list");
    createSession("user-list");

    const sessions = getUserSessions("user-list");
    expect(sessions.length).toBe(2);
  });

  test("session config", () => {
    setSessionConfig({ ttl: 1800, cookieName: "custom_session" });
    const config = getSessionConfig();

    expect(config.ttl).toBe(1800);
    expect(config.cookieName).toBe("custom_session");
  });
});