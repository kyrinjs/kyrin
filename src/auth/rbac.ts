export type Permission = string;

export interface Role {
  name: string;
  permissions: Permission[];
  inherits?: string[];
}

export interface UserRoles {
  userId: string;
  roles: string[];
}

let roles = new Map<string, Role>();
let userRoles = new Map<string, string[]>();

export function defineRole(name: string, permissions: Permission[], inherits: string[] = []): void {
  roles.set(name, { name, permissions, inherits });
}

export function getRole(name: string): Role | undefined {
  return roles.get(name);
}

export function getAllRoles(): Role[] {
  return Array.from(roles.values());
}

export function setUserRoles(userId: string, userRoleList: string[]): void {
  userRoles.set(userId, userRoleList);
}

export function getUserRoleNames(userId: string): string[] {
  return userRoles.get(userId) || [];
}

export function getUserPermissions(userId: string): Permission[] {
  const roleNames = getUserRoleNames(userId);
  const permissions = new Set<Permission>();
  const visited = new Set<string>();

  function collectRolePermissions(roleName: string): void {
    if (visited.has(roleName)) return;
    visited.add(roleName);

    const role = roles.get(roleName);
    if (!role) return;

    for (const perm of role.permissions) {
      permissions.add(perm);
    }

    if (role.inherits) {
      for (const inherited of role.inherits) {
        collectRolePermissions(inherited);
      }
    }
  }

  for (const roleName of roleNames) {
    collectRolePermissions(roleName);
  }

  return Array.from(permissions);
}

export function hasPermission(userId: string, permission: Permission): boolean {
  const userPermissions = getUserPermissions(userId);
  return userPermissions.includes(permission);
}

export function hasAnyPermission(userId: string, permissionList: Permission[]): boolean {
  const userPermissions = getUserPermissions(userId);
  return permissionList.some((p) => userPermissions.includes(p));
}

export function hasAllPermissions(userId: string, permissionList: Permission[]): boolean {
  const userPermissions = getUserPermissions(userId);
  return permissionList.every((p) => userPermissions.includes(p));
}

export function hasRole(userId: string, roleName: string): boolean {
  const userRoleList = getUserRoleNames(userId);
  return userRoleList.includes(roleName);
}

export function hasAnyRole(userId: string, roleNames: string[]): boolean {
  const userRoleList = getUserRoleNames(userId);
  return roleNames.some((r) => userRoleList.includes(r));
}

export function removeUserRoles(userId: string): void {
  userRoles.delete(userId);
}

export function clearAllRoles(): void {
  roles.clear();
  userRoles.clear();
}

defineRole("admin", ["*"]);
defineRole("user", ["read:own", "update:own"]);
defineRole("guest", ["read:public"]);