/**
 * Kyrin Framework - Logger Plugin
 * Logging middleware for server startup and request/response
 */

import type { PluginFactory } from "../middleware/types";

export interface LoggerOptions {
  /** Enable request logging */
  logRequests?: boolean;
  /** Enable response logging */
  logResponses?: boolean;
  /** Enable server startup logging */
  logServerStart?: boolean;
  /** Custom prefix for logs */
  prefix?: string;
}

/**
 * Logger Plugin
 *
 * @example
 * app.use(logger());
 * app.use(logger({ logRequests: true, logResponses: true }));
 */
export const logger: PluginFactory<LoggerOptions> = (options = {}) => {
  const config = {
    logRequests: true,
    logResponses: false,
    logServerStart: true,
    prefix: "[Kyrin]",
    ...options,
  };

  return {
    name: "logger",
    onRequest: config.logRequests
      ? (c) => {
          const timestamp = new Date().toISOString();
          console.log(`${config.prefix} ${timestamp} ${c.method} ${c.path}`);
        }
      : undefined,
    onResponse: config.logResponses
      ? (c) => {
          const timestamp = new Date().toISOString();
          console.log(
            `${config.prefix} ${timestamp} Response sent for ${c.method} ${c.path}`
          );
        }
      : undefined,
  };
};
