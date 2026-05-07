import {
  createAccessToken,
  createRefreshToken,
  createTokenPair,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  setJWTSecret as _setJWTSecret,
  getJWTSecret,
  type TokenPayload,
  type JWTConfig,
  type TokenPair,
} from "./jwt";

import {
  createSession,
  getSession,
  refreshSession,
  updateSession,
  destroySession,
  destroyAllUserSessions,
  getUserSessions,
  setSessionConfig as _setSessionConfig,
  getSessionConfig,
  type Session,
  type SessionData,
  type SessionConfig,
} from "./session";

import {
  defineRole as _defineRole,
  getRole,
  getAllRoles,
  setUserRoles as _setUserRoles,
  getUserRoleNames,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  removeUserRoles,
  clearAllRoles,
  type Permission,
  type Role,
} from "./rbac";

import {
  setOAuthConfig as _setOAuthConfig,
  getOAuthConfig,
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserInfo,
  refreshOAuthToken,
  generateState,
  type OAuthProvider,
  type OAuthConfig,
  type OAuthTokens,
  type OAuthUserInfo,
} from "./oauth2";

export type {
  TokenPayload,
  JWTConfig,
  TokenPair,
  Session,
  SessionData,
  SessionConfig,
  Permission,
  Role,
  OAuthProvider,
  OAuthConfig,
  OAuthTokens,
  OAuthUserInfo,
};

export interface AuthOptions {
  jwtSecret: string;
  sessionTtl?: number;
  sessionRefreshThreshold?: number;
}

export class Auth {
  private jwtSecret: string;
  private sessionTtl: number;
  private sessionRefreshThreshold: number;

  constructor(options: AuthOptions) {
    this.jwtSecret = options.jwtSecret;
    this.sessionTtl = options.sessionTtl ?? 3600;
    this.sessionRefreshThreshold = options.sessionRefreshThreshold ?? 300;
    _setJWTSecret(options.jwtSecret);
    _setSessionConfig({
      ttl: this.sessionTtl,
      refreshThreshold: this.sessionRefreshThreshold,
    });
  }

  async signToken(userId: string, data?: Partial<TokenPayload>): Promise<TokenPair> {
    return createTokenPair({ sub: userId, ...data } as Omit<TokenPayload, "exp" | "iat">, {
      secret: this.jwtSecret,
    });
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    return verifyToken(token, { secret: this.jwtSecret });
  }

  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    return verifyAccessToken(token, { secret: this.jwtSecret });
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    return verifyRefreshToken(token, { secret: this.jwtSecret });
  }

  createSession(userId: string, data?: Partial<SessionData>): Session {
    return createSession(userId, data);
  }

  getSession(id: string): Session | null {
    return getSession(id);
  }

  refreshSession(id: string): Session | null {
    return refreshSession(id);
  }

  updateSession(id: string, data: Partial<SessionData>): Session | null {
    return updateSession(id, data);
  }

  destroySession(id: string): boolean {
    return destroySession(id);
  }

  getUserSessions(userId: string): Session[] {
    return getUserSessions(userId);
  }

  roles = {
    define: (name: string, permissions: Permission[], inherits?: string[]) => _defineRole(name, permissions, inherits),
    get: (name: string) => getRole(name),
    list: () => getAllRoles(),
    assign: (userId: string, roles: string[]) => _setUserRoles(userId, roles),
    getNames: (userId: string) => getUserRoleNames(userId),
    getPermissions: (userId: string) => getUserPermissions(userId),
    hasPermission: (userId: string, permission: Permission) => hasPermission(userId, permission),
    hasAnyPermission: (userId: string, permissions: Permission[]) => hasAnyPermission(userId, permissions),
    hasAllPermissions: (userId: string, permissions: Permission[]) => hasAllPermissions(userId, permissions),
    hasRole: (userId: string, roleName: string) => hasRole(userId, roleName),
    hasAnyRole: (userId: string, roleNames: string[]) => hasAnyRole(userId, roleNames),
    revoke: (userId: string) => removeUserRoles(userId),
    clear: () => clearAllRoles(),
  };

  oauth = {
    configure: (config: OAuthConfig) => _setOAuthConfig(config),
    getConfig: (provider: OAuthProvider) => getOAuthConfig(provider),
    getAuthUrl: (provider: OAuthProvider, state: string) => getAuthorizationUrl(provider, state),
    exchangeToken: (provider: OAuthProvider, code: string) => exchangeCodeForToken(provider, code),
    getUser: (provider: OAuthProvider, accessToken: string) => getUserInfo(provider, accessToken),
    refresh: (provider: OAuthProvider, refreshToken: string) => refreshOAuthToken(provider, refreshToken),
    createState: () => generateState(),
  };
}

export function createAuth(options: AuthOptions): Auth {
  return new Auth(options);
}
