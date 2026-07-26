import test from "node:test";
import assert from "node:assert/strict";
import {
    canAccessMeeting,
    resolveMeetingPayloadOrReject,
} from "../reuse/meeting-access.js";
import { registerMeetingRoutes } from "../meetings-routes.js";
import { JitsiMeetStore } from "../store.js";

function createProfileStoreWithoutHandle() {
    return {
        async getProfile() {
            return null;
        },
        async getProfileByHandle() {
            return null;
        },
    };
}

function createInMemoryJitsiDb() {
    const rows = { jitsi_meetings: [], jitsi_meeting_state: [] };
    return {
        async ensureTable() {},
        async transaction(callback) {
            return callback(this);
        },
        async executeCommand(command) {
            if (command.option === "SELECT") {
                const table = rows[command.table] ?? [];
                if (!command.where) return { rows: table };
                return {
                    rows: table.filter((row) =>
                        command.where.every(
                            (whereEntry) =>
                                row[whereEntry.column] === whereEntry.value,
                        ),
                    ),
                };
            }
            return { rows: [] };
        },
    };
}

test("resolveMeetingPayloadOrReject reports profile_required instead of throwing when the caller has no visible profile handle", async () => {
    const sendErrorCalls = [];
    const sendError = (res, status, code, message) => {
        sendErrorCalls.push({ status, code, message });
    };

    const result = await resolveMeetingPayloadOrReject({
        body: { meetingId: "meeting-1" },
        profileStore: createProfileStoreWithoutHandle(),
        store: new JitsiMeetStore({ db: createInMemoryJitsiDb() }),
        claims: { sub: "account-without-profile" },
        sendError,
        res: {},
        listClassroomParticipantHandles: async () => [],
    });

    assert.equal(result, null);
    assert.deepEqual(sendErrorCalls, [
        {
            status: 409,
            code: "profile_required",
            message: "A visible profile handle is required to use Meetings.",
        },
    ]);
});

test("jitsi meetings active endpoint reports profile_required instead of throwing when the caller has no visible profile handle", async () => {
    class RouterStub {
        routes = [];
        get(routePath, handler) {
            this.routes.push({ method: "GET", path: routePath, handler });
        }
        post(routePath, handler) {
            this.routes.push({ method: "POST", path: routePath, handler });
        }
    }
    const router = new RouterStub();
    const sendErrorCalls = [];
    const sendError = (res, status, code, message) => {
        sendErrorCalls.push({ status, code, message });
    };

    registerMeetingRoutes({
        router,
        store: new JitsiMeetStore({ db: createInMemoryJitsiDb() }),
        profileStore: createProfileStoreWithoutHandle(),
        listCalendarsByOwner: async () => [],
        listCalendarEvents: async () => [],
        listClassroomParticipantHandles: async () => [],
        resolveMeetingPayloadOrReject,
        createMeetingPayload: async () => ({}),
        resolveRequesterUsername: (await import("../reuse/requester.js"))
            .resolveRequesterUsername,
        canAccessMeeting: async () => true,
        filterUsernamesForGuestVisibility: async (usernames) => usernames,
        requireAuth: () => ({ sub: "account-without-profile", role: "user" }),
        readJson: async () => ({}),
        sendJson: () => {},
        sendError,
        checkHttpLiveness: async () => true,
        LIVELINESS_TIMEOUT_MS: 5000,
        resolveShareGuestMeetingAccess: async () => ({ isGuest: false }),
    });

    const activeRoute = router.routes.find(
        (routeEntry) =>
            routeEntry.method === "GET" &&
            routeEntry.path === "/api/v1/modules/jitsi-meet/meetings/active",
    );

    await assert.doesNotReject(() => activeRoute.handler({}, {}));
    assert.deepEqual(sendErrorCalls, [
        {
            status: 409,
            code: "profile_required",
            message: "A visible profile handle is required to use Meetings.",
        },
    ]);
});

test("LDAP participants retain meeting access when their profile handle changes", async () => {
    const allowed = await canAccessMeeting({
        store: {
            async listParticipants() {
                return ["alice", "ldap:students:student-42"];
            },
        },
        meeting: {
            id: "meeting-1",
            createdBy: "alice",
            classroomId: null,
        },
        username: "ldap-student-after-rename",
        requesterAccountId: "ldap:Students:student-42",
        profileStore: {
            async getProfileByHandle() {
                return null;
            },
            async isBlocked() {
                return false;
            },
        },
        listClassroomParticipantHandles: async () => [],
    });

    assert.equal(allowed, true);
});

test("jitsi meetings active endpoint passes account identity to access checks", async () => {
    class RouterStub {
        routes = [];
        get(routePath, handler) {
            this.routes.push({ method: "GET", path: routePath, handler });
        }
        post() {}
    }
    const router = new RouterStub();
    const accessChecks = [];
    const store = {
        async ensureSchema() {},
        async listActiveMeetings() {
            return [{ id: "meeting-1", activeUsernames: [] }];
        },
        async getMeetingById() {
            return {
                id: "meeting-1",
                createdBy: "alice",
                classroomId: null,
            };
        },
        async listParticipants() {
            return ["ldap:students:student-42"];
        },
        async getMeetingState() {
            return { endedAt: null, authRequired: false };
        },
    };
    const profileStore = {
        async getProfile(accountId) {
            return { accountId, handle: "renamed-student" };
        },
        async getProfileByHandle() {
            return null;
        },
    };

    registerMeetingRoutes({
        router,
        store,
        profileStore,
        listCalendarsByOwner: async () => [],
        listCalendarEvents: async () => [],
        listClassroomParticipantHandles: async () => [],
        resolveMeetingPayloadOrReject,
        createMeetingPayload: async () => ({}),
        resolveRequesterUsername: async () => "renamed-student",
        canAccessMeeting: async (input) => {
            accessChecks.push(input);
            return false;
        },
        filterUsernamesForGuestVisibility: async (usernames) => usernames,
        requireAuth: () => ({
            sub: "ldap:Students:student-42",
            role: "user",
        }),
        readJson: async () => ({}),
        sendJson: () => {},
        sendError: () => {},
        checkHttpLiveness: async () => true,
        LIVELINESS_TIMEOUT_MS: 5000,
        resolveShareGuestMeetingAccess: async () => ({ isGuest: false }),
    });

    const activeRoute = router.routes.find(
        (routeEntry) =>
            routeEntry.path === "/api/v1/modules/jitsi-meet/meetings/active",
    );
    await activeRoute.handler({}, {});

    assert.equal(accessChecks.length, 1);
    assert.equal(
        accessChecks[0].requesterAccountId,
        "ldap:Students:student-42",
    );
    assert.equal(accessChecks[0].profileStore, profileStore);
});
