import { createHmac } from "node:crypto";
import { registerApiRoutes } from "./api/index.js";
import {
    getWhiteboardConfig,
    setWhiteboardConfig,
} from "./api/config-state.js";

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
    setWhiteboardConfig({
        whiteboardUrl: process.env.NEXTCLOUD_WHITEBOARD_URL ?? "",
        whiteboardSecret: process.env.NEXTCLOUD_WHITEBOARD_SECRET ?? "",
        tokenExpirySeconds:
            process.env.NEXTCLOUD_WHITEBOARD_TOKEN_EXPIRY_SECONDS,
    });

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
    }
}
