import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

test(
    "event receipts do not wait for an availability refresh",
    { timeout: 1000 },
    async () => {
        let refreshed = 0;
        const client = loadTestModule(
            new URL("../ui/calendar-api.js", import.meta.url),
            {
                "./offline-client.js": {
                    calendarFetch: async () =>
                        Response.json({ data: { id: "event" } }),
                },
                "/static/reuse/ui-ctx.js": {
                    uiCtx: {
                        capabilities: {
                            get: (id) =>
                                id === "offline:state"
                                    ? { isOffline: () => false }
                                    : {
                                          refresh: () => {
                                              refreshed++;
                                              return new Promise(() => {});
                                          },
                                      },
                        },
                    },
                },
            },
            { document: {}, console },
        );
        const response = await client.createEvent("calendar", {
            startAt: new Date(Date.now() - 60000).toISOString(),
            endAt: new Date(Date.now() + 60000).toISOString(),
        });
        assert.equal(response.ok, true);
        assert.equal(refreshed, 1);
    },
);
