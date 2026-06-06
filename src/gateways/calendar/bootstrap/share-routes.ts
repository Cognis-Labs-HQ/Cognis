import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import { normalizeCalendarColor } from "../color.js";
import type { CoreCalendarGateway } from "../gateway/index.js";
import {
    buildCalendarShareData,
    createCalendarShareName,
    createCalendarSharePassphrase,
    errorMessage,
    resolveShareExpiry,
    sendCalendarError,
    sendJson,
} from "./helpers.js";
import type { CalendarShareRegistry } from "./share-registry.js";

const WRITE_PERMISSION_VARIANTS = new Set([
    "write",
    "read&write",
    "read_and_write",
    "read-write",
    "readandwrite",
]);

function normalizeSharePermission(
    value: unknown,
): "read" | "write" | undefined {
    if (typeof value !== "string") return undefined;
    const compactPermission = value.trim().toLowerCase().replace(/\s+/g, "");
    if (!compactPermission) return undefined;
    return WRITE_PERMISSION_VARIANTS.has(compactPermission) ? "write" : "read";
}

export async function handleCalendarShareRoutes(input: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    claims: { sub: string };
    gateway: CoreCalendarGateway;
    shareRegistry: CalendarShareRegistry;
    externalHost: string;
    resolveShareableUsers:
        | ((params: { ownerAccountId: string; query: string }) => Promise<
              Array<{
                  accountId: string;
                  handle?: string | null;
                  displayName?: string | null;
                  avatarKey?: string | null;
              }>
          >)
        | null;
}): Promise<boolean> {
    const shareLinkDeleteMatch = input.url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share\/([^/]+)$/,
    );
    if (shareLinkDeleteMatch && input.req.method === "DELETE") {
        const calendarId = decodeURIComponent(shareLinkDeleteMatch[1]);
        const shareId = decodeURIComponent(shareLinkDeleteMatch[2]);
        const calendar = input.gateway.getOwnedCalendar(
            input.claims.sub,
            calendarId,
        );
        if (!calendar) {
            sendCalendarError(
                input.res,
                "not_found",
                "Calendar not found.",
                404,
            );
            return true;
        }
        await input.shareRegistry.deleteShareLink({
            ownerAccountId: input.claims.sub,
            calendarId,
            shareId,
        });
        const shareLinks = await input.shareRegistry.listShareLinks(
            input.claims.sub,
            calendarId,
        );
        sendJson(input.res, 200, {
            data: shareLinks.map((shareLink) =>
                buildCalendarShareData({
                    shareLink,
                    externalHost: input.externalHost,
                }),
            ),
        });
        return true;
    }

    const shareCalendarMatch = input.url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share$/,
    );
    if (shareCalendarMatch && input.req.method === "GET") {
        const calendarId = decodeURIComponent(shareCalendarMatch[1]);
        const shareLinks = await input.shareRegistry.listShareLinks(
            input.claims.sub,
            calendarId,
        );
        sendJson(input.res, 200, {
            data: shareLinks.map((shareLink) =>
                buildCalendarShareData({
                    shareLink,
                    externalHost: input.externalHost,
                }),
            ),
        });
        return true;
    }
    if (shareCalendarMatch && input.req.method === "POST") {
        const calendarId = decodeURIComponent(shareCalendarMatch[1]);
        const body = (await readJson(input.req)) as {
            expiresInHours?: unknown;
            name?: unknown;
        };
        const shareName =
            typeof body.name === "string" && body.name.trim()
                ? body.name.trim()
                : createCalendarShareName();
        const calendar = input.gateway.getOwnedCalendar(
            input.claims.sub,
            calendarId,
        );
        if (!calendar) {
            sendCalendarError(
                input.res,
                "not_found",
                "Calendar not found.",
                404,
            );
            return true;
        }
        await input.shareRegistry.createShareLink({
            ownerAccountId: input.claims.sub,
            calendarId,
            name: shareName,
            passphrase:
                calendar.visibility === "private"
                    ? createCalendarSharePassphrase()
                    : null,
            expiresAt: resolveShareExpiry(body.expiresInHours),
        });
        const shareLinks = await input.shareRegistry.listShareLinks(
            input.claims.sub,
            calendarId,
        );
        sendJson(input.res, 200, {
            data: shareLinks.map((shareLink) =>
                buildCalendarShareData({
                    shareLink,
                    externalHost: input.externalHost,
                }),
            ),
        });
        return true;
    }

    const shareUsersUpdateMatch = input.url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share\/users\/([^/]+)$/,
    );
    const shareUsersMatch = input.url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share\/users$/,
    );
    if (!shareUsersMatch && !shareUsersUpdateMatch) return false;
    const ownerCalendarId = decodeURIComponent(
        shareUsersMatch?.[1] ?? shareUsersUpdateMatch?.[1] ?? "",
    );
    const ownerCalendar = input.gateway.getOwnedCalendar(
        input.claims.sub,
        ownerCalendarId,
    );
    if (!ownerCalendar) {
        sendCalendarError(input.res, "not_found", "Calendar not found.", 404);
        return true;
    }
    if (input.req.method === "GET") {
        const query = String(input.url.searchParams.get("q") ?? "").trim();
        if (query) {
            const users = input.resolveShareableUsers
                ? await input.resolveShareableUsers({
                      ownerAccountId: input.claims.sub,
                      query,
                  })
                : [];
            sendJson(input.res, 200, { data: users });
            return true;
        }
        const shares = await input.shareRegistry.listCalendarUserShares(
            input.claims.sub,
            ownerCalendarId,
        );
        sendJson(input.res, 200, {
            data: shares.map((share) => ({
                accountId: share.recipientAccountId,
                handle: share.recipientHandle,
                displayName: share.recipientDisplayName,
                avatarKey: share.recipientAvatarKey,
                permission: share.permission,
                shareId: share.id,
                expiresAt: share.expiresAt,
            })),
        });
        return true;
    }
    if (shareUsersUpdateMatch && input.req.method === "PATCH") {
        const shareSelector = decodeURIComponent(shareUsersUpdateMatch[2]);
        const shares = await input.shareRegistry.listCalendarUserShares(
            input.claims.sub,
            ownerCalendarId,
        );
        const targetShare = shares.find(
            (share) =>
                share.id === shareSelector ||
                share.recipientAccountId === shareSelector,
        );
        if (!targetShare) {
            sendCalendarError(input.res, "not_found", "Share not found.", 404);
            return true;
        }
        const body = (await readJson(input.req)) as Record<string, unknown>;
        const normalizedPermission = normalizeSharePermission(body.permission);
        const updatedShare = await input.shareRegistry.updateCalendarUserShare({
            ownerAccountId: input.claims.sub,
            ownerCalendarId,
            shareId: targetShare.id,
            permission: normalizedPermission,
            expiresAt:
                body.expiresInHours === undefined
                    ? undefined
                    : resolveShareExpiry(body.expiresInHours),
        });
        if (!updatedShare) {
            sendCalendarError(input.res, "not_found", "Share not found.", 404);
            return true;
        }
        sendJson(input.res, 200, {
            data: {
                accountId: updatedShare.recipientAccountId,
                handle: updatedShare.recipientHandle,
                displayName: updatedShare.recipientDisplayName,
                avatarKey: updatedShare.recipientAvatarKey,
                permission: updatedShare.permission,
                shareId: updatedShare.id,
                expiresAt: updatedShare.expiresAt,
            },
        });
        return true;
    }
    if (shareUsersUpdateMatch && input.req.method === "DELETE") {
        const shareId = decodeURIComponent(shareUsersUpdateMatch[2]);
        const deleted = await input.shareRegistry.deleteCalendarUserShare({
            ownerAccountId: input.claims.sub,
            ownerCalendarId,
            shareId,
        });
        if (!deleted) {
            sendCalendarError(input.res, "not_found", "Share not found.", 404);
            return true;
        }
        sendJson(input.res, 200, { data: { deleted: true } });
        return true;
    }
    if (input.req.method !== "POST") return false;
    const body = (await readJson(input.req)) as Record<string, unknown>;
    const recipientAccountId = String(body.recipientAccountId ?? "").trim();
    if (!recipientAccountId) {
        sendCalendarError(
            input.res,
            "validation_error",
            "Recipient account is required.",
            400,
        );
        return true;
    }
    if (recipientAccountId === input.claims.sub) {
        sendCalendarError(
            input.res,
            "forbidden",
            "Cannot share with yourself.",
            403,
        );
        return true;
    }
    let recipientCalendarId = (
        await input.shareRegistry.listCalendarUserShares(
            input.claims.sub,
            ownerCalendarId,
        )
    ).find(
        (share) => share.recipientAccountId === recipientAccountId,
    )?.recipientCalendarId;
    if (!recipientCalendarId) {
        const createdCalendar = input.gateway.createCalendar({
            ownerAccountId: recipientAccountId,
            name: `${ownerCalendar.name} (Shared by ${input.claims.sub})`,
            visibility: "shared",
            color: normalizeCalendarColor(ownerCalendar.color),
        });
        recipientCalendarId = createdCalendar.id;
    }
    try {
        const share = await input.shareRegistry.upsertCalendarUserShare({
            ownerAccountId: input.claims.sub,
            ownerCalendarId,
            recipientAccountId,
            recipientCalendarId,
            recipientHandle:
                typeof body.recipientHandle === "string"
                    ? body.recipientHandle
                    : null,
            recipientDisplayName:
                typeof body.recipientDisplayName === "string"
                    ? body.recipientDisplayName
                    : null,
            recipientAvatarKey:
                typeof body.recipientAvatarKey === "string"
                    ? body.recipientAvatarKey
                    : null,
            permission: "read",
            expiresAt:
                body.expiresInHours === undefined
                    ? ""
                    : resolveShareExpiry(body.expiresInHours),
        });
        sendJson(input.res, 200, {
            data: {
                ...share,
                calendarId: share.recipientCalendarId,
            },
        });
    } catch (error) {
        sendCalendarError(
            input.res,
            "internal_error",
            errorMessage(error),
            500,
        );
    }
    return true;
}
