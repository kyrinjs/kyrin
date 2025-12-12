import type { Context } from "@/context";

export interface KyrinConfig {
  port?: number;
  hostname?: string;
  development?: boolean;
}

export type Handler = (ctx: Context) => Response | Promise<Response>;

export type LookupResult = { handler: Handler; params: Record<string, string> };

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";
