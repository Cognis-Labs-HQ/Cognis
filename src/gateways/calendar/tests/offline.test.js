import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

test("Calendar caches owned events, projects queued creates and edits, and replays stable identities", async () => {
    const sent = [];
    const host = createOfflineClientFixture(async (path, options = {}) => {
        if (options.method) {
            sent.push({
                path,
                method: options.method,
                body: options.body && JSON.parse(options.body),
            });
            return Response.json({ data: {} });
        }
        return Response.json({
            data: path.endsWith("/calendars")
                ? [{ id: "primary", ownerAccountId: "learner" }]
                : { events: [{ id: "old", title: "Original" }] },
        });
    });
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        host.imports,
        host.globals,
    );
    client.registerCalendarClient(host.ctx);
    await client.calendarFetch("/api/v1/calendar/calendars");
    const path = "/api/v1/calendar/calendars/primary/events";
    await client.calendarFetch(path);
    host.disconnect();
    const created = await (
        await client.calendarFetch(path, {
            method: "POST",
            body: JSON.stringify({
                title: "New event",
                startAt: "2027-01-02T10:00:00Z",
                endAt: "2027-01-02T11:00:00Z",
            }),
        })
    ).json();
    assert.equal(created.queued, true);
    await client.calendarFetch(path + "/old", {
        method: "PATCH",
        body: JSON.stringify({ title: "Edited" }),
    });
    const events = (await (await client.calendarFetch(path)).json()).data
        .events;
    assert.equal(events[0].title, "Edited");
    assert.equal(events[1].id, created.data.id);
    assert.equal(sent.length, 0);
    host.reconnect();
    assert.equal((await host.outbox.flush()).sent, 2);
    assert.equal(sent[0].body.operationId, created.data.id);
    host.disconnect();
    host.changeAccount("another-account");
    await assert.rejects(
        client.calendarFetch(path),
        /offline_read_unavailable/,
    );
    host.controller.abort();
});

test("Calendar refreshes its authenticated snapshots after preference cache invalidation", async () => {
    const window = new EventTarget();
    let loads = 0;
    const host = createOfflineClientFixture(
        async (path) => {
            loads++;
            return Response.json({
                data: path.endsWith("/calendars")
                    ? [{ id: "primary", ownerAccountId: "learner" }]
                    : path.endsWith("/events")
                      ? { events: [] }
                      : [],
            });
        },
        { window },
    );
    const client = loadTestModule(
        new URL("../ui/offline-client.js", import.meta.url),
        host.imports,
        host.globals,
    );
    const provider = loadTestModule(
        new URL("../ui/provider.js", import.meta.url),
        {
            "./offline-client.js": client,
            "/static/reuse/offline-snapshot.js":
                host.imports["/static/reuse/offline-snapshot.js"],
            "./calendar-api.js": { calendarDashboardEvents: {} },
            "/static/reuse/offline-state.js":
                host.imports["/static/reuse/offline-state.js"],
        },
        { ...host.globals, window },
    );
    provider.mountProvider(host.ctx);
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:calendarSession" },
        () => ({ authenticated: true }),
    );
    await host.ctx.runFlow("authenticate-session", {});
    const request = host.ctx.capabilities.get("calendar:request");
    for (
        let pass = 0;
        pass < 20 &&
        !request.hasCachedRead("/api/v1/calendar/calendars/primary/events");
        pass++
    )
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
        request.hasCachedRead("/api/v1/calendar/calendars/primary/events"),
        true,
    );
    host.invalidateCache();
    assert.equal(
        request.hasCachedRead("/api/v1/calendar/calendars/primary/events"),
        false,
    );
    window.dispatchEvent(new Event("cognis:offline-preference-changed"));
    for (
        let pass = 0;
        pass < 20 &&
        !request.hasCachedRead("/api/v1/calendar/calendars/primary/events");
        pass++
    )
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(
        request.hasCachedRead("/api/v1/calendar/calendars/primary/events"),
        true,
    );
    assert.ok(loads >= 6);
    host.controller.abort();
});
