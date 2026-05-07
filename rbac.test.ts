import { describe, test, expect } from "bun:test";
import {
  defineRole,
  getRole,
  setUserRoles,
  getUserRoleNames,
  getUserPermissions,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  hasAnyRole,
  removeUserRoles,
  clearAllRoles,
} from "./src/auth/rbac";

describe("Role-based Access Control (RBAC)", () => {
  test("get predefined roles", () => {
    const admin = getRole("admin");
    const user = getRole("user");
    const guest = getRole("guest");

    expect(admin).not.toBeUndefined();
    expect(admin?.permissions).toContain("*");
    expect(user?.name).toBe("user");
    expect(guest?.name).toBe("guest");
  });

  test("define custom role", () => {
    defineRole("moderator", ["delete:post", "edit:post"], ["user"]);
    const mod = getRole("moderator");

    expect(mod).not.toBeUndefined();
    expect(mod?.permissions).toContain("delete:post");
    expect(mod?.inherits).toContain("user");
  });

  test("set and get user roles", () => {
    setUserRoles("user-123", ["user"]);
    const roles = getUserRoleNames("user-123");

    expect(roles).toContain("user");
  });

  test("get user permissions", () => {
    setUserRoles("user-perm", ["user"]);
    const perms = getUserPermissions("user-perm");

    expect(perms).toContain("read:own");
    expect(perms).toContain("update:own");
  });

  test("has permission", () => {
    setUserRoles("user-check", ["user"]);
    
    expect(hasPermission("user-check", "read:own")).toBe(true);
    expect(hasPermission("user-check", "delete:post")).toBe(false);
  });

  test("has any permission", () => {
    setUserRoles("user-any", ["user"]);
    
    expect(hasAnyPermission("user-any", ["delete:post", "read:own"])).toBe(true);
    expect(hasAnyPermission("user-any", ["delete:post", "create:post"])).toBe(false);
  });

  test("has all permissions", () => {
    setUserRoles("user-all", ["admin"]);
    
    expect(hasAllPermissions("user-all", ["*"])).toBe(true);
  });

  test("has role", () => {
    setUserRoles("user-role", ["user", "moderator"]);
    
    expect(hasRole("user-role", "user")).toBe(true);
    expect(hasRole("user-role", "admin")).toBe(false);
  });

  test("has any role", () => {
    setUserRoles("user-any-role", ["user"]);
    
    expect(hasAnyRole("user-any-role", ["admin", "moderator"])).toBe(false);
    expect(hasAnyRole("user-any-role", ["admin", "user"])).toBe(true);
  });

  test("role inheritance", () => {
    setUserRoles("user-inherit", ["moderator"]);
    const perms = getUserPermissions("user-inherit");
    
    expect(perms).toContain("delete:post");
    expect(perms).toContain("read:own");
  });

  test("remove user roles", () => {
    setUserRoles("user-remove", ["admin"]);
    removeUserRoles("user-remove");
    
    expect(getUserRoleNames("user-remove").length).toBe(0);
  });
});