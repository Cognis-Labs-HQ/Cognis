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
        { name: "room_slug", type: "text", notNull: true, unique: true },
        {
            name: "participant_a",
            type: "text",
            notNull: true,
            references: {
                table: "accounts",
                column: "id",
                onDelete: "CASCADE",
            },
        },
        {
            name: "participant_b",
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
    uniqueKeys: [["participant_a", "participant_b"]],
};

function normalizeParticipantPair(firstAccountId, secondAccountId) {
    const normalized = [String(firstAccountId), String(secondAccountId)]
        .map((accountId) => accountId.trim())
        .filter(Boolean)
        .sort((leftAccountId, rightAccountId) =>
            leftAccountId.localeCompare(rightAccountId),
        );
    if (normalized.length !== 2 || normalized[0] === normalized[1]) {
        return null;
    }
    return normalized;
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

    createRoomSlug(firstAccountId, secondAccountId) {
        const pair = normalizeParticipantPair(firstAccountId, secondAccountId);
        if (!pair) return null;
        const digest = createHash("sha256")
            .update(`${pair[0]}:${pair[1]}:${this.roomSecret}`)
            .digest("hex");
        return `cognis-${digest.slice(0, 18)}`;
    }

    async findMeetingByParticipants(firstAccountId, secondAccountId) {
        const pair = normalizeParticipantPair(firstAccountId, secondAccountId);
        if (!pair) return null;
        const selectResult = await this.dbExecutor.executeCommand({
            option: "SELECT",
            table: "jitsi_meetings",
            columns: [
                "id",
                "room_slug",
                "participant_a",
                "participant_b",
                "created_at",
                "updated_at",
            ],
            where: [
                { column: "participant_a", value: pair[0] },
                { column: "participant_b", value: pair[1] },
            ],
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
                "room_slug",
                "participant_a",
                "participant_b",
                "created_at",
                "updated_at",
            ],
            where: [{ column: "id", value: String(meetingId ?? "") }],
            limit: 1,
        });
        return selectResult.rows?.[0] ?? null;
    }

    async createMeeting(firstAccountId, secondAccountId) {
        const pair = normalizeParticipantPair(firstAccountId, secondAccountId);
        if (!pair) {
            throw new Error("Exactly two different participants are required.");
        }

        const existingMeeting = await this.findMeetingByParticipants(
            pair[0],
            pair[1],
        );
        if (existingMeeting) {
            await this.touchMeeting(existingMeeting.id);
            return existingMeeting;
        }

        const meetingId = randomUUID();
        const roomSlug = this.createRoomSlug(pair[0], pair[1]);
        const timestamp = new Date().toISOString();

        await this.dbExecutor.executeCommand({
            option: "INSERT",
            table: "jitsi_meetings",
            values: {
                id: meetingId,
                room_slug: roomSlug,
                participant_a: pair[0],
                participant_b: pair[1],
                created_at: timestamp,
                updated_at: timestamp,
            },
        });

        return this.findMeetingById(meetingId);
    }

    async touchMeeting(meetingId) {
        await this.dbExecutor.executeCommand({
            option: "UPDATE",
            table: "jitsi_meetings",
            set: [{ column: "updated_at", value: new Date().toISOString() }],
            where: [{ column: "id", value: String(meetingId ?? "") }],
        });
    }
}
