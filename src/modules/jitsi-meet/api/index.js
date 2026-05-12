import { createHash, randomUUID } from "node:crypto";
import { requireAuth } from "../../../gateways/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";

// Module-level settings are stored in the system-scoped preferences namespace.
const MODULE_SETTINGS_NAMESPACE = "__system__";
const MODULE_SETTINGS_KEY = "module:jitsi-meet:settings";
const DEFAULT_SETTINGS = Object.freeze({
    baseUrl: "https://meet.jit.si",
    roomPrefix: "cognis-meeting",
    meetingTitle: "Cognis Meeting",
});

let schemaReady = false;
let schemaPromise = null;

function jsonOk(res, data, status = 200) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ data }));
}

function jsonError(res, status, code, message) {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code, message } }));
}

function normalizeBaseUrl(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    const candidate = raw || DEFAULT_SETTINGS.baseUrl;
    let parsed;
    try {
        parsed = new URL(candidate);
    } catch {
        return null;
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
    }
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/+$/, "");
}

function normalizeRoomPrefix(value) {
    const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
    const sanitized = raw.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!sanitized) return DEFAULT_SETTINGS.roomPrefix;
    return sanitized.slice(0, 48);
}

function normalizeMeetingTitle(value) {
    const raw = typeof value === "string" ? value.trim() : "";
    if (!raw) return DEFAULT_SETTINGS.meetingTitle;
    return raw.slice(0, 120);
}

function normalizeParticipantIds(value) {
    if (!Array.isArray(value)) return [];
    const unique = new Set(
        value
            .filter((entry) => typeof entry === "string")
            .map((entry) => entry.trim())
            .filter(Boolean),
    );
    return Array.from(unique).sort();
}

function parseParticipantIds(raw) {
    if (typeof raw !== "string") return [];
    try {
        return normalizeParticipantIds(JSON.parse(raw));
    } catch {
        return [];
    }
}

function buildMeetingKey({ participantIds, classroomId }) {
    if (classroomId) {
        return `classroom:${classroomId}`;
    }
    return `participants:${participantIds.join(",")}`;
}

function buildRoomName(prefix, meetingKey) {
    const digest = createHash("sha256")
        .update(meetingKey)
        .digest("hex")
        .slice(0, 16);
    return `${prefix}-${digest}`;
}

function buildJoinUrl({ baseUrl, roomName, title }) {
    const url = new URL(
        `${baseUrl.replace(/\/+$/, "")}/${encodeURIComponent(roomName)}`,
    );
    const params = new URLSearchParams();
    params.set("config.prejoinPageEnabled", "false");
    params.set("config.prejoinConfig.enabled", "false");
    params.set("config.disableDeepLinking", "true");
    params.set("interfaceConfig.DISABLE_CHAT", "true");
    params.set("interfaceConfig.DISABLE_PROFILE", "true");
    params.set("config.disableProfile", "true");
    params.set("config.subject", title || DEFAULT_SETTINGS.meetingTitle);
    url.hash = params.toString();
    return url.toString();
}

async function ensureSchema(db) {
    if (schemaReady) return;
    if (schemaPromise) {
        await schemaPromise;
        return;
    }
    schemaPromise = (async () => {
        await db.ensureTable({
            name: "meeting_rooms",
            columns: [
                { name: "id", type: "text", primaryKey: true },
                { name: "meeting_key", type: "text", notNull: true },
                { name: "room_name", type: "text", notNull: true },
                {
                    name: "title",
                    type: "text",
                    notNull: true,
                    default: DEFAULT_SETTINGS.meetingTitle,
                },
                {
                    name: "participant_ids",
                    type: "text",
                    notNull: true,
                    default: "[]",
                },
                { name: "classroom_id", type: "text" },
                { name: "chatroom_id", type: "text" },
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
            uniqueKeys: [["meeting_key"], ["room_name"]],
            indexes: [
                {
                    columns: ["created_by"],
                    name: "idx_meeting_rooms_created_by",
                },
                {
                    columns: ["classroom_id"],
                    name: "idx_meeting_rooms_classroom",
                },
            ],
        });
        schemaReady = true;
    })();
    await schemaPromise;
}

function mapMeetingRow(row) {
    return {
        id: String(row.id),
        meetingKey: String(row.meeting_key),
        roomName: String(row.room_name),
        title: String(row.title ?? DEFAULT_SETTINGS.meetingTitle),
        participantIds: parseParticipantIds(row.participant_ids),
        classroomId: row.classroom_id ? String(row.classroom_id) : null,
        chatroomId: row.chatroom_id ? String(row.chatroom_id) : null,
        createdBy: String(row.created_by),
        createdAt: String(row.created_at),
        updatedAt: String(row.updated_at),
    };
}

async function getMeetingById(db, meetingId) {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "meeting_rooms",
        where: [{ column: "id", value: meetingId }],
        limit: 1,
    });
    if (!result.rows?.[0]) return null;
    return mapMeetingRow(result.rows[0]);
}

