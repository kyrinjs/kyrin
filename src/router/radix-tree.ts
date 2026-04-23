/**
 * Kyrin Framework - Radix Tree Router
 * High-performance route matching with O(k) path lookup
 *
 * @example
 * ```typescript
 * const tree = new RadixTree();
 * tree.insert("/users/:id", handler);
 * tree.insert("/posts/:postId/comments/:commentId", handler2);
 *
 * const result = tree.lookup("/users/123");
 * // result.handler, result.params { id: "123" }
 * ```
 */

import type { Handler, LookupResult } from "../core/types";

// ==================== Types ====================

interface RadixNode {
  path: string;
  children: Map<string, RadixNode>;
  handler: Handler | null;
  paramName: string | null;
  paramChild: RadixNode | null;
  wildcardChild: RadixNode | null;
}

// ==================== Node Factory ====================

function createNode(path: string = ""): RadixNode {
  return {
    path,
    children: new Map(),
    handler: null,
    paramName: null,
    paramChild: null,
    wildcardChild: null,
  };
}

/**
 * RadixTree class for high-performance route matching
 */
export class RadixTree {
  private root: RadixNode;

  constructor() {
    this.root = createNode();
  }

  // ==================== Path Operations ====================

  /**
   * Split path into segments
   * @example '/users/:id/posts' → ['users', ':id', 'posts']
   */
  private splitPath(path: string): string[] {
    const start = path.startsWith("/") ? 1 : 0;
    const end = path.endsWith("/") ? path.length - 1 : path.length;
    return path.slice(start, end).split("/");
  }

  /**
   * Insert route into tree
   * @param path - Route path (e.g., /users/:id)
   * @param handler - Request handler function
   */
  insert(path: string, handler: Handler): void {
    const segments = this.splitPath(path);
    let currentNode = this.root;

    for (const segment of segments) {
      if (segment.startsWith(":")) {
        // Parameter node
        if (!currentNode.paramChild) {
          const paramNode = createNode();
          paramNode.paramName = segment.slice(1);
          currentNode.paramChild = paramNode;
        }
        currentNode = currentNode.paramChild;
      } else if (segment === "*") {
        // Wildcard node
        if (!currentNode.wildcardChild) {
          const wildcardNode = createNode();
          currentNode.wildcardChild = wildcardNode;
        }
        currentNode = currentNode.wildcardChild;
      } else {
        // Static node
        let child = currentNode.children.get(segment);
        if (!child) {
          child = createNode(segment);
          currentNode.children.set(segment, child);
        }
        currentNode = child;
      }
    }
    currentNode.handler = handler;
  }

  /**
   * Lookup route in tree
   * @param path - Request path (e.g., /users/123)
   * @returns LookupResult or null if not found
   */
  lookup(path: string): LookupResult | null {
    const segments = this.splitPath(path);
    const params = new Map<string, string>();
    return this.search(this.root, segments, 0, params);
  }

  // ==================== Search ====================

  /**
   * Recursive search in tree
   */
  private search(
    node: RadixNode,
    segments: string[],
    index: number,
    params: Map<string, string>
  ): LookupResult | null {
    if (index === segments.length) {
      if (node.handler) {
        return { handler: node.handler, params: Object.fromEntries(params) };
      }
      if (node.wildcardChild && node.wildcardChild.handler) {
        return {
          handler: node.wildcardChild.handler,
          params: Object.fromEntries(params),
        };
      }
      return null;
    }
    const segment = segments[index]!;
    // Static match (priority highest)
    const staticChild = node.children.get(segment);
    if (staticChild) {
      const result = this.search(staticChild, segments, index + 1, params);
      if (result) return result;
    }

    // Parameter match
    if (node.paramChild) {
      params.set(node.paramChild.paramName!, segment);
      const result = this.search(node.paramChild, segments, index + 1, params);
      if (result) return result;
      params.delete(node.paramChild.paramName!);
    }

    // Wildcard match (priority lowest)
    if (node.wildcardChild) {
      params.set("wildcard", segments.slice(index).join("/"));
      if (node.wildcardChild.handler) {
        return {
          handler: node.wildcardChild.handler,
          params: Object.fromEntries(params),
        };
      }
    }

    return null;
  }
}
