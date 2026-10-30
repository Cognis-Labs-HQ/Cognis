import test from "node:test";
import assert from "node:assert/strict";
import { authenticate } from "./ui-environment.js";
import { uiCtx } from "../../../../ui/reuse/ui-ctx.js";
import { requestKeyringUnlock } from "../ui/keyring.js";

for (const available of [true, false, undefined]) {
    test(`guest unlock uses the session contract without an account prompt (${available})`, async () => {
        const guest = uiCtx.capabilities.get("session:isGuest");
        const ensure = uiCtx.capabilities.get("session:ensureGuestKeyring");
        const fetch = globalThis.fetch;
        const calls = [];
        let requests = 0;
        authenticate("guest");
        uiCtx.capabilities.remove(
            "session:isGuest",
            uiCtx.capabilities.get("session:isGuest"),
        );
        uiCtx.capabilities.remove(
            "session:ensureGuestKeyring",
            uiCtx.capabilities.get("session:ensureGuestKeyring"),
        );
        uiCtx.capabilities.contribute("session:isGuest", () => true);
        if (available !== undefined)
            uiCtx.capabilities.contribute(
                "session:ensureGuestKeyring",
                async () => {
                    calls.push("ensure");
                    return available;
                },
            );
        globalThis.fetch = () => {
            requests++;
            assert.fail("Guest unlock must not fetch an account vault");
        };
        try {
            assert.equal(
                await requestKeyringUnlock({
                    request: {
                        component: "Test",
                        action: "read",
                        process: "test secret",
                    },
                    passwordPrompt: () =>
                        assert.fail(
                            "Guest unlock must not prompt for an account password",
                        ),
                }),
                available === true,
            );
            assert.equal(calls.length, available === undefined ? 0 : 1);
            assert.equal(requests, 0);
        } finally {
            globalThis.fetch = fetch;
            uiCtx.capabilities.remove(
                "session:isGuest",
                uiCtx.capabilities.get("session:isGuest"),
            );
            uiCtx.capabilities.remove(
                "session:ensureGuestKeyring",
                uiCtx.capabilities.get("session:ensureGuestKeyring"),
            );
            if (guest) uiCtx.capabilities.contribute("session:isGuest", guest);
            if (ensure)
                uiCtx.capabilities.contribute(
                    "session:ensureGuestKeyring",
                    ensure,
                );
        }
    });
}
