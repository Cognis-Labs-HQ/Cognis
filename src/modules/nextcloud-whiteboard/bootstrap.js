import { createHmac } from "node:crypto";
import { registerApiRoutes } from "./api/index.js";
import { getWhiteboardConfig } from "./api/config-state.js";

function mintToken(secret, payload) {
    const header = Buffer.from(
        JSON.stringify({ alg: "HS256", typ: "JWT" }),
    ).toString("base64url");
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const sig = createHmac("sha256", secret)
        .update(`${header}.${body}`)
        .digest("base64url");
    return `${header}.${body}.${sig}`;
}

export function bootstrapModule(ctx) {
    registerApiRoutes(ctx.router, ctx);

    const systemCtx = ctx.getCapability("system:ctx");
    if (systemCtx) {
        /**
         * Returns the Nextcloud Whiteboard embed URL for a user, or null if the
         * service is not configured.
         *
         * @param {string} boardId - The whiteboard room identifier.
         * @param {string} userId - The authenticated user's ID.
         * @param {string} userName - The authenticated user's display name.
         * @returns {Promise<string | null>}
         */
        systemCtx.contributePublicCapability(
            "whiteboard:getEmbedUrl",
            async (boardId, userId, userName) => {
                const config = getWhiteboardConfig();
                if (!config.whiteboardUrl || !config.whiteboardSecret)
                    return null;
                const now = Math.floor(Date.now() / 1000);
                const token = mintToken(config.whiteboardSecret, {
                    user: { id: userId, name: userName },
                    room: boardId,
                    iat: now,
                    exp: now + config.tokenExpirySeconds,
                });
                return `${config.whiteboardUrl.replace(/\/$/, "")}?token=${token}`;
            },
        );

        /**
         * URL of the classroom whiteboard window UI script served by this
         * module. Consumed by the Study classes adapter to inject a meta tag
         * so the classroom page can dynamically import the factory without a
         * hardcoded static import.
         */
        systemCtx.contributePublicCapability(
            "whiteboard:classroomWindowScriptUrl",
            "/static/modules/nextcloud-whiteboard/classroom-whiteboard-window.js",
        );

        /**
         * Fetches the raw JSON data for a whiteboard from the Nextcloud
         * Whiteboard server-to-server API, or returns null if not configured.
         *
         * @param {string} boardId - The whiteboard room identifier.
         * @returns {Promise<string | null>}
         */
        systemCtx.contributePublicCapability(
            "whiteboard:fetchBoardData",
            async (boardId) => {
                const config = getWhiteboardConfig();
                if (!config.whiteboardUrl || !config.whiteboardSecret)
                    return null;
                const serverToken = mintToken(config.whiteboardSecret, {
                    user: { id: "server", name: "server" },
                    room: boardId,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60,
                });
                const baseUrl = config.whiteboardUrl.replace(/\/$/, "");
                const response = await fetch(
                    `${baseUrl}/api/v1/rooms/${boardId}/data`,
                    {
                        method: "GET",
                        headers: { Authorization: "Bearer " + serverToken },
                    },
                );
                if (!response.ok) return null;
                return response.text();
            },
        );

        /**
         * Returns an embed URL with a user-scoped JWT for the given board in the
         * context of a classroom, enforcing the classroom's active-whiteboard
         * visibility policy for students. Teachers always receive an embed URL;
         * students only receive one when the board matches the teacher-selected
         * active board.
         *
         * @param {object} input
         * @param {string} input.classId - The classroom identifier.
         * @param {string} input.boardId - The whiteboard room identifier.
         * @param {string} input.userId - The authenticated user's ID.
         * @param {string} input.userName - The authenticated user's display name.
         * @param {boolean} input.isTeacher - Whether the requesting user is the class teacher.
         * @returns {Promise<{embedUrl: string} | {error: string}>}
         */
        systemCtx.contributePublicCapability(
            "whiteboard:getClassroomBoardEmbed",
            async ({ classId, boardId, userId, userName, isTeacher }) => {
                if (!isTeacher) {
                    const classResources = systemCtx.capabilities.get(
                        "study:classes:resources",
                    );
                    const activeId =
                        await classResources?.getActiveWhiteboardId?.(
                            classId,
                            userId,
                        );
                    if (!activeId || activeId !== boardId) {
                        return { error: "not_active" };
                    }
                }
                const config = getWhiteboardConfig();
                if (!config.whiteboardUrl || !config.whiteboardSecret) {
                    return { error: "not_configured" };
                }
                const now = Math.floor(Date.now() / 1000);
                const token = mintToken(config.whiteboardSecret, {
                    user: { id: userId, name: userName },
                    room: boardId,
                    iat: now,
                    exp: now + config.tokenExpirySeconds,
                });
                const embedUrl = `${config.whiteboardUrl.replace(/\/$/, "")}?token=${token}`;
                return { embedUrl };
            },
        );
    }
}
