/**
 * Kyrin Framework - Radix Tree Router
 */

import type { Handler, LookupResult } from "@/core/types";

interface RadixNode {
  path: string;
  children: Map<string, RadixNode>;
  handler: Handler | null;
  paramName: string | null;
  isWildcard: boolean;
  paramChild: RadixNode | null;
  wildcardChild: RadixNode | null;
}

/**
 * สร้าง RadixNode ใหม่
 */

function createNode(path: string = ""): RadixNode {
  return {
    path,
    children: new Map(),
    handler: null,
    paramName: null,
    isWildcard: false,
    paramChild: null,
    wildcardChild: null,
  };
}

/**
 * RadixTree class สำหรับการค้นหา route
 */
export class RadixTree {
  private root: RadixNode;

  constructor() {
    this.root = createNode();
  }

  /**
   * แยก path เป็น segments
   * @example '/users/:id/posts' → ['users', ':id', 'posts']
   */
  private splitPath(path: string): string[] {
    // Remove leading and trailing slashes
    return path.replace(/^\/+|\/+$/g, "").split("/");
  }

  /**
   * เพิ่ม route เข้าไปใน tree
   * @param path - path ของ route (เช่น /users/:id)
   * @param handler - ฟังก์ชัน handler
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
          wildcardNode.isWildcard = true;
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
   * ค้นหา route ใน tree
   * @param path - path ของ request (เช่น /users/123)
   * @returns LookupResult หรือ null ถ้าไม่พบ
   */

  lookup(path: string): LookupResult | null {
    const segments = this.splitPath(path);
    const params = new Map<string, string>();
    return this.search(this.root, segments, 0, params);
  }
  /**
   * ค้นหา recursive ใน tree
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
