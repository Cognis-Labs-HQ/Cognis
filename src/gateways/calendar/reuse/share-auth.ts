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

export async function resolveGatewayCalendarShare(
    capabilities: {
        get<T>(name: string): T | undefined;
    },
    token: string,
    password: string,
    resolveCalendarLink?: (tokenValue: string) => Promise<{
        calendarId: string;
        passphrase: string | null;
    } | null>,
): Promise<{
    calendarId?: string;
    unauthorized?: boolean;
    writable?: boolean;
} | null> {
    const resolveToken = capabilities.get<
        (
            tokenValue: string,
            sharePassword?: string | null,
        ) => Promise<{
            resourceType?: unknown;
            resourceId?: unknown;
            grantedCapabilities?: unknown;
        } | null>
    >("share:resolveToken");
    const share = resolveToken
        ? await resolveToken(token, password || null)
        : null;
    if (share?.resourceType === "calendar") {
        const calendarId = String(share.resourceId ?? "").trim();
        return calendarId
            ? {
                  calendarId,
                  writable:
                      Array.isArray(share.grantedCapabilities) &&
                      share.grantedCapabilities.includes("calendar:write"),
              }
            : null;
    }
    const calendarLink = resolveCalendarLink
        ? await resolveCalendarLink(token)
        : null;
    if (!calendarLink) return resolveToken ? { unauthorized: true } : null;
    if (
        calendarLink.passphrase &&
        !passphrasesMatch(calendarLink.passphrase, password)
    )
        return { unauthorized: true };
    return { calendarId: calendarLink.calendarId, writable: false };
}
