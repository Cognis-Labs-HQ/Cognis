import { requireAuth } from "../../../gateways/auth/guard.js";
import { readJson } from "../../../api/reuse/read-json.js";
import { JitsiMeetStore } from "./store.js";

const MODULE_ID = "jitsi-meet";
const DEFAULT_BASE_URL = "https://meet.jit.si";
const DEFAULT_MEETING_TITLE = "Cognis Meeting";
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
    return String(rawValue ?? "")
        .trim()
        .replace(/^@+/, "");
}

function sanitizeTitle(rawValue) {
    const normalizedTitle = String(rawValue ?? "").trim();
    return normalizedTitle || DEFAULT_MEETING_TITLE;
}

function sanitizeEntityType(rawValue) {
    const normalizedType = String(rawValue ?? "pair")
        .trim()
        .toLowerCase();
    if (!normalizedType) return "pair";
    return normalizedType;
}

function sanitizeSearch(rawValue) {
    return String(rawValue ?? "")
        .trim()
        .toLowerCase();
}

function buildJoinUrl(baseUrl, roomSlug, userInfo) {
    const params = new URLSearchParams();
    params.set(
        "config.toolbarButtons",
        JSON.stringify(DEFAULT_TOOLBAR_BUTTONS),
    );
    params.set("config.disableDeepLinking", "true");
    params.set("config.prejoinPageEnabled", "false");
    params.set("config.prejoinConfig.enabled", "false");
    params.set("config.disableInviteFunctions", "true");
    params.set("config.disableProfile", "true");
    params.set("interfaceConfig.DISABLE_CHAT", "true");
    params.set("interfaceConfig.DISABLE_PROFILE", "true");
    params.set("userInfo.displayName", String(userInfo.displayName ?? ""));
    if (userInfo.avatarUrl) {
        params.set("userInfo.avatarURL", String(userInfo.avatarUrl));
    }
    return `${baseUrl}/${roomSlug}#${params.toString()}`;
}

async function resolveBaseUrl(store) {
    const settings = await store.getSettings();
    const configuredBaseUrl = sanitizeBaseUrl(settings.baseUrl);
    return configuredBaseUrl || DEFAULT_BASE_URL;
}

function profileRowToPublicProfile(row) {
    return {
        accountId: String(row.account_id ?? ""),
        handle: String(row.handle ?? ""),
        displayName:
            String(row.display_name ?? "").trim() || String(row.handle ?? ""),
        avatarKey: row.avatar_key ?? null,
        avatarUrl: row.avatar_key ? `/api/v1/files/${row.avatar_key}` : null,
    };
}

async function getProfileByHandle(dbExecutor, handle) {
    const profileResult = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "account_profiles",
        columns: ["account_id", "handle", "display_name", "avatar_key"],
        where: [{ column: "handle", value: String(handle ?? "") }],
        limit: 1,
    });
    return profileResult.rows?.[0] ?? null;
}

async function getProfilesByAccountIds(dbExecutor, accountIds) {
    const requestedAccountIds = Array.from(
        new Set(
            (Array.isArray(accountIds) ? accountIds : [])
                .map((accountId) => String(accountId ?? "").trim())
                .filter(Boolean),
        ),
    );
    if (!requestedAccountIds.length) {
        return [];
    }

    const allProfilesResult = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "account_profiles",
        columns: ["account_id", "handle", "display_name", "avatar_key"],
    });
    const byAccountId = new Map(
        (allProfilesResult.rows ?? []).map((profileRow) => [
            String(profileRow.account_id ?? ""),
            profileRowToPublicProfile(profileRow),
        ]),
    );

    return requestedAccountIds
        .map((accountId) => byAccountId.get(accountId) ?? null)
        .filter(Boolean);
}

async function getOwnProfile(dbExecutor, accountId) {
    const profileResult = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "account_profiles",
        columns: ["account_id", "handle", "display_name", "avatar_key"],
        where: [{ column: "account_id", value: String(accountId ?? "") }],
        limit: 1,
    });
    return profileResult.rows?.[0] ?? null;
}

