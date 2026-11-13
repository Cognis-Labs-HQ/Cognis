import test from "node:test";
import assert from "node:assert/strict";
import { createOfflineClientFixture } from "../../../tooling/reuse/offline-client-fixture.js";

test("a preparation interrupted by disconnection retries after verified recovery", async (context) => {
    const host = createOfflineClientFixture(() =>
        assert.fail("No transport in coordinator test"),
    );
    context.after(() => host.controller.abort());
    let attempts = 0;
    host.imports[
        "/static/reuse/offline-snapshot.js"
    ].bindOfflineSnapshotRefresh(host.ctx, {
        id: "test:interruptedSnapshot",
        refresh: async () => {
            attempts++;
            if (attempts === 1) host.disconnect();
        },
    });
    host.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:verifiedRecovery" },
        () => ({ authenticated: true }),
    );
    await host.ctx.runFlow("authenticate-session", {});
    assert.equal(attempts, 1);
    host.reconnect();
    await host.ctx.runFlow("authenticate-session", {});
    assert.equal(attempts, 2);
});
