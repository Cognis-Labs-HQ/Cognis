import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("totp adapter setup returns secret and qr svg details", async () => {
    const adapter = createAdapter();
    const setup = await adapter.beginSetup({
        accountId: "alice",
        displayName: "Alice",
        issuer: "Cognis",
    });
    assert.equal(typeof setup.pendingPayload.secret, "string");
    assert.equal(typeof setup.view.details?.manualSecret === "string", true);
    assert.equal(setup.view.details?.qrSvg?.includes("<svg"), true);
});
