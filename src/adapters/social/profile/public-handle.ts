import { randomUUID } from "node:crypto";
import type { ProfileStore } from "./store-contract.js";

/** Allocates a stable public handle independently of an external account's provider key. */
export async function allocatePublicHandle(
    store: ProfileStore,
    accountId: string,
    proposed: string,
): Promise<string> {
    const current = await store.getProfile(accountId);
    if (current?.handle && !current.handle.includes(":")) return current.handle;
    const base = proposed
        .replace(/^@/, "")
        .split(":")
        .at(-1)
        ?.trim()
        .toLowerCase();
    if (!base) throw new Error("profile_handle_required");
    const owner = await store.getProfileByHandle(base);
    if (!owner || owner.accountId === accountId) return base;
    return `${base}-${randomUUID().replaceAll("-", "")}`;
}
