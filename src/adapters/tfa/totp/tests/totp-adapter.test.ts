import test from "node:test";
import assert from "node:assert/strict";
import { createAdapter } from "../index.js";

test("totp adapter setup returns otpauth details", async () => {
    const adapter = createAdapter();
    const setup = await adapter.beginSetup({
        accountId: "alice",
        displayName: "Alice",
        issuer: "Cognis",
    });
    assert.equal(typeof setup.pendingPayload.secret, "string");
    assert.equal(
        setup.view.details?.otpAuthUri?.startsWith("otpauth://totp/"),
        true,
    );
    assert.equal(
        setup.view.details?.qrDataUrl?.startsWith("data:image/png;base64,"),
        true,
    );
});
