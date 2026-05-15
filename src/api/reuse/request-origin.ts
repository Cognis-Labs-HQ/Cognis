import type { IncomingMessage } from "node:http";

export function resolveRequestOrigin(req: IncomingMessage): string {
    const forwardedProto = String(req.headers?.["x-forwarded-proto"] ?? "")
        .trim()
        .split(",")[0]
        ?.trim();
    const protocol =
        forwardedProto ||
        (req.socket && "encrypted" in req.socket && req.socket.encrypted
            ? "https"
            : "http");
    const forwardedHost = String(req.headers?.["x-forwarded-host"] ?? "")
        .trim()
        .split(",")[0]
        ?.trim();
    const host = forwardedHost || String(req.headers?.host ?? "").trim() || "";
    if (!host) {
        return "";
    }
    return `${protocol}://${host}`;
}

export function resolveAbsoluteUrl(
    req: IncomingMessage,
    pathname: string,
): string {
    const origin = resolveRequestOrigin(req);
    if (!origin) {
        return pathname;
    }
    return new URL(pathname, origin).toString();
}
