import { randomUUID } from "node:crypto";
import { signJwtHs256 } from "../../../api/reuse/jwt.js";
import { createUrlSafeRandomToken } from "../../../api/reuse/random-token.js";
import {
    normalizeCollapsedText,
    normalizeLeadingSlashPath,
} from "../../../api/reuse/text-normalizers.js";
import { normalizeHttpUrl } from "../../../api/reuse/url-parts.js";
import {
    normalizeHandleKey,
    normalizeHandleKeys,
} from "../../../gateways/social/bootstrap.js";

export class NextcloudWhiteboardStore {
    constructor({ db, log }) {
        this.db = db;
        this.log = log;
    }

    async ensureSchema() {
        await this.db.ensureTable({
            name: "nextcloud_whiteboard_config",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "instance_url", type: "text", notNull: true },
                {
                    name: "server_url",
                    type: "text",
                    notNull: true,
                    default: "",
                },
                { name: "api_key", type: "text", notNull: true },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });
        await this.db.ensureTable({
            name: "nextcloud_whiteboards",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "title", type: "text", notNull: true },
                { name: "external_path", type: "text", notNull: true },
                {
                    name: "access_token",
                    type: "text",
                    unique: true,
                    notNull: true,
                },
                { name: "created_by", type: "text", notNull: true },
                {
                    name: "created_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });
        await this.db.ensureTable({
            name: "nextcloud_whiteboard_access",
            columns: [
                { name: "whiteboard_id", type: "text", notNull: true },
                { name: "username", type: "text", notNull: true },
                { name: "role", type: "text", notNull: true },
                {
                    name: "granted_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            primaryKey: ["whiteboard_id", "username"],
        });
    }

    async getConfig() {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "nextcloud_whiteboard_config",
            where: [{ column: "id", value: "default" }],
            limit: 1,
        });
        const row = result.rows?.[0];
        return {
            instanceUrl: row?.instance_url ? String(row.instance_url) : "",
            serverUrl: row?.server_url ? String(row.server_url) : "",
            apiKeyConfigured: Boolean(row?.api_key),
            apiKey: row?.api_key ? String(row.api_key) : "",
            updatedAt: row?.updated_at ? String(row.updated_at) : null,
        };
    }

    async saveConfig({ instanceUrl, serverUrl, apiKey }) {
        const normalizedInstanceUrl = normalizeHttpUrl(instanceUrl);
        const normalizedServerUrl = normalizeHttpUrl(serverUrl);
        const normalizedApiKey = String(apiKey ?? "").trim();
        if (normalizedApiKey.length < 16) {
            throw new Error(
                "API key must be at least 16 characters for sufficient security.",
            );
        }
        const updatedAt = new Date().toISOString();
        await this.db.executeCommand({
            option: "INSERT",
            table: "nextcloud_whiteboard_config",
            values: {
                id: "default",
                instance_url: normalizedInstanceUrl,
                server_url: normalizedServerUrl,
                api_key: normalizedApiKey,
                updated_at: updatedAt,
            },
            onConflict: {
                columns: ["id"],
                merge: ["instance_url", "server_url", "api_key", "updated_at"],
            },
        });
        return this.getConfig();
    }

    async createWhiteboard({ title, createdBy, participants, externalPath }) {
        const id = randomUUID();
        const normalizedCreator = normalizeHandleKey(createdBy);
        const normalizedParticipants = normalizeHandleKeys([
            normalizedCreator,
            ...(Array.isArray(participants) ? participants : []),
        ]);
        const accessToken = createUrlSafeRandomToken(18);
        const resolvedPath = normalizeLeadingSlashPath(
            externalPath || `/apps/whiteboard/${id}.whiteboard`,
        );
        const now = new Date().toISOString();
        await this.db.transaction(async (executor) => {
            await executor.executeCommand({
                option: "INSERT",
                table: "nextcloud_whiteboards",
                values: {
                    id,
                    title: normalizeCollapsedText(title, "Cognis Whiteboard"),
                    external_path: resolvedPath,
                    access_token: accessToken,
                    created_by: normalizedCreator,
                    created_at: now,
                    updated_at: now,
                },
            });
            for (const username of normalizedParticipants) {
                await executor.executeCommand({
                    option: "INSERT",
                    table: "nextcloud_whiteboard_access",
                    values: {
                        whiteboard_id: id,
                        username,
                        role:
                            username === normalizedCreator ? "owner" : "editor",
                        granted_at: now,
                    },
                    onConflict: {
                        columns: ["whiteboard_id", "username"],
                        merge: ["role", "granted_at"],
                    },
                });
            }
        });
        return this.getWhiteboardById(id);
    }

    async getWhiteboardById(id) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "nextcloud_whiteboards",
            where: [{ column: "id", value: String(id ?? "") }],
            limit: 1,
        });
        return this.mapBoard(result.rows?.[0]);
    }

    async listAccessibleWhiteboards(username) {
        const normalizedUsername = normalizeHandleKey(username);
        const access = await this.db.executeCommand({
            option: "SELECT",
            table: "nextcloud_whiteboard_access",
            where: [{ column: "username", value: normalizedUsername }],
        });
        const boards = [];
        for (const row of access.rows ?? []) {
            const board = await this.getWhiteboardById(row.whiteboard_id);
            if (board)
                boards.push({ ...board, role: String(row.role ?? "viewer") });
        }
        return boards.sort((left, right) =>
            right.updatedAt.localeCompare(left.updatedAt),
        );
    }

    async canAccessWhiteboard(id, username) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "nextcloud_whiteboard_access",
            where: [
                { column: "whiteboard_id", value: String(id ?? "") },
                { column: "username", value: normalizeHandleKey(username) },
            ],
            limit: 1,
        });
        return Boolean(result.rows?.[0]);
    }

    mintSessionToken(config, board, user) {
        const now = Math.floor(Date.now() / 1000);
        return signJwtHs256(
            {
                fileId: board.id,
                user: {
                    id: String(user.id),
                    name: String(user.name || user.id),
                },
                isFileReadOnly: Boolean(user.readOnly),
                iat: now,
                exp: now + 3600,
            },
            config.apiKey,
        );
    }

    mapBoard(row) {
        if (!row) return null;
        return {
            id: String(row.id),
            title: String(row.title),
            externalPath: String(row.external_path),
            accessToken: String(row.access_token),
            createdBy: String(row.created_by),
            createdAt: String(row.created_at),
            updatedAt: String(row.updated_at),
        };
    }
}
