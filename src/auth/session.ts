export interface SessionData {
  userId: string;
  role?: string;
  [key: string]: unknown;
}

export interface Session {
  id: string;
  userId: string;
  data: SessionData;
  createdAt: number;
  expiresAt: number;
  lastAccessedAt: number;
}

export interface SessionConfig {
  ttl: number;
  refreshThreshold: number;
  cookieName?: string;
  secure?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
}

const DEFAULT_TTL = 3600;
const DEFAULT_REFRESH_THRESHOLD = 300;

let sessions = new Map<string, Session>();
let sessionConfig: SessionConfig = {
  ttl: DEFAULT_TTL,
  refreshThreshold: DEFAULT_REFRESH_THRESHOLD,
  cookieName: "kyrin_session",
};

export function setSessionConfig(config: Partial<SessionConfig>): void {
  sessionConfig = { ...sessionConfig, ...config };
}

export function getSessionConfig(): SessionConfig {
  return sessionConfig;
}

function generateSessionId(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function createSession(userId: string, data: Partial<SessionData> = {}): Session {
  const now = Date.now();
  const ttl = sessionConfig.ttl * 1000;

  const session: Session = {
    id: generateSessionId(),
    userId,
    data: { userId, ...data },
    createdAt: now,
    expiresAt: now + ttl,
    lastAccessedAt: now,
  };

  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | null {
  const session = sessions.get(id);
  if (!session) return null;

  if (Date.now() > session.expiresAt) {
    sessions.delete(id);
    return null;
  }

  return session;
}

export function refreshSession(id: string): Session | null {
  const session = sessions.get(id);
  if (!session) return null;

  const now = Date.now();
  const threshold = sessionConfig.refreshThreshold * 1000;

  if (now - session.lastAccessedAt > threshold) {
    session.lastAccessedAt = now;
    session.expiresAt = now + sessionConfig.ttl * 1000;
    sessions.set(id, session);
  }

  return session;
}

export function updateSession(
  id: string,
  data: Partial<SessionData>
): Session | null {
  const session = sessions.get(id);
  if (!session) return null;

  session.data = { ...session.data, ...data };
  session.lastAccessedAt = Date.now();
  sessions.set(id, session);

  return session;
}

export function destroySession(id: string): boolean {
  return sessions.delete(id);
}

export function destroyAllUserSessions(userId: string): number {
  let count = 0;
  for (const [id, session] of sessions) {
    if (session.userId === userId) {
      sessions.delete(id);
      count++;
    }
  }
  return count;
}

export function cleanupExpiredSessions(): number {
  let count = 0;
  const now = Date.now();

  for (const [id, session] of sessions) {
    if (now > session.expiresAt) {
      sessions.delete(id);
      count++;
    }
  }

  return count;
}

export function getUserSessions(userId: string): Session[] {
  const result: Session[] = [];
  for (const session of sessions.values()) {
    if (session.userId === userId) {
      result.push(session);
    }
  }
  return result;
}

export function setSession(key: string, value: string): void {
  globalThis.__kyrin_sessions = globalThis.__kyrin_sessions || new Map();
  (globalThis.__kyrin_sessions as Map<string, Session>).set(key, value as unknown as Session);
}

export function getSessionStore(): Map<string, Session> {
  return sessions;
}

declare global {
  var __kyrin_sessions: Map<string, Session> | undefined;
}