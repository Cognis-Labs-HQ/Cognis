import { createHmac } from "node:crypto";

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
    const whiteboardUrl = process.env.NEXTCLOUD_WHITEBOARD_URL ?? "";
    const whiteboardSecret = process.env.NEXTCLOUD_WHITEBOARD_SECRET ?? "";

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
                if (!whiteboardUrl || !whiteboardSecret) return null;
                const now = Math.floor(Date.now() / 1000);
                const token = mintToken(whiteboardSecret, {
                    user: { id: userId, name: userName },
                    room: boardId,
                    iat: now,
                    exp: now + 3600,
                });
                return `${whiteboardUrl.replace(/\/$/, "")}?token=${token}`;
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
                if (!whiteboardUrl || !whiteboardSecret) return null;
                const serverToken = mintToken(whiteboardSecret, {
                    user: { id: "server", name: "server" },
                    room: boardId,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60,
                });
                const baseUrl = whiteboardUrl.replace(/\/$/, "");
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