async function getMeetingByKey(db, meetingKey) {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "meeting_rooms",
        where: [{ column: "meeting_key", value: meetingKey }],
        limit: 1,
    });
    if (!result.rows?.[0]) return null;
    return mapMeetingRow(result.rows[0]);
}

async function listMeetings(db) {
    const result = await db.executeCommand({
        option: "SELECT",
        table: "meeting_rooms",
        orderBy: [{ column: "updated_at", direction: "DESC" }],
        limit: 200,
    });
    return (result.rows ?? []).map((row) => mapMeetingRow(row));
}

async function updateMeetingChatroomId(db, meetingId, chatroomId) {
    await db.executeCommand({
        option: "UPDATE",
        table: "meeting_rooms",
        set: {
            chatroom_id: chatroomId,
            updated_at: new Date().toISOString(),
        },
        where: [{ column: "id", value: meetingId }],
    });
}

async function insertMeeting(db, input) {
    await db.executeCommand({
        option: "INSERT",
        table: "meeting_rooms",
        values: {
            id: input.id,
            meeting_key: input.meetingKey,
            room_name: input.roomName,
            title: input.title,
            participant_ids: JSON.stringify(input.participantIds),
            classroom_id: input.classroomId,
            chatroom_id: input.chatroomId,
            created_by: input.createdBy,
            created_at: input.createdAt,
            updated_at: input.updatedAt,
        },
    });
}

