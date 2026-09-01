import {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "../../../api/reuse/normalize-handle.js";
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
    isEnabled: () => boolean = () => true,
): ProfileIdentityCapability {
    const requireEnabled = () => {
        if (!isEnabled()) {
            throw new Error("The Social Profile adapter is disabled.");
        }
    };

    return {
        normalizeHandleKey(handle) {
            requireEnabled();
            return normalizeHandleKey(handle);
        },
        normalizeHandleKeys(values) {
            requireEnabled();
            return normalizeHandleKeys(values);
        },
        async resolveAccountHandle(accountId, fieldName = "accountId") {
            requireEnabled();
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
