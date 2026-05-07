import { describe, test, expect, beforeEach } from "bun:test";
import {
  setOAuthConfig,
  getOAuthConfig,
  getAuthorizationUrl,
  generateState,
} from "./src/auth/oauth2";

describe("OAuth2 Integration", () => {
  const testConfig = {
    clientId: "test-client-id",
    clientSecret: "test-client-secret",
    redirectUri: "http://localhost:3000/callback",
    provider: "google" as const,
  };

  beforeEach(() => {
    setOAuthConfig(testConfig);
  });

  test("set and get OAuth config", () => {
    const config = getOAuthConfig("google");
    
    expect(config).not.toBeUndefined();
    expect(config?.clientId).toBe("test-client-id");
    expect(config?.clientSecret).toBe("test-client-secret");
  });

  test("get Google authorization URL", () => {
    const state = generateState();
    const url = getAuthorizationUrl("google", state);
    
    expect(url).not.toBeNull();
    expect(url).toContain("accounts.google.com");
    expect(url).toContain("client_id=test-client-id");
    expect(url).toContain("state=" + state);
  });

  test("get GitHub authorization URL", () => {
    const config = { ...testConfig, provider: "github" as const };
    setOAuthConfig(config);
    
    const state = generateState();
    const url = getAuthorizationUrl("github", state);
    
    expect(url).not.toBeNull();
    expect(url).toContain("github.com");
  });

  test("get Discord authorization URL", () => {
    const config = { ...testConfig, provider: "discord" as const };
    setOAuthConfig(config);
    
    const state = generateState();
    const url = getAuthorizationUrl("discord", state);
    
    expect(url).not.toBeNull();
    expect(url).toContain("discord.com");
  });

  test("get Facebook authorization URL", () => {
    const config = { ...testConfig, provider: "facebook" as const };
    setOAuthConfig(config);
    
    const state = generateState();
    const url = getAuthorizationUrl("facebook", state);
    
    expect(url).not.toBeNull();
    expect(url).toContain("facebook.com");
  });

  test("return null for unknown provider", () => {
    const url = getAuthorizationUrl("google", "state");
    expect(url).not.toBeNull();
    
    setOAuthConfig({ ...testConfig, provider: "discord" as const });
    const state = generateState();
    const url2 = getAuthorizationUrl("discord", state);
    expect(url2).not.toBeNull();
  });

  test("generate state", () => {
    const state1 = generateState();
    const state2 = generateState();
    
    expect(state1).toHaveLength(32);
    expect(state1).not.toBe(state2);
  });

  test("custom scopes", () => {
    const config = { 
      ...testConfig, 
      provider: "google" as const,
      scope: ["openid", "email", "profile", "custom_scope"],
    };
    setOAuthConfig(config);
    
    const url = getAuthorizationUrl("google", "state");
    
    expect(url).toContain("openid");
    expect(url).toContain("custom_scope");
  });
});