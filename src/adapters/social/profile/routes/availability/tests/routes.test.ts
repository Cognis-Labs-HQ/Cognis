import test from "node:test";
import assert from "node:assert/strict";
import type { RouteContext } from "../../../../../../api/reuse/route-context.js";
import { VolatileUserPreferenceStore } from "../../preferences.js";
import {
    AvailabilityPresenceStore,
    createAvailabilityRoutes,
    resolveEffectiveAvailability,
} from "../index.js";

const profile = {
    accountId: "alice",
    handle: "alice",
    displayName: "Alice",
};

function request(method: string, body?: string, accountId = "alice") {
    return {
        method,
        accountId,
        [Symbol.asyncIterator]: async function* () {
            if (body) yield Buffer.from(body);
        },
    } as any;
}

const routeContext = {
    requireAuth(request) {
        return {
            sub: String((request as { accountId: string }).accountId),
            role: "user",
        };
    },
} as RouteContext;

function responseCapture() {
    const capture = { status: 0, body: "" };
    return {
        capture,
        response: {
            writeHead(status: number) {
                capture.status = status;
            },
            end(body: string) {
                capture.body = body;
            },
        } as any,
    };
}

test("manual availability overrides an active calendar event", async () => {
    const preferences = new VolatileUserPreferenceStore();
    const profileStore = {
        getProfile: async () => profile,
        getProfileByHandle: async () => profile,
    } as any;
    const route = createAvailabilityRoutes(
        profileStore,
        preferences,
        async () => ({
            status: "tentative",
            effectiveSince: "2020-01-01T00:00:00.000Z",
        }),
        routeContext,
    );

    const saved = responseCapture();
    await route(
        request("PUT", JSON.stringify({ status: "busy" })),
        saved.response,
        new URL("http://localhost/api/v1/social/availability"),
    );
    assert.equal(saved.capture.status, 200);

    const loaded = responseCapture();
    await route(
        request("GET"),
        loaded.response,
        new URL("http://localhost/api/v1/social/availability/alice"),
    );
    const payload = JSON.parse(loaded.capture.body);
    assert.equal(payload.data.status, "busy");
    assert.equal(payload.data.manualStatus, "busy");
    assert.equal(payload.data.source, "manual");
});

test("a newly effective calendar event supersedes an older manual status", () => {
    assert.deepEqual(
        resolveEffectiveAvailability(
            {
                status: "free",
                updatedAt: "2030-01-01T09:00:00.000Z",
            },
            {
                status: "busy",
                effectiveSince: "2030-01-01T10:00:00.000Z",
            },
        ),
        { status: "busy", source: "calendar" },
    );
});

test("a manual update made during an event supersedes that event", () => {
    assert.deepEqual(
        resolveEffectiveAvailability(
            {
                status: "free",
                updatedAt: "2030-01-01T10:05:00.000Z",
            },
            {
                status: "busy",
                effectiveSince: "2030-01-01T10:00:00.000Z",
            },
        ),
        { status: "free", source: "manual" },
    );
});

test("presence reports idle only after every active session expires", () => {
    const presence = new AvailabilityPresenceStore();
    presence.update("alice", "desktop", true, 1_000);
    presence.update("alice", "mobile", false, 20_000);

    assert.equal(presence.isIdle("alice", 30_000), false);
    assert.equal(presence.isIdle("alice", 50_000), true);
});

test("presence bounds the sessions retained for each account", () => {
    const presence = new AvailabilityPresenceStore();
    presence.update("alice", "old-active-session", true, 1_000);
    for (let sessionIndex = 1; sessionIndex <= 8; sessionIndex += 1) {
        presence.update(
            "alice",
            `inactive-${sessionIndex}`,
            false,
            1_000 + sessionIndex,
        );
    }

    assert.equal(presence.isIdle("alice", 10_000), true);
});

test("availability visibility follows community, friends, and private relationships", async () => {
    const preferences = new VolatileUserPreferenceStore();
    const profiles = new Map([
        ["alice", { ...profile, visibility: "community" }],
        [
            "bob",
            {
                ...profile,
                accountId: "bob",
                handle: "bob",
                visibility: "community",
            },
        ],
    ]);
    const follows = new Set<string>();
    const blocks = new Set<string>();
    const profileStore = {
        getProfile: async (accountId: string) => profiles.get(accountId),
        getProfileByHandle: async (handle: string) => profiles.get(handle),
        isFollowing: async (followerId: string, followingId: string) =>
            follows.has(`${followerId}:${followingId}`),
        isBlocked: async (blockerId: string, blockedId: string) =>
            blocks.has(`${blockerId}:${blockedId}`),
    } as any;
    const presence = new AvailabilityPresenceStore();
    const route = createAvailabilityRoutes(
        profileStore,
        preferences,
        async () => null,
        routeContext,
        presence,
    );
    const presenceResponse = responseCapture();
    await route(
        request("PUT", JSON.stringify({ sessionId: "browser", active: false })),
        presenceResponse.response,
        new URL("http://localhost/api/v1/social/availability/presence"),
    );
    assert.equal(presenceResponse.capture.status, 200);

    async function readAsBob() {
        const capture = responseCapture();
        await route(
            request("GET", undefined, "bob"),
            capture.response,
            new URL("http://localhost/api/v1/social/availability/alice"),
        );
        return capture.capture;
    }

    assert.equal((await readAsBob()).status, 200);
    assert.equal(JSON.parse((await readAsBob()).body).data.status, "idle");

    blocks.add("alice:bob");
    assert.equal((await readAsBob()).status, 404);
    blocks.clear();

    profiles.set("alice", { ...profiles.get("alice")!, visibility: "friends" });
    assert.equal((await readAsBob()).status, 404);
    follows.add("bob:alice");
    assert.equal((await readAsBob()).status, 200);

    profiles.set("alice", { ...profiles.get("alice")!, visibility: "private" });
    assert.equal((await readAsBob()).status, 404);
    follows.add("alice:bob");
    assert.equal((await readAsBob()).status, 200);
});
