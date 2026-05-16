import { createHash, randomBytes, randomUUID } from "node:crypto";

const AUTH_WAIT_TIMEOUT_MS = 2 * 60 * 1000;
const ACTIVE_PRESENCE_WINDOW_MS = 45 * 1000;

function nowIso() {
    return new Date().toISOString();
}

function normalizeUsername(value) {
    return String(value ?? "")
        .trim()
        .replace(/^@+/, "")
        .toLowerCase();
}

function normalizeUsernames(values) {
    return Array.from(
        new Set(
            (Array.isArray(values) ? values : [])
                .map((value) => normalizeUsername(value))
                .filter(Boolean),
        ),
    ).sort();
}

function normalizeMeetingPrefix(rawPrefix) {
    const value = String(rawPrefix ?? "")
        .trim()
        .toLowerCase();
    if (!value) return "";
    return value
        .replace(/[^a-z0-9-]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeInstanceUrl(rawUrl) {
    const trimmed = String(rawUrl ?? "").trim();
    if (!trimmed) return null;
    try {
        const parsed = new URL(trimmed);
        if (!["http:", "https:"].includes(parsed.protocol)) return null;
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

function buildRoomSlug(prefix) {
    const entropy = randomBytes(8).toString("hex");
    return prefix ? `${prefix}-${entropy}` : entropy;
}

function extractInstanceFromMeetingUrl(meetingUrl) {
    try {
        const parsed = new URL(String(meetingUrl ?? ""));
        return `${parsed.protocol}//${parsed.host}`;
    } catch {
        return null;
    }
}

function extractRoomSlug(meetingUrl) {
    try {
        const parsed = new URL(String(meetingUrl ?? ""));
        const cleanPath = parsed.pathname.replace(/^\/+/, "");
        return cleanPath || null;
    } catch {
        return null;
    }
}

function buildParticipantKey(usernames, classroomId = null) {
    const payload = JSON.stringify({
        classroomId: classroomId ? String(classroomId) : null,
        participants: normalizeUsernames(usernames),
    });
    return createHash("sha256").update(payload).digest("hex");
}

/**
 * Persistence layer for Jitsi module configuration, meetings, participants,
 * auth state, and active session presence.
 *
 * Public methods provide schema setup, meeting creation/query helpers,
 * participant/auth-state updates, and normalized response payload helpers used
 * by the Jitsi API routes.
 *
 * @param {{
 *   db: {
 *     ensureTable: (definition: object) => Promise<void>,
 *     executeCommand: (command: object) => Promise<{ rows?: Array<Record<string, unknown>> }>,
 *   },
 *   log?: (level: string, message: string, meta?: Record<string, unknown>) => void,
 * }} options
 */
export class JitsiMeetStore {
    constructor({ db, log }) {
        this.db = db;
        this.log = log;
        this.hasLegacyParticipantColumns = false;
        this.meetingSchemaPrepared = false;
    }

    async ensureSchema() {
        await this.db.ensureTable({
            name: "jitsi_module_config",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "instance_url", type: "text" },
                { name: "meeting_prefix", type: "text" },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });

        await this.db.ensureTable({
            name: "jitsi_meetings",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                {
                    name: "participant_key",
                    type: "text",
                    unique: true,
                    notNull: true,
                },
                {
                    name: "meeting_url",
                    type: "text",
                    unique: true,
                    notNull: true,
                },
                { name: "meeting_password", type: "text", notNull: true },
                {
                    name: "meeting_name",
                    type: "text",
                    notNull: true,
                    default: "Cognis Classroom",
                },
                { name: "chat_room_id", type: "text" },
                { name: "classroom_id", type: "text" },
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
            name: "jitsi_meeting_participants",
            columns: [
                { name: "meeting_id", type: "text", notNull: true },
                { name: "username", type: "text", notNull: true },
                {
                    name: "added_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            primaryKey: ["meeting_id", "username"],
        });

        await this.db.ensureTable({
            name: "jitsi_meeting_state",
            columns: [
                { name: "meeting_id", type: "text", primaryKey: true },
                { name: "first_joined_by", type: "text" },
                { name: "first_joined_at", type: "timestamp" },
                {
                    name: "auth_required",
                    type: "integer",
                    notNull: true,
                    default: 0,
                },
                { name: "auth_started_by", type: "text" },
                { name: "auth_started_at", type: "timestamp" },
                { name: "auth_completed_at", type: "timestamp" },
                {
                    name: "updated_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
        });

        await this.db.ensureTable({
            name: "jitsi_meeting_presence",
            columns: [
                { name: "meeting_id", type: "text", notNull: true },
                { name: "username", type: "text", notNull: true },
                { name: "session_id", type: "text", notNull: true },
                { name: "active", type: "integer", notNull: true, default: 1 },
                {
                    name: "last_seen_at",
                    type: "timestamp",
                    notNull: true,
                    default: "now",
                },
            ],
            primaryKey: ["meeting_id", "username", "session_id"],
        });
        await this.prepareMeetingSchema();
    }

    async prepareMeetingSchema() {
        if (this.meetingSchemaPrepared) {
            return;
        }
        this.meetingSchemaPrepared = true;
        if (typeof this.db.execute !== "function") {
            return;
        }

        await this.db.execute(
            "ALTER TABLE jitsi_meetings ADD COLUMN IF NOT EXISTS participant_key TEXT",
        );
        await this.db.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS idx_jitsi_meetings_participant_key ON jitsi_meetings (participant_key)",
        );

        try {
            await this.db.execute(
                "SELECT participant_a, participant_b FROM jitsi_meetings LIMIT 1",
            );
            this.hasLegacyParticipantColumns = true;
        } catch {
            this.hasLegacyParticipantColumns = false;
        }

        const meetingRowsResult = await this.db.execute(
            "SELECT * FROM jitsi_meetings",
        );
        for (const meetingRow of meetingRowsResult.rows ?? []) {
            if (meetingRow.participant_key) {
                continue;
            }
            let participantUsernames = await this.listParticipants(
                String(meetingRow.id),
            );
            if (participantUsernames.length === 0) {
                participantUsernames = normalizeUsernames([
                    meetingRow.participant_a,
                    meetingRow.participant_b,
                ]);
            }
            if (participantUsernames.length === 0) {
                continue;
            }
            await this.db.executeCommand({
                option: "UPDATE",
                table: "jitsi_meetings",
                set: {
                    participant_key: buildParticipantKey(
                        participantUsernames,
                        meetingRow.classroom_id ?? null,
                    ),
                },
                where: [{ column: "id", value: String(meetingRow.id) }],
            });
        }
    }

    async getConfig() {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_module_config",
            where: [{ column: "id", value: "default" }],
            limit: 1,
        });
        const row = result.rows?.[0];
        return {
            instanceUrl: row?.instance_url ? String(row.instance_url) : "",
            meetingPrefix: row?.meeting_prefix
                ? String(row.meeting_prefix)
                : "",
            updatedAt: row?.updated_at ? String(row.updated_at) : null,
        };
    }

    async saveConfig({ instanceUrl, meetingPrefix }) {
        const normalizedInstanceUrl = normalizeInstanceUrl(instanceUrl);
        const normalizedPrefix = normalizeMeetingPrefix(meetingPrefix);
        await this.db.executeCommand({
            option: "INSERT",
            table: "jitsi_module_config",
            values: {
                id: "default",
                instance_url: normalizedInstanceUrl,
                meeting_prefix: normalizedPrefix,
                updated_at: nowIso(),
            },
            conflict: {
                action: "update",
                target: ["id"],
            },
        });
        return {
            instanceUrl: normalizedInstanceUrl ?? "",
            meetingPrefix: normalizedPrefix,
            updatedAt: nowIso(),
        };
    }

    async getMeetingById(meetingId) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meetings",
            where: [{ column: "id", value: meetingId }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        const participants = await this.listParticipants(meetingId);
        const participantKey =
            row.participant_key ??
            buildParticipantKey(participants, row.classroom_id ?? null);
        return {
            id: String(row.id),
            participantKey: String(participantKey),
            meetingUrl: String(row.meeting_url),
            meetingPassword: String(row.meeting_password),
            meetingName: String(row.meeting_name ?? "Cognis Classroom"),
            chatRoomId: row.chat_room_id ? String(row.chat_room_id) : null,
            classroomId: row.classroom_id ? String(row.classroom_id) : null,
            createdBy: String(row.created_by),
            createdAt: String(row.created_at),
            updatedAt: String(row.updated_at),
        };
    }

    async listParticipants(meetingId) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meeting_participants",
            where: [{ column: "meeting_id", value: meetingId }],
            orderBy: [{ column: "username", direction: "ASC" }],
        });
        return (result.rows ?? []).map((row) => String(row.username));
    }

    async findMeetingByParticipants(usernames, classroomId = null) {
        const participantKey = buildParticipantKey(usernames, classroomId);
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meetings",
            where: [{ column: "participant_key", value: participantKey }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) return null;
        return this.getMeetingById(String(row.id));
    }

    async createMeeting({
        instanceUrl,
        meetingPrefix,
        usernames,
        classroomId,
        createdBy,
        chatRoomId,
    }) {
        const normalizedInstanceUrl = normalizeInstanceUrl(instanceUrl);
        if (!normalizedInstanceUrl) {
            throw new Error(
                "A valid Jitsi instance URL is required before creating meetings.",
            );
        }
        const participantUsernames = normalizeUsernames(usernames);
        const normalizedClassroomId =
            typeof classroomId === "string" && classroomId.trim().length > 0
                ? classroomId.trim()
                : null;
        const existing = await this.findMeetingByParticipants(
            participantUsernames,
            normalizedClassroomId,
        );
        if (existing) {
            return {
                ...(existing ?? {}),
                reused: true,
            };
        }

        const meetingId = randomUUID();
        const prefix = normalizeMeetingPrefix(meetingPrefix);
        const meetingSlug = buildRoomSlug(prefix);
        const meetingUrl = `${normalizedInstanceUrl}/${meetingSlug}`;
        const meetingPassword = randomBytes(12).toString("base64url");
        const participantKey = buildParticipantKey(
            participantUsernames,
            normalizedClassroomId,
        );
        const createdAt = nowIso();

        await this.db.transaction(async (executor) => {
            const meetingInsertValues = {
                id: meetingId,
                participant_key: participantKey,
                meeting_url: meetingUrl,
                meeting_password: meetingPassword,
                meeting_name: "Cognis Classroom",
                chat_room_id: chatRoomId ?? null,
                classroom_id: normalizedClassroomId,
                created_by: createdBy,
                created_at: createdAt,
                updated_at: createdAt,
            };
            if (this.hasLegacyParticipantColumns) {
                meetingInsertValues.participant_a = participantUsernames[0];
                meetingInsertValues.participant_b = participantUsernames[1];
            }
            await executor.executeCommand({
                option: "INSERT",
                table: "jitsi_meetings",
                values: meetingInsertValues,
            });

            for (const username of participantUsernames) {
                await executor.executeCommand({
                    option: "INSERT",
                    table: "jitsi_meeting_participants",
                    values: {
                        meeting_id: meetingId,
                        username,
                        added_at: createdAt,
                    },
                    conflict: { action: "ignore" },
                });
            }

            await executor.executeCommand({
                option: "INSERT",
                table: "jitsi_meeting_state",
                values: {
                    meeting_id: meetingId,
                    auth_required: 0,
                    updated_at: createdAt,
                },
                conflict: {
                    action: "update",
                    target: ["meeting_id"],
                },
            });
        });

        const createdMeeting = await this.getMeetingById(meetingId);
        return {
            ...(createdMeeting ?? {}),
            reused: false,
        };
    }

    async getMeetingState(meetingId) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meeting_state",
            where: [{ column: "meeting_id", value: meetingId }],
            limit: 1,
        });
        const row = result.rows?.[0];
        if (!row) {
            return {
                meetingId,
                firstJoinedBy: null,
                firstJoinedAt: null,
                authRequired: false,
                authStartedBy: null,
                authStartedAt: null,
                authCompletedAt: null,
                updatedAt: null,
            };
        }
        return {
            meetingId,
            firstJoinedBy: row.first_joined_by
                ? String(row.first_joined_by)
                : null,
            firstJoinedAt: row.first_joined_at
                ? String(row.first_joined_at)
                : null,
            authRequired: Number(row.auth_required ?? 0) === 1,
            authStartedBy: row.auth_started_by
                ? String(row.auth_started_by)
                : null,
            authStartedAt: row.auth_started_at
                ? String(row.auth_started_at)
                : null,
            authCompletedAt: row.auth_completed_at
                ? String(row.auth_completed_at)
                : null,
            updatedAt: row.updated_at ? String(row.updated_at) : null,
        };
    }

    async updateMeetingState(meetingId, updates) {
        const merged = {
            ...(await this.getMeetingState(meetingId)),
            ...updates,
            updatedAt: nowIso(),
        };
        await this.db.executeCommand({
            option: "INSERT",
            table: "jitsi_meeting_state",
            values: {
                meeting_id: meetingId,
                first_joined_by: merged.firstJoinedBy,
                first_joined_at: merged.firstJoinedAt,
                auth_required: merged.authRequired ? 1 : 0,
                auth_started_by: merged.authStartedBy,
                auth_started_at: merged.authStartedAt,
                auth_completed_at: merged.authCompletedAt,
                updated_at: merged.updatedAt,
            },
            conflict: {
                action: "update",
                target: ["meeting_id"],
            },
        });
        return merged;
    }

    async upsertPresence(meetingId, username, sessionId, active = true) {
        const timestamp = nowIso();
        await this.db.executeCommand({
            option: "INSERT",
            table: "jitsi_meeting_presence",
            values: {
                meeting_id: meetingId,
                username,
                session_id: sessionId,
                active: active ? 1 : 0,
                last_seen_at: timestamp,
            },
            conflict: {
                action: "update",
                target: ["meeting_id", "username", "session_id"],
            },
        });
        return timestamp;
    }

    async setOtherSessionsInactive(meetingId, username, keepSessionId) {
        const presenceRows = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meeting_presence",
            where: [
                { column: "meeting_id", value: meetingId },
                { column: "username", value: username },
            ],
        });

        for (const row of presenceRows.rows ?? []) {
            const sessionId = String(row.session_id ?? "");
            if (!sessionId || sessionId === keepSessionId) continue;
            await this.db.executeCommand({
                option: "UPDATE",
                table: "jitsi_meeting_presence",
                set: {
                    active: 0,
                    last_seen_at: nowIso(),
                },
                where: [
                    { column: "meeting_id", value: meetingId },
                    { column: "username", value: username },
                    { column: "session_id", value: sessionId },
                ],
            });
        }
    }

    async listPresence(meetingId) {
        const result = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meeting_presence",
            where: [{ column: "meeting_id", value: meetingId }],
            orderBy: [{ column: "last_seen_at", direction: "DESC" }],
        });
        return (result.rows ?? []).map((row) => ({
            meetingId: String(row.meeting_id),
            username: String(row.username),
            sessionId: String(row.session_id),
            active: Number(row.active ?? 0) === 1,
            lastSeenAt: String(row.last_seen_at),
        }));
    }

    async getActiveSessionsForUser(meetingId, username, sessionId) {
        const presence = await this.listPresence(meetingId);
        const threshold = Date.now() - ACTIVE_PRESENCE_WINDOW_MS;
        return presence.filter((entry) => {
            if (entry.username !== username) return false;
            if (!entry.active) return false;
            if (sessionId && entry.sessionId === sessionId) return false;
            const seenAt = Date.parse(entry.lastSeenAt);
            return Number.isFinite(seenAt) && seenAt >= threshold;
        });
    }

    async listActiveMeetings() {
        const meetingsResult = await this.db.executeCommand({
            option: "SELECT",
            table: "jitsi_meetings",
            orderBy: [{ column: "updated_at", direction: "DESC" }],
            limit: 200,
        });
        const rows = meetingsResult.rows ?? [];
        const mappedMeetings = await Promise.all(
            rows.map(async (row) => {
                const meeting = {
                    id: String(row.id),
                    meetingUrl: String(row.meeting_url),
                    meetingName: String(row.meeting_name ?? "Cognis Classroom"),
                    classroomId: row.classroom_id
                        ? String(row.classroom_id)
                        : null,
                    createdBy: String(row.created_by),
                    createdAt: String(row.created_at),
                    updatedAt: String(row.updated_at),
                };
                const [presence, participants, state] = await Promise.all([
                    this.listPresence(meeting.id),
                    this.listParticipants(meeting.id),
                    this.getMeetingState(meeting.id),
                ]);
                const activePresence = presence.filter((entry) => {
                    if (!entry.active) return false;
                    const seenAt = Date.parse(entry.lastSeenAt);
                    return Number.isFinite(seenAt)
                        ? seenAt >= Date.now() - ACTIVE_PRESENCE_WINDOW_MS
                        : false;
                });
                if (activePresence.length === 0) return null;
                return {
                    id: meeting.id,
                    meetingUrl: meeting.meetingUrl,
                    meetingName: meeting.meetingName,
                    classroomId: meeting.classroomId,
                    createdBy: meeting.createdBy,
                    createdAt: meeting.createdAt,
                    participantCount: participants.length,
                    activeSessionCount: activePresence.length,
                    activeUsernames: Array.from(
                        new Set(activePresence.map((entry) => entry.username)),
                    ).sort(),
                    authRequired: state.authRequired,
                    authCompleted: Boolean(state.authCompletedAt),
                    updatedAt: meeting.updatedAt,
                };
            }),
        );
        return mappedMeetings.filter(Boolean);
    }

    /**
     * Determines whether the current participant may initiate meeting auth.
     * Priority is granted to the first joiner for two minutes; after timeout,
     * any participant may initiate if auth is still pending.
     */
    canCurrentUserInitiateAuth(state, currentUsername) {
        if (!state.authRequired) return false;
        if (state.authCompletedAt) return false;
        const now = Date.now();
        if (!state.authStartedBy) {
            if (!state.firstJoinedAt) return true;
            if (state.firstJoinedBy === currentUsername) return true;
            const firstJoinAtMs = Date.parse(state.firstJoinedAt);
            if (!Number.isFinite(firstJoinAtMs)) return true;
            return now - firstJoinAtMs >= AUTH_WAIT_TIMEOUT_MS;
        }
        if (state.authStartedBy === currentUsername) return true;
        const authStartMs = Date.parse(state.authStartedAt ?? "");
        if (!Number.isFinite(authStartMs)) return false;
        return now - authStartMs >= AUTH_WAIT_TIMEOUT_MS;
    }

    /**
     * Builds the normalized meeting payload shape returned by API routes.
     */
    buildMeetingPayload(meeting, participants, state, extra = {}) {
        return {
            id: meeting.id,
            meetingUrl: meeting.meetingUrl,
            meetingName: meeting.meetingName,
            meetingPassword: meeting.meetingPassword,
            classroomId: meeting.classroomId,
            chatRoomId: meeting.chatRoomId,
            participants,
            state: {
                authRequired: state.authRequired,
                authStartedBy: state.authStartedBy,
                authStartedAt: state.authStartedAt,
                authCompletedAt: state.authCompletedAt,
                firstJoinedBy: state.firstJoinedBy,
                firstJoinedAt: state.firstJoinedAt,
            },
            instanceUrl: extractInstanceFromMeetingUrl(meeting.meetingUrl),
            roomSlug: extractRoomSlug(meeting.meetingUrl),
            ...extra,
        };
    }

    /**
     * Normalizes meeting-creation input into a deduplicated participant list
     * that always includes the creator, plus a sanitized classroomId value.
     *
     * @param {{
     *   participants?: string[],
     *   classroomId?: string | null,
     *   creatorUsername: string,
     * }} input
     * @returns {{ participantUsernames: string[], classroomId: string | null }}
     */
    normalizeMeetingCreationInput({
        participants,
        classroomId,
        creatorUsername,
    }) {
        const normalizedParticipants = normalizeUsernames([
            ...(Array.isArray(participants) ? participants : []),
            creatorUsername,
        ]);
        return {
            participantUsernames: normalizedParticipants,
            classroomId:
                typeof classroomId === "string" && classroomId.trim().length > 0
                    ? classroomId.trim()
                    : null,
        };
    }

    normalizeInstanceUrl(rawUrl) {
        return normalizeInstanceUrl(rawUrl);
    }

    normalizeMeetingPrefix(rawPrefix) {
        return normalizeMeetingPrefix(rawPrefix);
    }

    normalizeUsernames(rawUsernames) {
        return normalizeUsernames(rawUsernames);
    }
}
