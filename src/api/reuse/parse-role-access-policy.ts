import { isAccessRole, type RoleAccessPolicy } from "@cognis/core";

export function parseRoleAccessPolicy(value: unknown): {
    access?: RoleAccessPolicy;
    invalid: boolean;
} {
    if (value === undefined) {
        return { access: undefined, invalid: false };
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return { access: undefined, invalid: true };
    }
    const candidate = value as { minRole?: unknown; onlyRole?: unknown };
    if (candidate.minRole !== undefined && !isAccessRole(candidate.minRole)) {
        return { access: undefined, invalid: true };
    }
    if (candidate.onlyRole !== undefined && !isAccessRole(candidate.onlyRole)) {
        return { access: undefined, invalid: true };
    }
    const access: RoleAccessPolicy = {};
    if (isAccessRole(candidate.minRole)) {
        access.minRole = candidate.minRole;
    }
    if (isAccessRole(candidate.onlyRole)) {
        access.onlyRole = candidate.onlyRole;
    }
    if (!access.minRole && !access.onlyRole) {
        return { access: undefined, invalid: true };
    }
    return { access, invalid: false };
}
