import type { IncomingMessage, ServerResponse } from "node:http";

export async function requireSharedCalendarPassword(input: {
    req: IncomingMessage;
    res: ServerResponse;
    shareTokenId?: string | null;
    getCapability: <T>(capabilityId: string) => T | undefined;
}): Promise<boolean> {
    if (!input.shareTokenId) return true;
    const getTokenById = input.getCapability<
        (shareId: string) => Promise<{
            tokenValue?: string;
            accessControls?: { passwordProtected?: boolean };
        } | null>
    >("share:getTokenById");
    const resolveToken =
        input.getCapability<
            (token: string, password?: string | null) => Promise<unknown | null>
        >("share:resolveToken");
    const tokenRecord = await getTokenById?.(input.shareTokenId);
    if (!tokenRecord?.accessControls?.passwordProtected) return true;
    const header = input.req.headers["x-cognis-share-password"];
    const password = String(Array.isArray(header) ? header[0] : (header ?? ""));
    const resolved = tokenRecord.tokenValue
        ? await resolveToken?.(tokenRecord.tokenValue, password || null)
        : null;
    if (resolved) return true;
    input.res.writeHead(401, {
        "content-type": "application/json",
        "www-authenticate": 'CognisShare realm="calendar"',
    });
    input.res.end(
        JSON.stringify({
            error: {
                code: "share_password_required",
                message: "A valid share password is required.",
            },
        }),
    );
    return false;
}
