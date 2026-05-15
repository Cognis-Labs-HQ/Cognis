import { requireAuth } from "../../../gateways/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { JitsiMeetStore } from "./store.js";

const MODULE_ID = "jitsi-meet";
const DEFAULT_BASE_URL = "https://meet.jit.si";
const DEFAULT_TOOLBAR_BUTTONS = [
    "microphone",
    "camera",
    "desktop",
    "participants-pane",
    "tileview",
    "raisehand",
    "hangup",
    "toggle-camera",
];

function sanitizeBaseUrl(rawValue) {
    const normalizedUrl = String(rawValue ?? "")
        .trim()
        .replace(/\/+$/, "");
    if (!normalizedUrl) {
        return "";
    }
    try {
        const parsedUrl = new URL(normalizedUrl);
        if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
            return "";
        }
        return normalizedUrl;
    } catch {
        return "";
    }
}

function sanitizeHandle(rawValue) {
    const normalizedHandle = String(rawValue ?? "")
        .trim()
        .replace(/^@+/, "");
    return normalizedHandle;
}

function buildJoinUrl(baseUrl, roomSlug) {
    const params = new URLSearchParams();
    params.set(
        "config.toolbarButtons",
        JSON.stringify(DEFAULT_TOOLBAR_BUTTONS),
    );
    params.set("config.disableDeepLinking", "true");
    params.set("config.prejoinPageEnabled", "false");
    params.set("config.prejoinConfig.enabled", "false");
    params.set("config.requireDisplayName", "false");
    params.set("config.disableProfile", "true");
    params.set("interfaceConfig.DISABLE_CHAT", "true");
    params.set("interfaceConfig.DISABLE_PROFILE", "true");
    return `${baseUrl}/${roomSlug}#${params.toString()}`;
}

async function resolveBaseUrl(store) {
    const settings = await store.getSettings();
    const configuredBaseUrl = sanitizeBaseUrl(settings.baseUrl);
    return configuredBaseUrl || DEFAULT_BASE_URL;
}

function isParticipant(meetingRow, accountId) {
    return (
        meetingRow?.participant_a === accountId ||
        meetingRow?.participant_b === accountId
    );
}

