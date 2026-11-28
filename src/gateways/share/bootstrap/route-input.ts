/**
 * Reads Share route filters, expiry values and supported password transports.
 * Public exports: normalizeExpiresAt validates an optional ISO expiry; readResourceFilter reads resource identifiers; readSharePassword resolves supported headers, Basic authentication and query input in precedence order.
 * @example const password = readSharePassword(request, url); const filter = readResourceFilter(url);
 */
import type { IncomingMessage } from "node:http";

/** @param {unknown} value Incoming expiry. @returns {string|undefined|null} Normalized ISO time, empty removal value, omitted value, or null for invalid input. */
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

/** @param {URL} url Current request URL. @returns {{resourceType?:string,resourceId?:string}} Nonempty resource filters. */
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

/** @param {IncomingMessage} request Current request. @param {URL} url Parsed request URL. @returns {string|null} First supported nonempty password, or null. */
export function readSharePassword(
    request: IncomingMessage,
    url: URL,
): string | null {
    for (const headerName of [
        "x-cognis-share-password",
        "x-cognis-calendar-passphrase",
    ]) {
        const value = request.headers[headerName];
        const password = String(
            Array.isArray(value) ? value[0] : (value ?? ""),
        );
        if (password) return password;
    }
    const authorization = String(
        Array.isArray(request.headers.authorization)
            ? request.headers.authorization[0]
            : (request.headers.authorization ?? ""),
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
