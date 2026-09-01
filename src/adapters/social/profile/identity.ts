import {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "../../../gateways/social/reuse/profile-record.js";
import type { ProfileStore } from "./store-contract.js";

export interface ProfileIdentityCapability {
    normalizeHandleKey(handle: string | null | undefined): string;
    normalizeHandleKeys(values: unknown[]): string[];
    resolveAccountHandle(
        accountId: unknown,
        fieldName?: string,
    ): Promise<string>;
}

export function createProfileIdentityCapability(
    profileStore: Pick<ProfileStore, "getProfile">,
): ProfileIdentityCapability {
    return {
        normalizeHandleKey,
        normalizeHandleKeys,
        async resolveAccountHandle(accountId, fieldName = "accountId") {
            const normalizedAccountId = String(accountId ?? "").trim();
            if (!normalizedAccountId) {
                throw new Error(`${fieldName} is required.`);
            }
            const profile = await profileStore.getProfile(normalizedAccountId);
            const handle = normalizeHandleKey(profile?.handle);
            if (!handle) {
                throw new Error(
                    `${fieldName} must identify a profile with a handle.`,
                );
            }
            return handle;
        },
    };
}
