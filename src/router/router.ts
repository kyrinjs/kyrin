/**
 * Kyrin Framework - Router
 * HTTP routing with RadixTree for O(k) lookups
 *
 * @example
 * ```typescript
 * const router = new Router();
 * router.get("/users", getUsersHandler);
 * router.post("/users", createUserHandler);
 *
 * const result = router.match("GET", "/users");
 * // result.handler, result.params { ... }
 * ```
 */

import type { Handler, LookupResult, HttpMethod } from "../core/types";
import { RadixTree } from "./radix-tree";

/** Route definition for grouping */
interface RouteDefinition {
  method: HttpMethod;
  path: string;
  handler: Handler;
}

/**
 * Router class for HTTP method routing
 * Uses RadixTree for fast path matching with static route caching
 */
export class Router {
  /** RadixTree for each HTTP method */
  private trees: Map<HttpMethod, RadixTree> = new Map();

  /** O(1) cache for static routes */
  private staticRoutes: Map<HttpMethod, Map<string, Handler>> = new Map();

  /** Stored routes for grouping */
  private routes: RouteDefinition[] = [];

  // ==================== Route Registration ====================

  /**
   * Register a route for any HTTP method
   * @param method - HTTP method (GET, POST, etc.)
   * @param path - Route path (e.g., "/users/:id")
   * @param handler - Request handler function
   */
  on(method: HttpMethod, path: string, handler: Handler): this {
    this.routes.push({ method, path, handler });

    // Cache static routes for O(1) lookup
    if (!path.includes(":") && !path.includes("*")) {
      this.getStaticRoutes(method).set(path, handler);
    }

    this.getTree(method).insert(path, handler);
    return this;
  }

  /**
   * Find matching route for method and path
   * @returns Handler and params if found, null otherwise
   */
  match(method: HttpMethod, path: string): LookupResult | null {
    // Try static cache first (O(1))
    const staticRoute = this.staticRoutes.get(method)?.get(path);
    if (staticRoute) {
      return { handler: staticRoute, params: {} };
    }

    // Fall back to tree lookup (O(k))
    const tree = this.trees.get(method);
    return tree?.lookup(path) ?? null;
  }

  /**
   * Get all registered routes (for grouping)
   */
  getRoutes(): RouteDefinition[] {
    return this.routes;
  }

  // ==================== HTTP Method Shortcuts ====================

  get(path: string, handler: Handler): this {
    return this.on("GET", path, handler);
  }

  post(path: string, handler: Handler): this {
    return this.on("POST", path, handler);
  }

  put(path: string, handler: Handler): this {
    return this.on("PUT", path, handler);
  }

  delete(path: string, handler: Handler): this {
    return this.on("DELETE", path, handler);
  }

  patch(path: string, handler: Handler): this {
    return this.on("PATCH", path, handler);
  }

  options(path: string, handler: Handler): this {
    return this.on("OPTIONS", path, handler);
  }

  head(path: string, handler: Handler): this {
    return this.on("HEAD", path, handler);
  }

  /** Register handler for all HTTP methods */
  all(path: string, handler: Handler): this {
    const methods: HttpMethod[] = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
      "HEAD",
    ];
    for (const method of methods) {
      this.on(method, path, handler);
    }
    return this;
  }

  // ==================== Private Helpers ====================

  private getTree(method: HttpMethod): RadixTree {
    let tree = this.trees.get(method);
    if (!tree) {
      tree = new RadixTree();
      this.trees.set(method, tree);
    }
    return tree;
  }

  private getStaticRoutes(method: HttpMethod): Map<string, Handler> {
    let routes = this.staticRoutes.get(method);
    if (!routes) {
      routes = new Map();
      this.staticRoutes.set(method, routes);
    }
    return routes;
  }
}
