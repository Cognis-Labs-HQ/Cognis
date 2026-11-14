import type { IncomingMessage } from "node:http";

export function normalizeExpiresAt(value: unknown): string | undefined | null {
    if (value === undefined) return undefined;
    if (typeof value !== "string") return null;
    const expiresAt = value.trim();
    if (!expiresAt) return "";
    const timestamp = Date.parse(expiresAt);
    return Number.isFinite(timestamp)
        ? new Date(timestamp).toISOString()
        : null;
}

export function readResourceFilter(url: URL): {
    resourceType?: string;
    resourceId?: string;
} {
    const resourceType = String(
        url.searchParams.get("resourceType") ?? "",
    ).trim();
    const resourceId = String(url.searchParams.get("resourceId") ?? "").trim();
    return {
        ...(resourceType ? { resourceType } : {}),
        ...(resourceId ? { resourceId } : {}),
    };
}

export function readSharePassword(
    req: IncomingMessage,
    url: URL,
): string | null {
    for (const headerName of [
        "x-cognis-share-password",
        "x-cognis-calendar-passphrase",
    ]) {
        const value = req.headers[headerName];
        const password = String(
            Array.isArray(value) ? value[0] : (value ?? ""),
        );
        if (password) return password;
    }
    const authorization = String(
        Array.isArray(req.headers.authorization)
            ? req.headers.authorization[0]
            : (req.headers.authorization ?? ""),
    );
    if (authorization.startsWith("Basic ")) {
        const decoded = Buffer.from(
            authorization.slice("Basic ".length),
            "base64",
        ).toString("utf8");
        const separator = decoded.indexOf(":");
        const password = separator >= 0 ? decoded.slice(separator + 1) : "";
        if (password) return password;
    }
    const queryPassword =
        url.searchParams.get("password") ??
        url.searchParams.get("passphrase") ??
        "";
    return queryPassword || null;
}
