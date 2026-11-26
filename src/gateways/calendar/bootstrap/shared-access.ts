import type { IncomingMessage, ServerResponse } from "node:http";

export async function requireSharedCalendarAccess(input: {
    req: IncomingMessage;
    res: ServerResponse;
    shareTokenId?: string | null;
    accountId: string;
    ownerCalendarId: string;
    requiredCapability?: "calendar:read" | "calendar:write";
    getCapability: <T>(capabilityId: string) => T | undefined;
}): Promise<boolean> {
    if (!input.shareTokenId) return true;
    const requiredCapability = input.requiredCapability ?? "calendar:read";
    const resolveUserAccess = input.getCapability<
        (access: {
            accountId: string;
            resourceType: string;
            resourceId: string;
            requiredCapability: string;
        }) => Promise<{ authorized: boolean }>
    >("share:resolveUserAccess");
    const accountAccess = await resolveUserAccess?.({
        accountId: input.accountId,
        resourceType: "calendar",
        resourceId: input.ownerCalendarId,
        requiredCapability,
    });
    if (accountAccess?.authorized) return true;
    const getTokenById = input.getCapability<
        (shareId: string) => Promise<{
            grantedCapabilities?: string[];
            accessControls?: { passwordProtected?: boolean };
        } | null>
    >("share:getTokenById");
    const tokenRecord = await getTokenById?.(input.shareTokenId);
    if (
        !resolveUserAccess ||
        !tokenRecord?.accessControls?.passwordProtected ||
        !tokenRecord.grantedCapabilities?.includes(requiredCapability)
    ) {
        input.res.writeHead(403, { "content-type": "application/json" });
        input.res.end(
            JSON.stringify({
                error: {
                    code: "share_access_denied",
                    message: "Calendar share access denied.",
                },
            }),
        );
        return false;
    }
    const header = input.req.headers["x-cognis-share-password"];
    const password = String(Array.isArray(header) ? header[0] : (header ?? ""));
    const unlockUserAccess = input.getCapability<
        (access: {
            shareId: string;
            accountId: string;
            resourceType: string;
            resourceId: string;
            requiredCapability: string;
            password: string;
        }) => Promise<boolean>
    >("share:unlockUserAccess");
    const unlocked = password
        ? await unlockUserAccess?.({
              shareId: input.shareTokenId,
              accountId: input.accountId,
              resourceType: "calendar",
              resourceId: input.ownerCalendarId,
              requiredCapability,
              password,
          })
        : false;
    if (unlocked) return true;
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
