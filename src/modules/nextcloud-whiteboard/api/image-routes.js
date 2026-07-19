import { readJson } from "../../../api/reuse/read-json.js";
import { requireAuth } from "../../../gateways/shared.js";
import { sendError, sendJson } from "../../../api/reuse/http-response.js";

function decodeImageDataUrl(dataUrl) {
    const match = String(dataUrl ?? "").match(
        /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\n\r]+)$/,
    );
    if (!match) return null;
    return {
        contentType: match[1].toLowerCase(),
        bytes: Buffer.from(match[2].replace(/[\r\n]/g, ""), "base64"),
    };
}

function whiteboardImageUrl(whiteboardId, key) {
    return `/api/v1/modules/nextcloud-whiteboard/whiteboards/images?id=${encodeURIComponent(
        whiteboardId,
    )}&key=${encodeURIComponent(key)}`;
}

function inferImageContentType(key) {
    const extension = String(key ?? "")
        .split(".")
        .pop()
        ?.toLowerCase();
    if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
    if (["png", "gif", "webp", "svg"].includes(extension ?? "")) {
        return `image/${extension}`;
    }
    return "application/octet-stream";
}

export function registerWhiteboardImageRoutes(
    router,
    {
        store,
        profileStore,
        resolveShareGuestAccess,
        resolveWhiteboardUserAccess,
        whiteboardFiles,
    },
) {
    router.post(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/images",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            if (!whiteboardFiles) {
                sendError(
                    res,
                    503,
                    "file_storage_unavailable",
                    "Whiteboard image storage is unavailable.",
                );
                return;
            }
            const body = await readJson(req);
            const whiteboardId = String(body.id ?? "").trim();
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
                requireWrite: true,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            const decoded = decodeImageDataUrl(body.dataUrl);
            const config = await store.getConfig();
            if (!decoded || decoded.bytes.byteLength === 0) {
                sendError(
                    res,
                    400,
                    "bad_request",
                    "A base64 image data URL is required.",
                );
                return;
            }
            if (
                decoded.bytes.byteLength >
                Number(config.imageUploadMaxBytes ?? 1048576)
            ) {
                sendError(
                    res,
                    413,
                    "image_too_large",
                    "Image exceeds the configured upload limit.",
                );
                return;
            }
            const participants = await store.listParticipants(whiteboard.id);
            const groupIds = Array.from(
                new Set([
                    whiteboard.createdBy,
                    access.username,
                    ...participants,
                ]),
            );
            const stored = await whiteboardFiles.store(
                { actorId: access.username },
                decoded.bytes,
                { contentType: decoded.contentType, groupIds },
            );
            sendJson(res, 201, {
                data: {
                    key: stored.key,
                    url: whiteboardImageUrl(whiteboard.id, stored.key),
                    size: stored.size,
                    contentType: stored.contentType,
                },
            });
        },
        { access: { minRole: "user" } },
    );

    router.get(
        "/api/v1/modules/nextcloud-whiteboard/whiteboards/images",
        async (req, res) => {
            await store.ensureSchema();
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            if (!whiteboardFiles) {
                sendError(
                    res,
                    503,
                    "file_storage_unavailable",
                    "Whiteboard image storage is unavailable.",
                );
                return;
            }
            const url = new URL(req.url, "http://localhost");
            const whiteboardId = String(
                url.searchParams.get("id") ?? "",
            ).trim();
            const whiteboard = await store.getWhiteboardById(whiteboardId);
            if (!whiteboard) {
                sendError(res, 404, "not_found", "Whiteboard not found.");
                return;
            }
            const access = await resolveWhiteboardUserAccess({
                claims,
                profileStore,
                store,
                whiteboardId: whiteboard.id,
                resolveShareGuestAccess,
            });
            if (!access.authorized) {
                sendError(res, access.status, access.code, access.message);
                return;
            }
            const key = String(url.searchParams.get("key") ?? "").trim();
            const content = await whiteboardFiles.get(
                { actorId: access.username },
                key,
            );
            if (!content) {
                sendError(res, 404, "not_found", "Image not found.");
                return;
            }
            res.writeHead(200, {
                "content-type": inferImageContentType(key),
                "cache-control": "private, max-age=3600",
            });
            res.end(Buffer.from(content));
        },
        { access: { minRole: "user" } },
    );
}
