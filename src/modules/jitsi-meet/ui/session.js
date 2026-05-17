import { SESSION_ID_STORAGE_KEY } from "./constants.js";

export function ensureSessionId() {
    const existing = localStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (existing) return existing;
    let generated = globalThis.crypto?.randomUUID?.() ?? "";
    if (!generated) {
        const randomBytes = new Uint8Array(16);
        if (globalThis.crypto?.getRandomValues) {
            globalThis.crypto.getRandomValues(randomBytes);
            const randomHex = Array.from(randomBytes)
                .map((byte) => byte.toString(16).padStart(2, "0"))
                .join("");
            generated = `session-${randomHex}`;
        } else {
            const fallbackEntropy = [
                Date.now(),
                globalThis.performance?.now?.() ?? 0,
                globalThis.navigator?.userAgent ?? "",
                globalThis.location?.href ?? "",
                localStorage.getItem("cognis_account") ?? "",
            ].join("|");
            generated = `session-${btoa(fallbackEntropy)
                .replace(/[^a-zA-Z0-9]/g, "")
                .slice(0, 48)}`;
        }
    }
    localStorage.setItem(SESSION_ID_STORAGE_KEY, generated);
    return generated;
}
