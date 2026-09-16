export type AccessRole = "user" | "teacher" | "moderator" | "admin" | "owner";

export interface RoleAccessPolicy {
    minRole?: AccessRole;
    onlyRole?: AccessRole;
}

const roleRank: Record<AccessRole, number> = {
    user: 1,
    teacher: 2,
    moderator: 3,
    admin: 4,
    owner: 5,
};

const ACCESS_ROLES: readonly AccessRole[] = [
    "user",
    "teacher",
    "moderator",
    "admin",
    "owner",
];

export function isAccessRole(value: unknown): value is AccessRole {
    return (
        typeof value === "string" && ACCESS_ROLES.includes(value as AccessRole)
    );
}

/**
 * Returns true when the given role meets or exceeds the minimum required role.
 * Uses the canonical role hierarchy: user < teacher < moderator < admin < owner.
 */
export function hasMinRole(role: AccessRole, minRole: AccessRole): boolean {
    return roleRank[role] >= roleRank[minRole];
}

export function isRoleAllowed(
    role: AccessRole,
    policy?: RoleAccessPolicy,
): boolean {
    if (!policy) return true;
    if (policy.onlyRole && role !== policy.onlyRole) return false;
    if (policy.minRole && !hasMinRole(role, policy.minRole)) return false;
    return true;
}
