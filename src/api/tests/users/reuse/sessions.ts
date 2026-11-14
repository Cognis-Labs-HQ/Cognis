import type { AccessRole } from "@cognis/core";

type Claims = { sub: string; role: AccessRole };
const sessions = new Map<string, Claims>();
let sequence = 0;
const roles: AccessRole[] = ["user", "teacher", "moderator", "admin", "owner"];

/** Opaque fixture handles: no actual authentication, signing, or persistent tokens. */
export function issueAccessToken(
    sub: string,
    role: AccessRole,
    _ttl: number,
): string {
    const id = `fixture-session-${++sequence}`;
    sessions.set(id, { sub, role });
    return id;
}

export function verifyAccessToken(id: string): Claims | null {
    const claims = sessions.get(id);
    return claims ? { ...claims } : null;
}

export function revokeAccessTokensForSubject(subject: string): number {
    let count = 0;
    for (const [id, claims] of sessions) {
        if (claims.sub !== subject) continue;
        sessions.delete(id);
        count += 1;
    }
    return count;
}

export function hasMinRole(role: AccessRole, minRole: AccessRole): boolean {
    return roles.indexOf(role) >= roles.indexOf(minRole);
}
