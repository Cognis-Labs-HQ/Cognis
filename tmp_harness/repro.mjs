import { InMemoryTestExecutor } from "../src/gateways/db/tests/in-memory-test-executor.js";
import { JitsiMeetStore } from "../src/modules/jitsi-meet/api/store.js";
import { registerMeetingRoutes } from "../src/modules/jitsi-meet/api/meetings-routes.js";
import { canAccessMeeting, createMeetingPayload, filterUsernamesForGuestVisibility, resolveMeetingPayloadOrReject, resolveRequestedParticipants, resolveShareGuestMeetingAccess } from "../src/modules/jitsi-meet/api/reuse/meeting-access.js";
import { resolveRequesterUsername } from "../src/modules/jitsi-meet/api/reuse/requester.js";

const db = new InMemoryTestExecutor();
const store = new JitsiMeetStore({ db, log: (level, msg, meta) => console.log(level, msg, meta) });

const profileStore = {
  async getProfileByHandle(handle) {
    return { handle, displayName: handle, avatarKey: null };
  },
  async getProfile(accountId) {
    return { handle: accountId, displayName: accountId, avatarKey: null };
  },
};

class Router {
  routes = [];
  get(path, handler) { this.routes.push({ method: "GET", path, handler }); }
  post(path, handler) { this.routes.push({ method: "POST", path, handler }); }
}
const router = new Router();

function requireAuth(req, res) {
  return { sub: "alice", role: "user" };
}
function sendJson(res, code, body) {
  res.statusCode = code;
  res.body = body;
  console.log("sendJson", code, JSON.stringify(body).slice(0, 500));
}
function sendError(res, code, errCode, msg) {
  res.statusCode = code;
  res.body = { error: { code: errCode, message: msg } };
  console.log("sendError", code, errCode, msg);
}
async function readJson(req) {
  return req.jsonBody ?? {};
}

registerMeetingRoutes({
  router,
  store,
  profileStore,
  listCalendarsByOwner: async () => [],
  listCalendarEvents: async () => [],
  listClassroomParticipantHandles: async () => [],
  resolveMeetingPayloadOrReject,
  createMeetingPayload,
  resolveRequesterUsername: async () => "alice",
  canAccessMeeting: async () => true,
  filterUsernamesForGuestVisibility,
  requireAuth,
  readJson,
  sendJson,
  sendError,
  checkHttpLiveness: async () => true,
  LIVELINESS_TIMEOUT_MS: 5000,
  resolveShareGuestMeetingAccess,
});

async function callRoute(method, path, jsonBody) {
  const route = router.routes.find((r) => r.method === method && r.path === path);
  if (!route) {
    console.log("NO ROUTE FOUND", method, path);
    return;
  }
  const req = { url: path, headers: {}, jsonBody };
  const res = {};
  try {
    await route.handler(req, res);
  } catch (error) {
    console.error("THROWN ERROR for", method, path, error);
  }
}

async function main() {
  await store.ensureSchema();
  await store.saveConfig({ instanceUrl: "https://meet.example.com", meetingPrefix: "cognis" });
  const meeting = await store.createMeeting({
    instanceUrl: "https://meet.example.com",
    meetingPrefix: "cognis",
    usernames: ["alice", "bob"],
    classroomId: null,
    createdBy: "alice",
    chatRoomId: null,
  });
  console.log("created meeting", meeting.id);
  await store.upsertPresence(meeting.id, "alice", "session-1", true);
  await callRoute("GET", "/api/v1/modules/jitsi-meet/meetings/active");
  await callRoute("POST", "/api/v1/modules/jitsi-meet/meetings/get", { id: meeting.id });
}
main();

async function testNoProfile() {
  const badProfileStore = {
    async getProfile() { return { handle: "" }; },
    async getProfileByHandle(handle) { return { handle, displayName: handle }; },
  };
  class Router2 {
    routes = [];
    get(path, handler) { this.routes.push({ method: "GET", path, handler }); }
    post(path, handler) { this.routes.push({ method: "POST", path, handler }); }
  }
  const router2 = new Router2();
  registerMeetingRoutes({
    router: router2,
    store,
    profileStore: badProfileStore,
    listCalendarsByOwner: async () => [],
    listCalendarEvents: async () => [],
    listClassroomParticipantHandles: async () => [],
    resolveMeetingPayloadOrReject,
    createMeetingPayload,
    resolveRequesterUsername: (await import("../src/modules/jitsi-meet/api/reuse/requester.js")).resolveRequesterUsername,
    canAccessMeeting: async () => true,
    filterUsernamesForGuestVisibility,
    requireAuth,
    readJson,
    sendJson,
    sendError,
    checkHttpLiveness: async () => true,
    LIVELINESS_TIMEOUT_MS: 5000,
    resolveShareGuestMeetingAccess,
  });
  const route = router2.routes.find((r) => r.method === "GET" && r.path === "/api/v1/modules/jitsi-meet/meetings/active");
  const req = { url: route.path, headers: {} };
  const res = {};
  try {
    await route.handler(req, res);
    console.log("no-profile test: handled without throw, res:", res.statusCode, res.body);
  } catch (error) {
    console.error("no-profile test THROWN:", error.message);
  }
}
testNoProfile();
