import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import { loadProfileOfflineClient } from "./reuse/offline-client.js";

for (const guest of [true, false]) {
    test(`navbar profile reads respect the current account session (guest=${guest})`, async () => {
        const requests = [];
        const globals = {
            localStorage: {
                getItem: (key) =>
                    key === "cognis_account"
                        ? "visitor"
                        : key === "cognis_access_token"
                          ? "test-token"
                          : null,
            },
        };
        const policy = loadTestModule(
            new URL("../ui/session-policy.js", import.meta.url),
            {},
            globals,
        );
        const { createNavbarAvatarProvider } = loadTestModule(
            new URL("../ui/navbar-avatar.js", import.meta.url),
            {
                "./session-policy.js": policy,
                "/static/reuse/api-client.js": {
                    apiFetch: async (path) => {
                        requests.push(path);
                        return Response.json({
                            data: { displayName: "Visitor" },
                        });
                    },
                },
                "/static/reuse/offline-state.js": { isOffline: () => false },
                "./profile-avatar.js": {
                    fetchProfileAvatarBlobUrl: () =>
                        assert.fail("No avatar was supplied"),
                    getProfileInitials: (label) => label[0],
                    getProfileInitialsColor: () => "color",
                },
            },
            globals,
        );
        const result = await createNavbarAvatarProvider({
            capabilities: {
                get: (id) =>
                    id === "session:isGuest" ? () => guest : undefined,
            },
        })();
        assert.equal(result.profileAvailable, !guest);
        assert.deepEqual(
            requests,
            guest
                ? []
                : ["/api/v1/social/profile/ping", "/api/v1/social/profile"],
        );
    });
}

test("authenticated Share guests do not prepare account-only Profile snapshots", async (t) => {
    const requests = [];
    const host = createOfflineClientFixture(async (path) => {
        requests.push(path);
        return Response.json({ data: {} });
    });
    t.after(() => host.controller.abort());
    host.ctx.capabilities.contribute("session:isGuest", () => true);
    const client = loadProfileOfflineClient(host);
    client.registerProfileOfflineClient(host.ctx);
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "fixture:profileGuest" },
        () => ({ authenticated: true, isGuestSession: true }),
    );
    await host.ctx.runFlow("authenticate-session", {});
    await new Promise(setImmediate);
    assert.deepEqual(requests, []);
});
