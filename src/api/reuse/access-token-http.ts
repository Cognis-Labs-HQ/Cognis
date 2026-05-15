import type { IncomingMessage } from "node:http";

export function shouldSetSecureCookie(req: IncomingMessage): boolean {
    const forced = process.env.COGNIS_SECURE_COOKIES;
    if (forced === "1" || forced === "true") return true;
    if (forced === "0" || forced === "false") return false;
    const forwardedProto = req.headers["x-forwarded-proto"];
    if (typeof forwardedProto !== "string") return false;
    return forwardedProto
        .split(",")
        .some((value) => value.trim().toLowerCase() === "https");
}

export function buildAccessTokenCookie(
    token: string,
    ttlSeconds: number,
    useSecure: boolean,
): string {
    const securePart = useSecure ? "; Secure" : "";
    return `cognis_access_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${ttlSeconds}${securePart}`;
}

export function extractCookieToken(req: IncomingMessage): string | null {
    const cookieHeader = req.headers.cookie ?? "";
    const match = cookieHeader.match(/(?:^|; )cognis_access_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

export function extractBearerToken(req: IncomingMessage): string | null {
    const authHeader = req.headers.authorization;
    if (typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
        return null;
    }
    return authHeader.slice("Bearer ".length);
}