async function listParticipants(dbExecutor, accountId, filterMode, searchText) {
    if (filterMode === "all") {
        const allProfilesResult = await dbExecutor.executeCommand({
            option: "SELECT",
            table: "account_profiles",
            alias: "p",
            columns: [
                "p.account_id",
                "p.handle",
                "p.display_name",
                "p.avatar_key",
            ],
            where: [
                {
                    column: "p.account_id",
                    operator: "!=",
                    value: String(accountId ?? ""),
                },
                { column: "p.visibility", operator: "!=", value: "hidden" },
            ],
            orderBy: [{ column: "p.handle", direction: "ASC" }],
        });
        return (allProfilesResult.rows ?? [])
            .map(profileRowToPublicProfile)
            .filter((profile) => {
                if (!searchText) return true;
                return (
                    profile.handle.toLowerCase().includes(searchText) ||
                    profile.displayName.toLowerCase().includes(searchText)
                );
            });
    }

    const followerProfilesResult = await dbExecutor.executeCommand({
        option: "SELECT",
        table: "account_follows",
        alias: "f",
        columns: ["p.account_id", "p.handle", "p.display_name", "p.avatar_key"],
        joins: [
            {
                type: "INNER",
                table: "account_profiles",
                alias: "p",
                on: {
                    leftColumn: "p.account_id",
                    rightColumn: "f.follower_id",
                },
            },
        ],
        where: [{ column: "f.following_id", value: String(accountId ?? "") }],
        orderBy: [{ column: "f.created_at", direction: "DESC" }],
    });

    return (followerProfilesResult.rows ?? [])
        .map(profileRowToPublicProfile)
        .filter((profile) => {
            if (!searchText) return true;
            return (
                profile.handle.toLowerCase().includes(searchText) ||
                profile.displayName.toLowerCase().includes(searchText)
            );
        });
}

function normalizeParticipantIds(participantAccountIds) {
    return Array.from(
        new Set(
            (Array.isArray(participantAccountIds) ? participantAccountIds : [])
                .map((accountId) => String(accountId).trim())
                .filter(Boolean),
        ),
    );
}