export function registerApiRoutes(router) {
    const dbExecutor = router.capabilities?.get("db:executor") ?? null;
    const profileStore =
        router.capabilities?.get("social:profileStore") ?? null;

    const store = dbExecutor
        ? new JitsiMeetStore(
              dbExecutor,
              process.env.COGNIS_CREDENTIAL_SECRET ??
                  process.env.COGNIS_SESSION_SECRET,
          )
        : null;
    const schemaReady = store
        ? store.ensureSchema().catch((error) => {
              console.error(
                  "[jitsi-meet]:schema-init-failed",
                  error instanceof Error ? error.message : String(error),
              );
              throw error;
          })
        : Promise.resolve();

    async function ensureStoreReady() {
        if (!store) {
            return false;
        }
        await schemaReady;
        return true;
    }

    router.get(
        `/api/v1/modules/${MODULE_ID}/ping`,
        async (_req, res) => {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({ data: { moduleId: MODULE_ID, ready: true } }),
            );
        },
        { access: { minRole: "user" } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/config`,
        async (_req, res) => {
            if (!(await ensureStoreReady())) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "db_unavailable",
                            message: "Database capability is not available.",
                        },
                    }),
                );
                return;
            }
            const baseUrl = await resolveBaseUrl(store);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        baseUrl,
                        toolbarButtons: DEFAULT_TOOLBAR_BUTTONS,
                    },
                }),
            );
        },
        { access: { minRole: "user" } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/admin/settings`,
        async (_req, res) => {
            if (!(await ensureStoreReady())) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "db_unavailable",
                            message: "Database capability is not available.",
                        },
                    }),
                );
                return;
            }
            const baseUrl = await resolveBaseUrl(store);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { baseUrl } }));
        },
        { access: { minRole: "admin" } },
    );

    router.post(
        `/api/v1/modules/${MODULE_ID}/admin/settings`,
        async (req, res) => {
            if (!(await ensureStoreReady())) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "db_unavailable",
                            message: "Database capability is not available.",
                        },
                    }),
                );
                return;
            }
            const body = await readJson(req);
            const baseUrl = sanitizeBaseUrl(body?.baseUrl);
            if (!baseUrl) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_base_url",
                            message: "A valid Jitsi base URL is required.",
                        },
                    }),
                );
                return;
            }
            await store.setSetting("baseUrl", baseUrl);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { saved: true, baseUrl } }));
        },
        { access: { minRole: "admin" } },
    );

    router.post(
        `/api/v1/modules/${MODULE_ID}/session`,
        async (req, res) => {
            if (!(await ensureStoreReady()) || !profileStore) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "dependency_unavailable",
                            message: "Required dependencies are unavailable.",
                        },
                    }),
                );
                return;
            }

            const claims = requireAuth(req, res, "user");
            if (!claims) return;

            const body = await readJson(req);
            const participantHandle = sanitizeHandle(body?.participantHandle);
            if (!participantHandle) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "missing_participant",
                            message: "participantHandle is required.",
                        },
                    }),
                );
                return;
            }

            const targetProfile =
                await profileStore.getProfileByHandle(participantHandle);
            if (!targetProfile) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "participant_not_found",
                            message: "Participant profile not found.",
                        },
                    }),
                );
                return;
            }

            if (targetProfile.accountId === claims.sub) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "invalid_participant",
                            message: "Cannot open a meeting with yourself.",
                        },
                    }),
                );
                return;
            }

            const meetingRow = await store.createMeeting(
                claims.sub,
                targetProfile.accountId,
            );
            const baseUrl = await resolveBaseUrl(store);
            const joinUrl = buildJoinUrl(baseUrl, meetingRow.room_slug);

            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        id: meetingRow.id,
                        roomSlug: meetingRow.room_slug,
                        joinUrl,
                        participant: {
                            accountId: targetProfile.accountId,
                            handle: targetProfile.handle,
                            displayName:
                                targetProfile.displayName ??
                                targetProfile.handle,
                        },
                    },
                }),
            );
        },
        { access: { minRole: "user" } },
    );

    router.get(
        `/api/v1/modules/${MODULE_ID}/meeting`,
        async (req, res) => {
            if (!(await ensureStoreReady())) {
                res.writeHead(503, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "db_unavailable",
                            message: "Database capability is not available.",
                        },
                    }),
                );
                return;
            }

            const claims = requireAuth(req, res, "user");
            if (!claims) return;

            const requestUrl = new URL(req.url ?? "/", "http://localhost");
            const meetingId = String(
                requestUrl.searchParams.get("meetingId") ?? "",
            ).trim();
            if (!meetingId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "missing_meeting_id",
                            message: "meetingId query parameter is required.",
                        },
                    }),
                );
                return;
            }

            const meetingRow = await store.findMeetingById(meetingId);
            if (!meetingRow) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "meeting_not_found",
                            message: "Meeting not found.",
                        },
                    }),
                );
                return;
            }

            if (!isParticipant(meetingRow, claims.sub)) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "You are not a participant in this meeting.",
                        },
                    }),
                );
                return;
            }

            await store.touchMeeting(meetingRow.id);
            const baseUrl = await resolveBaseUrl(store);
            const joinUrl = buildJoinUrl(baseUrl, meetingRow.room_slug);

            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        id: meetingRow.id,
                        roomSlug: meetingRow.room_slug,
                        joinUrl,
                        participantA: meetingRow.participant_a,
                        participantB: meetingRow.participant_b,
                        createdAt: meetingRow.created_at,
                        updatedAt: meetingRow.updated_at,
                    },
                }),
            );
        },
        { access: { minRole: "user" } },
    );
}
