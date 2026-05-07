import { describe, test, expect, expectTypeOf } from "bun:test";
import {
  createTokenPair,
  verifyToken,
  verifyAccessToken,
  verifyRefreshToken,
  decodeToken,
  decodeToken,
} from "./src/auth/jwt";

const testConfig = {
  secret: "test-secret-key-for-testing-12345",
  issuer: "kyrin-test",
  audience: "kyrin-app-test",
  accessExpiry: "15m",
  refreshExpiry: "7d",
};

describe("JWT Support", () => {
  test("create and verify access token", async () => {
    const payload = { sub: "user-123", role: "admin" };
    const token = await createTokenPair(payload, testConfig);

    expect(token.accessToken).toBeTruthy();
    expect(token.refreshToken).toBeTruthy();
    expect(token.expiresIn).toBe(900);

    const verified = await verifyAccessToken(token.accessToken, testConfig);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("user-123");
    expect(verified?.role).toBe("admin");
  });

  test("verify refresh token", async () => {
    const payload = { sub: "user-456" };
    const token = await createTokenPair(payload, testConfig);

    const verified = await verifyRefreshToken(token.refreshToken, testConfig);
    expect(verified).not.toBeNull();
    expect(verified?.sub).toBe("user-456");
    expect(verified?.type).toBe("refresh");
  });

  test("decode token without verification", async () => {
    const payload = { sub: "user-789" };
    const token = await createTokenPair(payload, testConfig);
    const decoded = decodeToken(token.accessToken);

    expect(decoded).not.toBeNull();
    expect(decoded?.sub).toBe("user-789");
  });

  test("invalid token returns null", async () => {
    const result = await verifyToken("invalid.token.here", testConfig);
    expect(result).toBeNull();
  });

  test("wrong token type returns null", async () => {
    const payload = { sub: "user-test" };
    const token = await createTokenPair(payload, testConfig);

    const accessAsRefresh = await verifyRefreshToken(token.accessToken, testConfig);
    expect(accessAsRefresh).toBeNull();

    const refreshAsAccess = await verifyAccessToken(token.refreshToken, testConfig);
    expect(refreshAsAccess).toBeNull();
  });
});