async function readSettings(preferenceStore) {
    if (!preferenceStore) {
        return { ...DEFAULT_SETTINGS };
    }
    const raw = await preferenceStore.get(
        MODULE_SETTINGS_NAMESPACE,
        MODULE_SETTINGS_KEY,
    );
    if (!raw) {
        return { ...DEFAULT_SETTINGS };
    }
    try {
        const parsed = JSON.parse(raw);
        const baseUrl = normalizeBaseUrl(parsed.baseUrl);
        return {
            baseUrl: baseUrl || DEFAULT_SETTINGS.baseUrl,
            roomPrefix: normalizeRoomPrefix(parsed.roomPrefix),
            meetingTitle: normalizeMeetingTitle(parsed.meetingTitle),
        };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

async function writeSettings(preferenceStore, nextSettings) {
    if (!preferenceStore) return;
    await preferenceStore.set(
        MODULE_SETTINGS_NAMESPACE,
        MODULE_SETTINGS_KEY,
        JSON.stringify(nextSettings),
    );
}

async function resolveClassroomParticipants(classroomsApi, classroomId) {
    if (!classroomId || !classroomsApi) {
        return { classroom: null, members: [] };
    }
    const classroom = await classroomsApi.getClassroom?.(classroomId);
    if (!classroom) {
        return { classroom: null, members: [] };
    }
    const members = await classroomsApi.listClassroomMembers?.(classroomId);
    const memberAccountIds = Array.isArray(members)
        ? normalizeParticipantIds(members.map((member) => member.accountId))
        : [];
    return { classroom, members: memberAccountIds };
}

async function resolveEffectiveParticipants(meeting, classroomsApi) {
    const direct = normalizeParticipantIds(meeting.participantIds);
    if (!meeting.classroomId) {
        return direct;
    }
    const classroomResult = await resolveClassroomParticipants(
        classroomsApi,
        meeting.classroomId,
    );
    return normalizeParticipantIds([...direct, ...classroomResult.members]);
}

function canAccessMeeting(accountId, participantIds) {
    return participantIds.includes(accountId);
}

async function createLinkedChatroom(capabilities, input) {
    const messagesApi = capabilities?.get("messages:createRoom");
    if (!messagesApi || typeof messagesApi.createRoom !== "function") {
        return null;
    }
    const room = await messagesApi.createRoom({
        kind: input.classroomId ? "classroom" : "group",
        title: input.title,
        createdBy: input.createdBy,
        memberAccountIds: input.participantIds,
    });
    return room?.id ? String(room.id) : null;
}

function buildMeetingPayload(meeting, settings, effectiveParticipants) {
    return {
        id: meeting.id,
        title: meeting.title,
        classroomId: meeting.classroomId,
        roomName: meeting.roomName,
        chatroomId: meeting.chatroomId,
        participantIds: effectiveParticipants,
        createdBy: meeting.createdBy,
        createdAt: meeting.createdAt,
        updatedAt: meeting.updatedAt,
        baseUrl: settings.baseUrl,
    };
}

/**
 * Registers Jitsi Meet module API routes.
 *
 * @param {{
 *   get(path: string, handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void> | void): void,
 *   post(path: string, handler: (req: import('node:http').IncomingMessage, res: import('node:http').ServerResponse) => Promise<void> | void): void,
 * }} router
 * @param {{ capabilities?: { get?: (key: string) => unknown } }} [context]
 * @returns {void}
 */
export function registerApiRoutes(router, context = {}) {
    const capabilities = context?.capabilities;
    const db = capabilities?.get("db:executor");
    const preferenceStore = capabilities?.get("preferences:store");

    const classroomsApi = capabilities?.get("study:classrooms");

    router.get("/api/v1/modules/jitsi-meet/ping", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        if (!db) {
            jsonError(
                res,
                503,
                "unavailable",
                "Database executor unavailable.",
            );
            return;
        }
        await ensureSchema(db);
        jsonOk(res, { ready: true });
    });

    router.get("/api/v1/modules/jitsi-meet/settings", async (req, res) => {
        const claims = requireAuth(req, res, "admin");
        if (!claims) return;
        const settings = await readSettings(preferenceStore);
        jsonOk(res, settings);
    });

    router.post("/api/v1/modules/jitsi-meet/settings", async (req, res) => {
        const claims = requireAuth(req, res, "admin");
        if (!claims) return;
        const body = await readJson(req);
        const baseUrl = normalizeBaseUrl(body?.baseUrl);
        if (!baseUrl) {
            jsonError(
                res,
                400,
                "bad_request",
                "A valid Jitsi baseUrl is required.",
            );
            return;
        }
        const nextSettings = {
            baseUrl,
            roomPrefix: normalizeRoomPrefix(body?.roomPrefix),
            meetingTitle: normalizeMeetingTitle(body?.meetingTitle),
        };
        await writeSettings(preferenceStore, nextSettings);
        jsonOk(res, nextSettings);
    });

    router.get("/api/v1/modules/jitsi-meet/classrooms", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        if (!classroomsApi) {
            jsonOk(res, []);
            return;
        }
        if (claims.role === "admin" || claims.role === "owner") {
            const classrooms = await classroomsApi.listClassrooms?.();
            jsonOk(res, classrooms ?? []);
            return;
        }
        const classrooms = await classroomsApi.listClassroomsForTeacher?.(
            claims.sub,
        );
        jsonOk(res, classrooms ?? []);
    });

    router.get("/api/v1/modules/jitsi-meet/meetings", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        if (!db) {
            jsonError(
                res,
                503,
                "unavailable",
                "Database executor unavailable.",
            );
            return;
        }
        await ensureSchema(db);
        const settings = await readSettings(preferenceStore);
        const meetings = await listMeetings(db);
        const visibleMeetings = [];
        for (const meeting of meetings) {
            const participantIds = await resolveEffectiveParticipants(
                meeting,
                classroomsApi,
            );
            if (!canAccessMeeting(claims.sub, participantIds)) continue;
            visibleMeetings.push(
                buildMeetingPayload(meeting, settings, participantIds),
            );
        }
        jsonOk(res, visibleMeetings);
    });

    router.post("/api/v1/modules/jitsi-meet/meetings", async (req, res) => {
        const claims = requireAuth(req, res, "user");
        if (!claims) return;
        if (!db) {
            jsonError(
                res,
                503,
                "unavailable",
                "Database executor unavailable.",
            );
            return;
        }
        await ensureSchema(db);

        const body = await readJson(req);
        const directParticipantIds = normalizeParticipantIds(
            body?.participantIds,
        );
        const classroomId =
            typeof body?.classroomId === "string" && body.classroomId.trim()
                ? body.classroomId.trim()
                : null;

        if (!directParticipantIds.length && !classroomId) {
            jsonError(
                res,
                400,
                "bad_request",
                "participantIds or classroomId is required.",
            );
            return;
        }

        const settings = await readSettings(preferenceStore);
        const title = normalizeMeetingTitle(
            body?.title || settings.meetingTitle,
        );

        let classroomParticipants = [];
        if (classroomId) {
            if (!classroomsApi) {
                jsonError(
                    res,
                    409,
                    "classroom_unavailable",
                    "Classroom support is unavailable.",
                );
                return;
            }
            const resolvedClassroom = await resolveClassroomParticipants(
                classroomsApi,
                classroomId,
            );
            if (!resolvedClassroom.classroom) {
                jsonError(res, 404, "not_found", "Classroom not found.");
                return;
            }
            classroomParticipants = resolvedClassroom.members;
        }

        const effectiveParticipants = normalizeParticipantIds([
            ...directParticipantIds,
            ...classroomParticipants,
            claims.sub,
        ]);
        if (!effectiveParticipants.includes(claims.sub)) {
            jsonError(
                res,
                403,
                "forbidden",
                "Only participants can create meetings.",
            );
            return;
        }

        const meetingKey = buildMeetingKey({
            participantIds: directParticipantIds,
            classroomId,
        });

        let meeting = await getMeetingByKey(db, meetingKey);
        if (!meeting) {
            const roomName = buildRoomName(settings.roomPrefix, meetingKey);
            const nowIso = new Date().toISOString();
            const initialMeeting = {
                id: randomUUID(),
                meetingKey,
                roomName,
                title,
                participantIds: directParticipantIds,
                classroomId,
                chatroomId: null,
                createdBy: claims.sub,
                createdAt: nowIso,
                updatedAt: nowIso,
            };
            await insertMeeting(db, initialMeeting);
            meeting = await getMeetingByKey(db, meetingKey);
        }

        if (!meeting) {
            jsonError(
                res,
                500,
                "create_failed",
                "Meeting could not be created.",
            );
            return;
        }

        const currentParticipants = await resolveEffectiveParticipants(
            meeting,
            classroomsApi,
        );
        if (!canAccessMeeting(claims.sub, currentParticipants)) {
            jsonError(
                res,
                403,
                "forbidden",
                "You are not allowed to access this meeting.",
            );
            return;
        }

        if (!meeting.chatroomId) {
            const chatroomId = await createLinkedChatroom(capabilities, {
                createdBy: claims.sub,
                title: meeting.title,
                participantIds: currentParticipants,
                classroomId: meeting.classroomId,
            });
            if (chatroomId) {
                await updateMeetingChatroomId(db, meeting.id, chatroomId);
                meeting = await getMeetingById(db, meeting.id);
            }
        }

        jsonOk(
            res,
            buildMeetingPayload(meeting, settings, currentParticipants),
            201,
        );
    });

    router.get(
        "/api/v1/modules/jitsi-meet/meeting-session",
        async (req, res) => {
            const claims = requireAuth(req, res, "user");
            if (!claims) return;
            if (!db) {
                jsonError(
                    res,
                    503,
                    "unavailable",
                    "Database executor unavailable.",
                );
                return;
            }
            await ensureSchema(db);
            const meetingId = (
                req.url ? new URL(req.url, "http://localhost") : null
            )?.searchParams.get("meetingId");
            if (!meetingId) {
                jsonError(res, 400, "bad_request", "meetingId is required.");
                return;
            }
            const meeting = await getMeetingById(db, meetingId);
            if (!meeting) {
                jsonError(res, 404, "not_found", "Meeting not found.");
                return;
            }
            const participantIds = await resolveEffectiveParticipants(
                meeting,
                classroomsApi,
            );
            if (!canAccessMeeting(claims.sub, participantIds)) {
                jsonError(
                    res,
                    403,
                    "forbidden",
                    "You are not allowed to access this meeting.",
                );
                return;
            }
            const settings = await readSettings(preferenceStore);
            jsonOk(res, {
                ...buildMeetingPayload(meeting, settings, participantIds),
                joinUrl: buildJoinUrl({
                    baseUrl: settings.baseUrl,
                    roomName: meeting.roomName,
                    title: meeting.title,
                }),
            });
        },
    );
}
