import { mountWhenDirect } from "../../page-entry.js";

export async function mount(root) {
    globalThis.__componentPageMountRoots.push(root);
    return () => globalThis.__componentPageDiscards++;
}

await mountWhenDirect(mount);
