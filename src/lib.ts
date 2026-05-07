/**
 * Kyrin Framework
 * High-performance minimal web framework for Bun
 *
 * @example
 * ```typescript
 * import { Kyrin, cors } from "kyrin";
 *
 * const app = new Kyrin();
 * app.use(cors());
 * app.get("/", () => ({ message: "Hello!" }));
 * app.listen(3000);
 * ```
 */

// ==================== Core ====================
export { Kyrin } from "./core/kyrin";
export type {
  Handler,
  HandlerResponse,
  HttpMethod,
  KyrinConfig,
  LookupResult,
  ErrorHandler,
} from "./core/types";

// ==================== Router ====================
export { Router } from "./router/router";

// ==================== Context ====================
export { Context } from "./context/context";

// ==================== Database ====================
export { Database, database, SQLiteClient } from "./db";
export type {
  DatabaseConfig,
  DatabaseClient,
  SQLiteConfig,
  RunResult,
  PreparedStatement,
  SyncOptions,
} from "./db";

// ==================== Schema ====================
export { model, string, number, boolean, date, Model, PrimaryKeyType, schema, column } from "./schema";
export type { InferColumns, SchemaColumns, Schema } from "./schema";

// ==================== Middleware ====================
export type {
  MiddlewareHandler,
  HookHandler,
  KyrinPlugin,
  PluginFactory,
} from "./middleware";
export { compose } from "./middleware";

// ==================== Plugins ====================
export { cors } from "./plugins";
export type { CorsOptions } from "./plugins";

// ==================== Auth ====================
export { Auth, createAuth, type AuthOptions } from "./auth/auth";
export {
  createAccessToken,
  createRefreshToken,
  createTokenPair,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  setJWTSecret,
  getJWTSecret,
} from "./auth/jwt";
export type {
  TokenPayload,
  JWTConfig,
  TokenPair,
} from "./auth/jwt";

export {
  createSession,
  getSession,
  refreshSession,
  updateSession,
  destroySession,
  destroyAllUserSessions,
  getUserSessions,
  cleanupExpiredSessions,
  setSessionConfig,
  getSessionConfig,
} from "./auth/session";
export type {
  Session,
  SessionData,
  SessionConfig,
} from "./auth/session";

export {
  defineRole,
  getRole,
  getAllRoles,
  setUserRoles,
  getUserRoleNames,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  removeUserRoles,
} from "./auth/rbac";
export type { Permission, Role, UserRoles } from "./auth/rbac";

export {
  setOAuthConfig,
  getOAuthConfig,
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserInfo,
  refreshOAuthToken,
  generateState,
} from "./auth/oauth2";
export type {
  OAuthProvider,
  OAuthConfig,
  OAuthState,
  OAuthTokens,
  OAuthUserInfo,
} from "./auth/oauth2";

// ==================== Testing ====================
export { TestClient, TestApp, createApp, expect, expectStatus, expectBody } from "./test/test";
export { mocking } from "./test/test";
export type { TestRequest, TestResponse, AssertionResult } from "./test/test";
export { spy, stub, MockDatabase, MockResponse, mockRequest, createMockContext } from "./test/mocking";
export type { MockFunction } from "./test/mocking";
