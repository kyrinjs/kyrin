export type OAuthProvider = "google" | "github" | "facebook" | "discord";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string[];
  provider: OAuthProvider;
}

export interface OAuthState {
  userId?: string;
  redirectTo?: string;
  nonce: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresIn: number;
}

export interface OAuthUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
  provider: OAuthProvider;
  avatar?: string;
}

const DEFAULT_SCOPES: Record<OAuthProvider, string[]> = {
  google: ["openid", "email", "profile"],
  github: ["read:user", "user:email"],
  facebook: ["email", "public_profile"],
  discord: ["identify", "email"],
};

let oauthConfigs = new Map<OAuthProvider, OAuthConfig>();

export function setOAuthConfig(config: OAuthConfig): void {
  oauthConfigs.set(config.provider, config);
}

export function getOAuthConfig(provider: OAuthProvider): OAuthConfig | undefined {
  return oauthConfigs.get(provider);
}

export function getAuthorizationUrl(provider: OAuthProvider, state: string): string | null {
  const config = oauthConfigs.get(provider);
  if (!config) return null;

  const scope = config.scope || DEFAULT_SCOPES[provider];
  const scopes = scope.join(" ");

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes,
    state,
  });

  const authUrls: Record<OAuthProvider, string> = {
    google: "https://accounts.google.com/o/oauth2/v2/auth",
    github: "https://github.com/login/oauth/authorize",
    facebook: "https://www.facebook.com/v18.0/dialog/oauth",
    discord: "https://discord.com/api/oauth2/authorize",
  };

  return `${authUrls[provider]}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  provider: OAuthProvider,
  code: string
): Promise<OAuthTokens | null> {
  const config = oauthConfigs.get(provider);
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
  });

  const tokenUrls: Record<OAuthProvider, string> = {
    google: "https://oauth2.googleapis.com/token",
    github: "https://github.com/login/oauth/access_token",
    facebook: "https://graph.facebook.com/v18.0/oauth/access_token",
    discord: "https://discord.com/api/oauth2/token",
  };

  try {
    const response = await fetch(tokenUrls[provider], {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string | undefined,
      tokenType: data.token_type as string,
      expiresIn: data.expires_in as number,
    };
  } catch {
    return null;
  }
}

export async function getUserInfo(
  provider: OAuthProvider,
  accessToken: string
): Promise<OAuthUserInfo | null> {
  const userInfoUrls: Record<OAuthProvider, string> = {
    google: "https://www.googleapis.com/oauth2/v3/userinfo",
    github: "https://api.github.com/user",
    facebook: "https://graph.facebook.com/me?fields=id,name,email,picture",
    discord: "https://discord.com/api/users/@me",
  };

  try {
    const response = await fetch(userInfoUrls[provider], {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    const baseInfo: OAuthUserInfo = {
      id: String(data.id || data.sub || ""),
      provider,
      email: data.email as string | undefined,
      name: data.name as string | undefined,
    };

    if (provider === "google") {
      baseInfo.picture = data.picture as string | undefined;
    } else if (provider === "facebook") {
      const pictureData = data.picture as Record<string, unknown> | undefined;
      baseInfo.picture = pictureData?.data ? (pictureData.data as Record<string, unknown>).url as string : undefined;
    } else if (provider === "discord") {
      baseInfo.avatar = (data.avatar as string | undefined) ? 
        `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png` : undefined;
    }

    return baseInfo;
  } catch {
    return null;
  }
}

export async function refreshOAuthToken(
  provider: OAuthProvider,
  refreshToken: string
): Promise<OAuthTokens | null> {
  const config = oauthConfigs.get(provider);
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const tokenUrls: Record<OAuthProvider, string> = {
    google: "https://oauth2.googleapis.com/token",
    github: "https://github.com/login/oauth/access_token",
    facebook: "https://graph.facebook.com/v18.0/oauth/access_token",
    discord: "https://discord.com/api/oauth2/token",
  };

  try {
    const response = await fetch(tokenUrls[provider], {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: params.toString(),
    });

    if (!response.ok) return null;

    const data = await response.json() as Record<string, unknown>;

    return {
      accessToken: data.access_token as string,
      refreshToken: data.refresh_token as string || refreshToken,
      tokenType: data.token_type as string,
      expiresIn: data.expires_in as number,
    };
  } catch {
    return null;
  }
}

export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface OAuthUserInfoExtended extends OAuthUserInfo {
  avatar?: string;
}