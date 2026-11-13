import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../ui/reuse/provider-lifecycle.js";
import { registerScopedUiActions } from "../../../ui/reuse/scoped-actions.js";

test("Calendar delegates meeting creation to the installed provider through ctx", async (t) => {
    const calls = [];
    let destination = "/provider-owned-meeting/id";
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({
            mountProvider(ctx) {
                const actions = registerScopedUiActions(
                    ctx,
                    "fixture:meetings",
                    {
                        create: async (input) => {
                            calls.push(input);
                            return {
                                meetingId: "id",
                                navigationUrl: destination,
                            };
                        },
                    },
                );
                ctx.capabilities.contribute(
                    "meetings:createMeeting",
                    actions.create,
                );
            },
        }),
    });
    t.after(() => lifecycle.reconcile([]));
    const client = loadTestModule(
        new URL("../ui/calendar-api.js", import.meta.url),
        {
            "./offline-client.js": {
                calendarFetch: () =>
                    assert.fail(
                        "Calendar must not call another component's endpoint.",
                    ),
            },
            "/static/reuse/ui-ctx.js": { uiCtx },
        },
        { URL, window: { location: { origin: "https://cognis.test" } } },
    );
    await assert.rejects(
        client.createMeeting(["alice"]),
        /meeting_provider_unavailable/,
    );
    await lifecycle.reconcile([{ scriptUrl: "/fixture-meeting-provider.js" }]);
    assert.equal(
        await client.createMeeting(["alice"], {
            scheduledAt: "2026-11-03T12:00:00Z",
        }),
        "https://cognis.test/provider-owned-meeting/id",
    );
    assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
        participants: ["alice"],
        scheduledAt: "2026-11-03T12:00:00Z",
    });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
        client.createMeeting(["alice"], { signal: controller.signal }),
        { name: "AbortError" },
    );
    destination = "javascript:unsafe()";
    await assert.rejects(
        client.createMeeting(["alice"]),
        /meeting_destination_invalid/,
    );
    await lifecycle.reconcile([]);
    await assert.rejects(
        client.createMeeting(["alice"]),
        /meeting_provider_unavailable/,
    );
    assert.equal(calls.length, 2);
});
