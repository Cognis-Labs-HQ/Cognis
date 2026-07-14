export {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "../../../api/reuse/normalize-handle.js";

export type SocialProfileRole = "user" | "teacher" | "admin" | "owner";
export type SocialProfileVisibility = "hidden" | "community" | "public";

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
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
