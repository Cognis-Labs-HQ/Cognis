import { normalizeHandleKey } from "../../../../api/reuse/normalize-handle.js";

export async function resolveRequesterUsername(profileStore, accountId) {
    const profile = await profileStore.getProfile(accountId);
    const normalized = normalizeHandleKey(profile?.handle ?? "");
    if (!normalized) {
        throw new Error(
            "A visible profile handle is required to use Meetings.",
        );
    }
    return normalized;
}
