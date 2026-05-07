import {
  SignJWT,
  jwtVerify,
  type JWTPayload,
  type JWTHeaderParameters,
} from "jose";

const DEFAULT_EXPIRY = "15m";
const DEFAULT_REFRESH_EXPIRY = "7d";

export interface TokenPayload extends JWTPayload {
  sub: string;
  role?: string;
  permissions?: string[];
  type?: "access" | "refresh";
}

export interface JWTConfig {
  secret: string;
  accessExpiry?: string;
  refreshExpiry?: string;
  issuer?: string;
  audience?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

let globalSecret: Uint8Array | null = null;

function getSecret(secret: string): Uint8Array {
  return new TextEncoder().encode(secret);
}

export function setJWTSecret(secret: string): void {
  globalSecret = getSecret(secret);
}

export function getJWTSecret(): Uint8Array | null {
  return globalSecret;
}

export async function createAccessToken(
  payload: Omit<TokenPayload, "exp" | "iat">,
  config: JWTConfig
): Promise<string> {
  const secret = getSecret(config.secret);
  const expiry = config.accessExpiry || DEFAULT_EXPIRY;

  return new SignJWT({ ...payload, type: "access" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" } as JWTHeaderParameters)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setIssuer(config.issuer || "kyrin")
    .setAudience(config.audience || "kyrin-app")
    .setSubject(payload.sub as string)
    .sign(secret);
}

export async function createRefreshToken(
  payload: Omit<TokenPayload, "exp" | "iat">,
  config: JWTConfig
): Promise<string> {
  const secret = getSecret(config.secret);
  const expiry = config.refreshExpiry || DEFAULT_REFRESH_EXPIRY;

  return new SignJWT({ ...payload, type: "refresh" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" } as JWTHeaderParameters)
    .setIssuedAt()
    .setExpirationTime(expiry)
    .setIssuer(config.issuer || "kyrin")
    .setAudience(config.audience || "kyrin-app")
    .setSubject(payload.sub as string)
    .sign(secret);
}

export async function createTokenPair(
  payload: Omit<TokenPayload, "exp" | "iat">,
  config: JWTConfig
): Promise<TokenPair> {
  const [accessToken, refreshToken] = await Promise.all([
    createAccessToken(payload, config),
    createRefreshToken(payload, config),
  ]);

  const expiry = config.accessExpiry || DEFAULT_EXPIRY;
  const expiresIn = parseExpiry(expiry);

  return { accessToken, refreshToken, expiresIn };
}

function parseExpiry(expiry: string): number {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 900;

  const value = parseInt(match[1]!);
  const unit = match[2]!;

  switch (unit) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900;
  }
}

export async function verifyToken(
  token: string,
  config: JWTConfig
): Promise<TokenPayload | null> {
  try {
    const secret = getSecret(config.secret);
    const { payload } = await jwtVerify(token, secret);
    return payload as TokenPayload;
  } catch {
    return null;
  }
}

export async function verifyAccessToken(
  token: string,
  config: JWTConfig
): Promise<TokenPayload | null> {
  const payload = await verifyToken(token, config);
  if (!payload || payload.type !== "access") return null;
  return payload;
}

export async function verifyRefreshToken(
  token: string,
  config: JWTConfig
): Promise<TokenPayload | null> {
  const payload = await verifyToken(token, config);
  if (!payload || payload.type !== "refresh") return null;
  return payload;
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      Buffer.from(parts[1]!, "base64").toString("utf-8")
    );
    return payload as TokenPayload;
  } catch {
    return null;
  }
}