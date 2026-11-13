import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../ui/reuse/provider-lifecycle.js";
import { registerScopedUiActions } from "../../../ui/reuse/scoped-actions.js";

test("shared Calendar operations use cancellable owned flows and explicit guest authority", async (t) => {
    const requests = [];
    const clientModule = loadTestModule(
        new URL("../ui/shared-client.js", import.meta.url),
        {
            "/static/reuse/api-client.js": {
                apiFetch: async (url, options) => {
                    requests.push({ url, options });
                    return Response.json({ data: [] });
                },
            },
            "/static/reuse/scoped-actions.js": { registerScopedUiActions },
        },
        { AbortSignal },
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => ({
            mountProvider: clientModule.registerSharedCalendarClient,
        }),
    });
    t.after(() => lifecycle.reconcile([]));
    await lifecycle.reconcile([{ scriptUrl: "/calendar-shared-client.js" }]);
    const client = uiCtx.capabilities.get("calendar:sharedClient");
    const controller = new AbortController();
    const input = {
        calendarId: "calendar-id",
        guestAccessToken: "scoped-guest-token",
        signal: controller.signal,
        body: { title: "Visible event" },
    };
    for (const action of [
        "readEvents",
        "createEvent",
        "updateEvent",
        "deleteEvent",
    ]) {
        assert.equal((await client[action](input)).ok, true);
    }
    assert.deepEqual(
        requests.map(({ options }) => options.method),
        ["GET", "POST", "PATCH", "DELETE"],
    );
    for (const request of requests) {
        assert.equal(request.url, "/api/v1/calendar/shared/calendar-id/events");
        assert.equal(request.options.accessToken, "scoped-guest-token");
        assert.equal(request.options.bufferOffline, false);
    }
    await assert.rejects(
        client.readEvents({ ...input, guestAccessToken: "" }),
        /calendar_shared_authority_required/,
    );
    uiCtx.extendFlow(
        "calendar:shared:createEvent",
        "before",
        { id: "test:deny" },
        () => {
            throw new Error("test_veto");
        },
    );
    await assert.rejects(client.createEvent(input), /test_veto/);
    controller.abort();
    await assert.rejects(client.readEvents(input), { name: "AbortError" });
    assert.equal(requests.length, 4);
    await lifecycle.reconcile([]);
    await assert.rejects(client.readEvents({ ...input, signal: undefined }), {
        name: "AbortError",
    });
    assert.equal(requests.length, 4);
});
