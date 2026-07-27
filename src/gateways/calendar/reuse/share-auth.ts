import { timingSafeEqual } from "node:crypto";

export function readSharePassphrase(
    req: { headers?: Record<string, string | string[]> },
    url: URL,
): string {
    const headerValue = req.headers?.["x-cognis-calendar-passphrase"];
    const headerPassphrase = Array.isArray(headerValue)
        ? String(headerValue[0] ?? "").trim()
        : String(headerValue ?? "").trim();
    if (headerPassphrase) return headerPassphrase;
    const authorizationHeader = Array.isArray(req.headers?.authorization)
        ? String(req.headers?.authorization[0] ?? "")
        : String(req.headers?.authorization ?? "");
    if (authorizationHeader.startsWith("Basic ")) {
        try {
            const decoded = Buffer.from(
                authorizationHeader.slice("Basic ".length),
                "base64",
            ).toString("utf8");
            const password = decoded.includes(":")
                ? decoded.split(":").slice(1).join(":")
                : "";
            if (password) return password;
        } catch {
            // fall through to query fallback
        }
    }
    const queryPassphrase = String(
        url.searchParams.get("passphrase") ?? "",
    ).trim();
    if (queryPassphrase) return queryPassphrase;
    return "";
}

export function passphrasesMatch(
    expectedPassphrase: string,
    receivedPassphrase: string,
): boolean {
    const expectedBuffer = Buffer.from(expectedPassphrase);
    const receivedBuffer = Buffer.from(receivedPassphrase);
    return (
        expectedBuffer.length === receivedBuffer.length &&
        timingSafeEqual(expectedBuffer, receivedBuffer)
    );
}
