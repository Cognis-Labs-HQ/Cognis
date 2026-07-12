import { InMemoryTestExecutor } from "../src/gateways/db/tests/in-memory-test-executor.js";
import { registerApiRoutes } from "../src/modules/jitsi-meet/api/index.js";
import { issueAccessToken } from "../src/gateways/auth/access-tokens.js";

const db = new InMemoryTestExecutor();

const profiles = new Map();
//no alice profile
//profiles.set("acc-bob", { handle: "bob", displayName: "Bob", visibility: "community", avatarKey: null });

const profileStore = {
  async getProfile(accountId) {
    return profiles.get(accountId) ?? null;
  },
  async getProfileByHandle(handle) {
    for (const p of profiles.values()) if (p.handle === handle) return p;
    return null;
  },
};

const capabilities = {
  "db:executor": db,
  "social:profileStore": profileStore,
  "logging:log": (level, msg, meta) => console.log(level, msg, meta),
  "auth:registerPageScriptOrigins": () => {},
  "study:classroom:listParticipantHandles": async () => [],
  "calendar:listCalendars": async () => [],
  "calendar:listEvents": async () => [],
};

const ctx = {
  getCapability(name) {
    return capabilities[name];
  },
  moduleRoot: "/home/runner/work/Cognis/Cognis/src/modules/jitsi-meet",
  capabilities: {
    contribute() {},
  },
};

class Router {
  routes = [];
  get(path, handler, options) { this.routes.push({ method: "GET", path, handler, options }); }
  post(path, handler, options) { this.routes.push({ method: "POST", path, handler, options }); }
}
const router = new Router();

registerApiRoutes(router, ctx);

function makeRes() {
  const res = { statusCode: 0, body: null };
  res.writeHead = (code) => { res.statusCode = code; };
  res.end = (chunk) => { res.body = chunk ? JSON.parse(chunk) : null; };
  return res;
}

const aliceToken = issueAccessToken("acc-alice", "user", null);
const adminToken = issueAccessToken("acc-alice", "admin", null);

async function callRoute(method, path, jsonBody, token = aliceToken) {
  const route = router.routes.find((r) => r.method === method && r.path === path);
  if (!route) { console.log("NO ROUTE", method, path); return; }
  const req = {
    url: path,
    headers: { authorization: "Bearer " + token },
    async *[Symbol.asyncIterator]() {
      if (jsonBody) yield Buffer.from(JSON.stringify(jsonBody));
    },
  };
  const res = makeRes();
  try {
    await route.handler(req, res);
    console.log("RESULT", method, path, res.statusCode, JSON.stringify(res.body).slice(0, 300));
  } catch (error) {
    console.error("THROWN", method, path, error);
  }
}

async function main() {
  await callRoute("POST", "/api/v1/modules/jitsi-meet/config", { instanceUrl: "https://meet.example.com" }, adminToken);
  await callRoute("GET", "/api/v1/modules/jitsi-meet/meetings/active");
  await callRoute("POST", "/api/v1/modules/jitsi-meet/meetings/create", { participants: ["bob"] });
}
main();
