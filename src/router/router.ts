/**
 * Kyrin Framework - Router
 *
 * Router ที่รองรับ HTTP methods โดยใช้ RadixTree
 */

import type { Handler, LookupResult, HttpMethod } from "@/core/types";
import { RadixTree } from "./radix-tree";

/**
 * Router class จัดการ routes สำหรับทุก HTTP methods
 */
export class Router {
  /** Radix trees สำหรับแต่ละ HTTP method */
  private trees: Map<HttpMethod, RadixTree>;

  /** Cache สำหรับ static routes (optimization) */
  private staticRoutes: Map<HttpMethod, Map<string, Handler>>;

  constructor() {
    this.trees = new Map();
    this.staticRoutes = new Map();
  }

  /**
   * ดึงหรือสร้าง RadixTree สำหรับ method ที่กำหนด
   */
  private getTree(method: HttpMethod): RadixTree {
    let tree = this.trees.get(method);
    if (!tree) {
      tree = new RadixTree();
      this.trees.set(method, tree);
    }
    return tree;
  }

  /**
   * ดึงหรือสร้าง cache สำหรับ static routes
   */
  private getStaticRoutes(method: HttpMethod): Map<string, Handler> {
    let routes = this.staticRoutes.get(method);
    if (!routes) {
      routes = new Map();
      this.staticRoutes.set(method, routes);
    }
    return routes;
  }

  /**
   * ลงทะเบียน route สำหรับ method ใดๆ
   */
  // ✅ ควรเช็คก่อน cache
  on(method: HttpMethod, path: string, handler: Handler) {
    // Static routes cache เฉพาะ routes ที่ไม่มี dynamic segments
    if (!path.includes(":") && !path.includes("*")) {
      this.getStaticRoutes(method).set(path, handler);
    }
    this.getTree(method).insert(path, handler);
  }

  /**
   * ค้นหา route ที่ตรงกับ method และ path
   */
  match(method: HttpMethod, path: string): LookupResult | null {
    // ลอง static cache ก่อน (O(1))
    const staticRoute = this.getStaticRoutes(method).get(path);
    if (staticRoute) {
      return { handler: staticRoute, params: {} };
    }
    // ค้นหาใน tree (O(k))
    const tree = this.getTree(method);
    const result = tree.lookup(path);
    if (result) {
      return { handler: result.handler, params: result.params };
    }
    return null;
  }

  // ==================== HTTP Method Shortcuts ====================
  get(path: string, handler: Handler) {
    this.on("GET", path, handler);
  }

  post(path: string, handler: Handler) {
    this.on("POST", path, handler);
  }

  put(path: string, handler: Handler) {
    this.on("PUT", path, handler);
  }

  delete(path: string, handler: Handler) {
    this.on("DELETE", path, handler);
  }

  patch(path: string, handler: Handler) {
    this.on("PATCH", path, handler);
  }

  options(path: string, handler: Handler) {
    this.on("OPTIONS", path, handler);
  }

  head(path: string, handler: Handler) {
    this.on("HEAD", path, handler);
  }

  /**
   * ลงทะเบียนหลาย methods พร้อมกัน
   * @example router.all('/users', handler) // GET, POST, PUT, DELETE ทั้งหมด
   */
  all(path: string, handler: Handler) {
    this.on("GET", path, handler);
    this.on("POST", path, handler);
    this.on("PUT", path, handler);
    this.on("DELETE", path, handler);
    this.on("PATCH", path, handler);
    this.on("OPTIONS", path, handler);
    this.on("HEAD", path, handler);
  }
}