export function registerApiRoutes(router) {
    const dbExecutor = router.capabilities?.get("db:executor") ?? null;

    const store = dbExecutor
        ? new JitsiMeetStore(
              dbExecutor,
              process.env.COGNIS_CREDENTIAL_SECRET ??
                  process.env.COGNIS_SESSION_SECRET,
          )
        : null;
    const schemaReady = store ? store.ensureSchema() : Promise.resolve();

    async function ensureStoreReady() {
        if (!store || !dbExecutor) {
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
        `/api/v1/modules/${MODULE_ID}/participants`,
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
            const filterMode = String(
                requestUrl.searchParams.get("filter") ?? "followers",
            )
                .trim()
                .toLowerCase();
            const searchText = sanitizeSearch(requestUrl.searchParams.get("q"));
            const participants = await listParticipants(
                dbExecutor,
                claims.sub,
                filterMode === "all" ? "all" : "followers",
                searchText,
            );
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: participants }));
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

            const body = await readJson(req);
            const participantHandle = sanitizeHandle(body?.participantHandle);
            let participantAccountIds = normalizeParticipantIds(
                body?.participantAccountIds,
            );

            if (participantHandle) {
                const participantProfile = await getProfileByHandle(
                    dbExecutor,
                    participantHandle,
                );
                if (!participantProfile) {
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
                participantAccountIds = [participantProfile.account_id];
            }

            participantAccountIds = normalizeParticipantIds([
                claims.sub,
                ...participantAccountIds,
            ]).filter((accountId) => accountId !== claims.sub);

            if (participantAccountIds.length === 0) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "missing_participants",
                            message: "At least one participant is required.",
                        },
                    }),
                );
                return;
            }

            const entityType = sanitizeEntityType(body?.entityType);
            const entityId = String(body?.entityId ?? "").trim();
            const isPairMeeting =
                entityType === "pair" && participantAccountIds.length === 1;

            const upsertResult = await store.upsertMeeting({
                entityType: isPairMeeting ? "pair" : entityType,
                entityId: isPairMeeting ? "" : entityId,
                ownerAccountId: claims.sub,
                defaultTitle: DEFAULT_MEETING_TITLE,
                title: sanitizeTitle(body?.title),
                participantAccountIds,
            });

            const meeting = upsertResult.meeting;
            const members = upsertResult.members;
            const baseUrl = await resolveBaseUrl(store);

            const memberProfiles = await getProfilesByAccountIds(
                dbExecutor,
                members.map((memberRow) => memberRow.account_id),
            );

            const ownProfile = await getOwnProfile(dbExecutor, claims.sub);
            const ownDisplayName =
                String(ownProfile?.display_name ?? "").trim() ||
                String(ownProfile?.handle ?? "").trim() ||
                "Cognis User";
            const ownAvatarUrl = ownProfile?.avatar_key
                ? `/api/v1/files/${ownProfile.avatar_key}`
                : null;

            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        meetingId: meeting.id,
                        roomSlug: meeting.room_slug,
                        title: meeting.title,
                        entityType: meeting.entity_type,
                        entityId: meeting.entity_id,
                        ownerAccountId: meeting.owner_account_id,
                        baseUrl,
                        joinUrl: buildJoinUrl(baseUrl, meeting.room_slug, {
                            displayName: ownDisplayName,
                            avatarUrl: ownAvatarUrl,
                        }),
                        members: memberProfiles,
                        requester: {
                            accountId: claims.sub,
                            displayName: ownDisplayName,
                            avatarUrl: ownAvatarUrl,
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

            const meeting = await store.findMeetingById(meetingId);
            if (!meeting) {
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

            const isMember = await store.isMeetingMember(
                meeting.id,
                claims.sub,
            );
            if (!isMember) {
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

            const members = await store.listMeetingMembers(meeting.id);
            const memberProfiles = await getProfilesByAccountIds(
                dbExecutor,
                members.map((memberRow) => memberRow.account_id),
            );
            const ownProfile = await getOwnProfile(dbExecutor, claims.sub);
            const ownDisplayName =
                String(ownProfile?.display_name ?? "").trim() ||
                String(ownProfile?.handle ?? "").trim() ||
                "Cognis User";
            const ownAvatarUrl = ownProfile?.avatar_key
                ? `/api/v1/files/${ownProfile.avatar_key}`
                : null;

            await store.touchMeeting(meeting.id);
            const baseUrl = await resolveBaseUrl(store);

            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: {
                        meetingId: meeting.id,
                        roomSlug: meeting.room_slug,
                        title: meeting.title,
                        entityType: meeting.entity_type,
                        entityId: meeting.entity_id,
                        ownerAccountId: meeting.owner_account_id,
                        baseUrl,
                        joinUrl: buildJoinUrl(baseUrl, meeting.room_slug, {
                            displayName: ownDisplayName,
                            avatarUrl: ownAvatarUrl,
                        }),
                        members: memberProfiles,
                        requester: {
                            accountId: claims.sub,
                            displayName: ownDisplayName,
                            avatarUrl: ownAvatarUrl,
                        },
                        createdAt: meeting.created_at,
                        updatedAt: meeting.updated_at,
                    },
                }),
            );
        },
        { access: { minRole: "user" } },
    );

    router.post(
        `/api/v1/modules/${MODULE_ID}/meeting/participants`,
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

            const body = await readJson(req);
            const meetingId = String(body?.meetingId ?? "").trim();
            const participantAccountIds = normalizeParticipantIds(
                body?.participantAccountIds,
            );

            if (!meetingId) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "missing_meeting_id",
                            message: "meetingId is required.",
                        },
                    }),
                );
                return;
            }

            const meeting = await store.findMeetingById(meetingId);
            if (!meeting) {
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

            if (meeting.owner_account_id !== claims.sub) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message:
                                "Only the meeting owner can update participants.",
                        },
                    }),
                );
                return;
            }

            await store.replaceMeetingMembers(meeting.id, [
                claims.sub,
                ...participantAccountIds,
            ]);
            await store.touchMeeting(meeting.id);
            const members = await store.listMeetingMembers(meeting.id);
            const memberProfiles = await getProfilesByAccountIds(
                dbExecutor,
                members.map((memberRow) => memberRow.account_id),
            );

            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { meetingId: meeting.id, members: memberProfiles },
                }),
            );
        },
        { access: { minRole: "user" } },
    );
}
