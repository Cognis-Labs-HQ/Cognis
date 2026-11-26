export {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "../../../api/reuse/normalize-handle.js";

export type SocialProfileRole = "user" | "teacher" | "admin" | "owner";
export type SocialProfileVisibility = "hidden" | "community" | "public";
export type SocialProfileLifecycleState = "active" | "deactivated" | "archived";

export interface SocialProfileRecord {
    accountId: string;
    handle: string;
    displayName: string | null;
    role: SocialProfileRole;
    bio: string | null;
    location: string | null;
    website: string | null;
    avatarKey: string | null;
    bannerKey: string | null;
    visibility: SocialProfileVisibility;
    lifecycleState: SocialProfileLifecycleState;
    createdAt: string;
    updatedAt: string;
}

export function rowToProfile(row: any): SocialProfileRecord {
    return {
        accountId: row.account_id,
        handle: row.handle,
        displayName: row.display_name ?? null,
        role: row.role as SocialProfileRole,
        bio: row.bio ?? null,
        location: row.location ?? null,
        website: row.website ?? null,
        avatarKey: row.avatar_key ?? null,
        bannerKey: row.banner_key ?? null,
        visibility: row.visibility as SocialProfileVisibility,
        lifecycleState:
            row.account_lifecycle_state === "archived"
                ? "archived"
                : row.account_lifecycle_state === "deactivated"
                  ? "deactivated"
                  : "active",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
