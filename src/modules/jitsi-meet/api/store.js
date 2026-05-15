import { createHash, randomUUID } from "node:crypto";

const SETTINGS_TABLE = {
    name: "jitsi_meet_settings",
    columns: [
        { name: "key", type: "text", notNull: true, primaryKey: true },
        { name: "value", type: "text", notNull: true },
        {
            name: "updated_at",
            type: "timestamp",
            notNull: true,
            default: "now",
        },
    ],
};

const MEETINGS_TABLE = {
    name: "jitsi_meetings",
    columns: [
        { name: "id", type: "text", notNull: true, primaryKey: true },
        { name: "entity_key", type: "text", notNull: true, unique: true },
        { name: "entity_type", type: "text", notNull: true },
        { name: "entity_id", type: "text" },
        { name: "title", type: "text", notNull: true },
        { name: "room_slug", type: "text", notNull: true, unique: true },
        {
            name: "owner_account_id",
            type: "text",
            notNull: true,
            references: {
                table: "accounts",
                column: "id",
                onDelete: "CASCADE",
            },
        },
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
};

const MEMBERS_TABLE = {
    name: "jitsi_meeting_members",
    columns: [
        {
            name: "meeting_id",
            type: "text",
            notNull: true,
            references: {
                table: "jitsi_meetings",
                column: "id",
                onDelete: "CASCADE",
            },
        },
        {
            name: "account_id",
            type: "text",
            notNull: true,
            references: {
                table: "accounts",
                column: "id",
                onDelete: "CASCADE",
            },
        },
        { name: "added_at", type: "timestamp", notNull: true, default: "now" },
    ],
    primaryKey: ["meeting_id", "account_id"],
};

function normalizeParticipantIds(participantAccountIds) {
    return Array.from(
        new Set(
            (Array.isArray(participantAccountIds) ? participantAccountIds : [])
                .map((accountId) => String(accountId).trim())
                .filter(Boolean),
        ),
    ).sort((leftAccountId, rightAccountId) =>
        leftAccountId.localeCompare(rightAccountId),
    );
}

export class JitsiMeetStore {
    constructor(dbExecutor, roomSecret) {
        this.dbExecutor = dbExecutor;
        this.roomSecret =
            String(roomSecret ?? "").trim() || randomUUID().replaceAll("-", "");
    }

    async ensureSchema() {
        await this.dbExecutor.ensureTable(SETTINGS_TABLE);
        await this.dbExecutor.ensureTable(MEETINGS_TABLE);
        await this.dbExecutor.ensureTable(MEMBERS_TABLE);
    }

    async getSettings() {
        const selectResult = await this.dbExecutor.executeCommand({
            option: "SELECT",
            table: "jitsi_meet_settings",
            columns: ["key", "value"],
        });
        const settings = {};
        for (const row of selectResult.rows ?? []) {
            settings[row.key] = row.value;
        }
        return settings;
    }

    async setSetting(key, value) {
        await this.dbExecutor.executeCommand({
            option: "UPSERT",
            table: "jitsi_meet_settings",
            conflict: { target: ["key"], action: "update" },
            values: {
                key,
                value: String(value ?? ""),
                updated_at: new Date().toISOString(),
            },
        });
    }

    createEntityKey(input) {
        const entityType = String(input?.entityType ?? "pair").trim() || "pair";
        const entityId = String(input?.entityId ?? "").trim();
        const participantIds = normalizeParticipantIds(
            input?.participantAccountIds,
        );

        if (entityType === "pair" && participantIds.length === 2) {
            return {
                entityKey: `pair:${participantIds[0]}:${participantIds[1]}`,
                entityType,
                entityId: `${participantIds[0]}:${participantIds[1]}`,
                participantIds,
            };
        }

        if (!entityId) {
            throw new Error("entityId is required for non-pair meetings.");
        }

        return {
            entityKey: `${entityType}:${entityId}`,
            entityType,
            entityId,
            participantIds,
        };
    }

    createRoomSlug(entityKey) {
        const digest = createHash("sha256")
            .update(`${String(entityKey)}:${this.roomSecret}`)
            .digest("hex");
        return `cognis-${digest.slice(0, 18)}`;
    }

    async findMeetingByEntityKey(entityKey) {
        const selectResult = await this.dbExecutor.executeCommand({
            option: "SELECT",
            table: "jitsi_meetings",
            columns: [
                "id",
                "entity_key",
                "entity_type",
                "entity_id",
                "title",
                "room_slug",
                "owner_account_id",
                "created_at",
                "updated_at",
            ],
            where: [{ column: "entity_key", value: String(entityKey ?? "") }],
            limit: 1,
        });
        return selectResult.rows?.[0] ?? null;
    }

    async findMeetingById(meetingId) {
        const selectResult = await this.dbExecutor.executeCommand({
            option: "SELECT",
            table: "jitsi_meetings",
            columns: [
                "id",
                "entity_key",
                "entity_type",
                "entity_id",
                "title",
                "room_slug",
                "owner_account_id",
                "created_at",
                "updated_at",
            ],
            where: [{ column: "id", value: String(meetingId ?? "") }],
            limit: 1,
        });
        return selectResult.rows?.[0] ?? null;
    }

    async listMeetingMembers(meetingId) {
        const selectResult = await this.dbExecutor.executeCommand({
            option: "SELECT",
            table: "jitsi_meeting_members",
            columns: ["meeting_id", "account_id", "added_at"],
            where: [{ column: "meeting_id", value: String(meetingId ?? "") }],
            orderBy: [{ column: "added_at", direction: "ASC" }],
        });
        return selectResult.rows ?? [];
    }

    async replaceMeetingMembers(meetingId, participantAccountIds) {
        await this.dbExecutor.executeCommand({
            option: "DELETE",
            table: "jitsi_meeting_members",
            where: [{ column: "meeting_id", value: String(meetingId ?? "") }],
        });

        const timestamp = new Date().toISOString();
        for (const participantAccountId of normalizeParticipantIds(
            participantAccountIds,
        )) {
            await this.dbExecutor.executeCommand({
                option: "INSERT",
                table: "jitsi_meeting_members",
                values: {
                    meeting_id: String(meetingId ?? ""),
                    account_id: participantAccountId,
                    added_at: timestamp,
                },
            });
        }
    }

    async touchMeeting(meetingId) {
        await this.dbExecutor.executeCommand({
            option: "UPDATE",
            table: "jitsi_meetings",
            set: [{ column: "updated_at", value: new Date().toISOString() }],
            where: [{ column: "id", value: String(meetingId ?? "") }],
        });
    }

    async upsertMeeting(input) {
        const normalized = this.createEntityKey(input);
        const ownerAccountId = String(input?.ownerAccountId ?? "").trim();
        const title =
            String(input?.title ?? "").trim() ||
            String(input?.defaultTitle ?? "Cognis Meeting").trim() ||
            "Cognis Meeting";

        if (!ownerAccountId) {
            throw new Error("ownerAccountId is required.");
        }

        const participantIds = normalizeParticipantIds([
            ownerAccountId,
            ...normalized.participantIds,
        ]);

        if (participantIds.length < 2) {
            throw new Error("At least two participants are required.");
        }

        const existingMeeting = await this.findMeetingByEntityKey(
            normalized.entityKey,
        );
        if (existingMeeting) {
            await this.dbExecutor.executeCommand({
                option: "UPDATE",
                table: "jitsi_meetings",
                set: [
                    { column: "title", value: title },
                    { column: "updated_at", value: new Date().toISOString() },
                ],
                where: [{ column: "id", value: existingMeeting.id }],
            });
            await this.replaceMeetingMembers(
                existingMeeting.id,
                participantIds,
            );
            const refreshedMeeting = await this.findMeetingById(
                existingMeeting.id,
            );
            const members = await this.listMeetingMembers(existingMeeting.id);
            return { meeting: refreshedMeeting, members };
        }

        const meetingId = randomUUID();
        const timestamp = new Date().toISOString();
        const roomSlug = this.createRoomSlug(normalized.entityKey);

        await this.dbExecutor.executeCommand({
            option: "INSERT",
            table: "jitsi_meetings",
            values: {
                id: meetingId,
                entity_key: normalized.entityKey,
                entity_type: normalized.entityType,
                entity_id: normalized.entityId,
                title,
                room_slug: roomSlug,
                owner_account_id: ownerAccountId,
                created_at: timestamp,
                updated_at: timestamp,
            },
        });

        await this.replaceMeetingMembers(meetingId, participantIds);

        const meeting = await this.findMeetingById(meetingId);
        const members = await this.listMeetingMembers(meetingId);
        return { meeting, members };
    }

    async isMeetingMember(meetingId, accountId) {
        const selectResult = await this.dbExecutor.executeCommand({
            option: "SELECT",
            table: "jitsi_meeting_members",
            columns: ["meeting_id"],
            where: [
                { column: "meeting_id", value: String(meetingId ?? "") },
                { column: "account_id", value: String(accountId ?? "") },
            ],
            limit: 1,
        });
        return Boolean(selectResult.rows?.[0]);
    }
}
