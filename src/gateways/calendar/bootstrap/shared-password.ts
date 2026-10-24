import type { IncomingMessage, ServerResponse } from "node:http";

export async function requireSharedCalendarPassword(input: {
    req: IncomingMessage;
    res: ServerResponse;
    shareTokenId?: string | null;
    accountId: string;
    ownerCalendarId: string;
    getCapability: <T>(capabilityId: string) => T | undefined;
}): Promise<boolean> {
    if (!input.shareTokenId) return true;
    const getTokenById = input.getCapability<
        (shareId: string) => Promise<{
            accessControls?: { passwordProtected?: boolean };
        } | null>
    >("share:getTokenById");
    const tokenRecord = await getTokenById?.(input.shareTokenId);
    if (!tokenRecord?.accessControls?.passwordProtected) return true;
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
        requiredCapability: "calendar:read",
    });
    if (accountAccess?.authorized) return true;
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
              requiredCapability: "calendar:read",
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
