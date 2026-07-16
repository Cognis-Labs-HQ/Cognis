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

function serializePresenceSelection(selection) {
    const items = Array.isArray(selection?.items) ? selection.items : [];
    const normalizedItems = items
        .slice(0, 24)
        .map((item) => {
            const x = Number(item?.x);
            const y = Number(item?.y);
            const width = Number(item?.width);
            const height = Number(item?.height);
            if (
                !Number.isFinite(x) ||
                !Number.isFinite(y) ||
                !Number.isFinite(width) ||
                !Number.isFinite(height) ||
                width <= 0 ||
                height <= 0
            )
                return null;
            return { x, y, width, height };
        })
        .filter(Boolean);
    if (normalizedItems.length === 0) return null;
    return JSON.stringify({
        items: normalizedItems,
        updatedAt: new Date().toISOString(),
    });
}

function parsePresenceSelection(value) {
    const raw = String(value ?? "").trim();
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed?.items) || !parsed.items.length) return null;
        return {
            items: parsed.items,
            updatedAt: String(parsed.updatedAt ?? ""),
        };
    } catch {
        return null;
    }
}

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
                {
                    name: "server_url",
                    type: "text",
                    notNull: true,
                    default: "",
                },
                { name: "api_key", type: "text", notNull: true },
                {
                    name: "image_upload_max_bytes",
                    type: "integer",
                    notNull: true,
                    default: 1048576,
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
        await this.db.ensureTable({
            name: "nextcloud_whiteboard_presence",
            columns: [
                { name: "whiteboard_id", type: "text", notNull: true },
                { name: "username", type: "text", notNull: true },
                { name: "session_id", type: "text", notNull: true },
                { name: "display_name", type: "text", notNull: true },
                { name: "guest", type: "integer", notNull: true, default: 0 },
                { name: "active", type: "integer", notNull: true, default: 1 },
                { name: "pointer_x", type: "text" },
                { name: "pointer_y", type: "text" },
                { name: "pointer_style", type: "text" },
                { name: "pointer_updated_at", type: "timestamp" },
                { name: "selection_payload", type: "text" },
                {
                    name: "last_seen_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            primaryKey: ["whiteboard_id", "username", "session_id"],
        });
        await this.db.ensureTable({
            name: "nextcloud_whiteboard_snapshots",
            columns: [
                { name: "whiteboard_id", type: "text", primaryKey: true },
                {
                    name: "elements_json",
                    type: "text",
                    notNull: true,
                    default: "[]",
                },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
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
            serverUrl: row?.server_url ? String(row.server_url) : "",
            apiKeyConfigured: Boolean(row?.api_key),
            apiKey: row?.api_key ? String(row.api_key) : "",
            imageUploadMaxBytes: Number(row?.image_upload_max_bytes ?? 1048576),
            updatedAt: row?.updated_at ? String(row.updated_at) : null,
        };
    }

    async saveConfig({ serverUrl, apiKey, imageUploadMaxBytes }) {
        const normalizedServerUrl = normalizeHttpUrl(serverUrl);
        const normalizedApiKey = String(apiKey ?? "").trim();
        const normalizedImageUploadMaxBytes = Math.max(
            0,
            Number(imageUploadMaxBytes ?? 1048576),
        );
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
                server_url: normalizedServerUrl,
                api_key: normalizedApiKey,
                image_upload_max_bytes: normalizedImageUploadMaxBytes,
                updated_at: updatedAt,
            },
            conflict: {
                action: "update",
                target: ["id"],
                update: {
                    server_url: normalizedServerUrl,
                    api_key: normalizedApiKey,
                    image_upload_max_bytes: normalizedImageUploadMaxBytes,
                    updated_at: updatedAt,
                },
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
                    conflict: {
                        action: "update",
                        target: ["whiteboard_id", "username"],
                        update: {
                            role:
                                username === normalizedCreator
                                    ? "owner"
                                    : "editor",
                            granted_at: now,
                        },
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

    async renameWhiteboard(id, title) {
        const normalizedTitle = normalizeCollapsedText(
            title,
            "Cognis Whiteboard",
        );
        const updatedAt = new Date().toISOString();
        await this.db.executeCommand({
            option: "UPDATE",
            table: "nextcloud_whiteboards",
            set: { title: normalizedTitle, updated_at: updatedAt },
            where: [{ column: "id", value: String(id ?? "") }],
        });
        return this.getWhiteboardById(id);
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

    async upsertPresence({
        whiteboardId,
        username,
        sessionId,
        displayName,
        guest,
        active = true,
        pointer = null,
        selection = null,
    }) {
        const timestamp = new Date().toISOString();
        const pointerX = Number(pointer?.x);
        const pointerY = Number(pointer?.y);
        const pointerUpdatedAt = String(pointer?.updatedAt ?? "").trim();
        const hasPointer =
            Number.isFinite(pointerX) &&
            Number.isFinite(pointerY) &&
            !Number.isNaN(Date.parse(pointerUpdatedAt));
        const selectionPayload = serializePresenceSelection(selection);
        await this.db.executeCommand({
            option: "INSERT",
            table: "nextcloud_whiteboard_presence",
            values: {
                whiteboard_id: String(whiteboardId ?? ""),
                username: String(username ?? ""),
                session_id: String(sessionId ?? ""),
                display_name: String(displayName || username || "Guest"),
                guest: guest ? 1 : 0,
                active: active ? 1 : 0,
                pointer_x: hasPointer ? String(pointerX) : null,
                pointer_y: hasPointer ? String(pointerY) : null,
                pointer_style: hasPointer
                    ? String(pointer?.style || "mouse").trim() || "mouse"
                    : null,
                pointer_updated_at: hasPointer ? pointerUpdatedAt : null,
                selection_payload: selectionPayload,
                last_seen_at: timestamp,
            },
            conflict: {
                action: "update",
                target: ["whiteboard_id", "username", "session_id"],
            },
        });
        return timestamp;
    }

    async listPresence(whiteboardId) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "nextcloud_whiteboard_presence",
            where: [
                { column: "whiteboard_id", value: String(whiteboardId ?? "") },
            ],
            orderBy: [{ column: "last_seen_at", direction: "DESC" }],
        });
        return (result.rows ?? []).map((row) => ({
            whiteboardId: String(row.whiteboard_id),
            username: String(row.username),
            sessionId: String(row.session_id),
            displayName: String(row.display_name || row.username),
            guest: Number(row.guest ?? 0) === 1,
            active: Number(row.active ?? 0) === 1,
            pointer:
                Number.isFinite(Number(row.pointer_x)) &&
                Number.isFinite(Number(row.pointer_y)) &&
                String(row.pointer_updated_at ?? "").trim()
                    ? {
                          x: Number(row.pointer_x),
                          y: Number(row.pointer_y),
                          style: String(row.pointer_style ?? "mouse"),
                          updatedAt: String(row.pointer_updated_at),
                      }
                    : null,
            selection: parsePresenceSelection(row.selection_payload),
            lastSeenAt: String(row.last_seen_at),
        }));
    }

    async getElementsSnapshot(id) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "nextcloud_whiteboard_snapshots",
            where: [{ column: "whiteboard_id", value: String(id ?? "") }],
            limit: 1,
        });
        const raw = result.rows?.[0]?.elements_json;
        if (!raw) return [];
        try {
            const parsed = JSON.parse(String(raw));
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }

    async saveElementsSnapshot(id, elements) {
        const safeElements = Array.isArray(elements) ? elements : [];
        const updatedAt = new Date().toISOString();
        await this.db.executeCommand({
            option: "INSERT",
            table: "nextcloud_whiteboard_snapshots",
            values: {
                whiteboard_id: String(id ?? ""),
                elements_json: JSON.stringify(safeElements),
                updated_at: updatedAt,
            },
            conflict: {
                action: "update",
                target: ["whiteboard_id"],
                update: {
                    elements_json: JSON.stringify(safeElements),
                    updated_at: updatedAt,
                },
            },
        });
        await this.db.executeCommand({
            option: "UPDATE",
            table: "nextcloud_whiteboards",
            set: { updated_at: updatedAt },
            where: [{ column: "id", value: String(id ?? "") }],
        });
        return { elements: safeElements, updatedAt };
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
