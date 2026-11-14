/**
 * Resolves a consistent human-readable label for account/member-like objects.
 *
 * Public exports:
 * - resolveMemberDisplayName(member): Returns the best available display label.
 *
 * Usage:
 *   import { resolveMemberDisplayName } from '/static/reuse/member-display-name.js';
 *
 *   const label = resolveMemberDisplayName(member);
 *
 * @param {{ displayName?: string, username?: string, handle?: string, accountId?: string } | null | undefined} member
 * @returns {string}
 */
export function resolveMemberDisplayName(member) {
    return String(
        member?.displayName ||
            member?.username ||
            member?.handle ||
            member?.accountId ||
            "",
    ).trim();
}
