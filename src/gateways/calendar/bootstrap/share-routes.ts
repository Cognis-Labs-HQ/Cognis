import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../api/reuse/read-json.js";
import { normalizeCalendarColor } from "../color.js";
import type { CoreCalendarGateway } from "../gateway/index.js";
import {
    buildCalendarShareData,
    errorMessage,
    sendCalendarError,
    sendJson,
} from "./helpers.js";
import type { CalendarShareRegistry } from "./share-registry.js";

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
    const shareCalendarMatch = input.url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share$/,
    );
    if (shareCalendarMatch && input.req.method === "GET") {
        const calendarId = decodeURIComponent(shareCalendarMatch[1]);
        const shareLink = await input.shareRegistry.getShareLink(
            input.claims.sub,
            calendarId,
        );
        if (!shareLink) {
            sendJson(input.res, 200, { data: null });
            return true;
        }
        const shareData = buildCalendarShareData({
            gateway: input.gateway,
            ownerAccountId: input.claims.sub,
            calendarId,
            permission: "read",
            expiresInHours: null,
            tokenOverride: shareLink.token,
            externalHost: input.externalHost,
        });
        sendJson(input.res, 200, { data: shareData });
        return true;
    }
    if (shareCalendarMatch && input.req.method === "POST") {
        const calendarId = decodeURIComponent(shareCalendarMatch[1]);
        const body = (await readJson(input.req)) as {
            permission?: unknown;
            expiresInHours?: unknown;
            name?: unknown;
        };
        let shareLink = await input.shareRegistry.getShareLink(
            input.claims.sub,
            calendarId,
        );
        if (!shareLink) {
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
            const token =
                calendar.visibility === "public"
                    ? null
                    : input.gateway.issuePrivateExportToken({
                          ownerAccountId: input.claims.sub,
                          calendarId,
                          ttlSeconds: null,
                      }).token;
            shareLink = { token };
            await input.shareRegistry.saveShareLink({
                ownerAccountId: input.claims.sub,
                calendarId,
                token,
            });
        }
        const shareData = buildCalendarShareData({
            gateway: input.gateway,
            ownerAccountId: input.claims.sub,
            calendarId,
            permission: body.permission,
            expiresInHours: body.expiresInHours,
            name: typeof body.name === "string" ? body.name : undefined,
            tokenOverride: shareLink.token,
            externalHost: input.externalHost,
        });
        if (!shareData) {
            sendCalendarError(
                input.res,
                "not_found",
                "Calendar not found.",
                404,
            );
            return true;
        }
        sendJson(input.res, 200, { data: shareData });
        return true;
    }

    const shareUsersMatch = input.url.pathname.match(
        /^\/api\/v1\/calendar\/calendars\/([^/]+)\/share\/users$/,
    );
    if (!shareUsersMatch) return false;
    const ownerCalendarId = decodeURIComponent(shareUsersMatch[1]);
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
            })),
        });
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
            visibility: "shared" as any,
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
            permission: body.permission === "write" ? "write" : "read",
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
