import assert from "node:assert/strict";
import test from "node:test";
import { resolveCallbackContinuation } from "../ui/login-page/callback-continuation.js";

test("SSO callback bridge converts fragment response parameters to a server request", () => {
    assert.equal(
        resolveCallbackContinuation(
            new URL(
                "https://cognis.example/sso/x/callback#code=authorization-code&state=state-token",
            ),
        ),
        "/sso/x/callback?code=authorization-code&state=state-token",
    );
});

test("SSO callback bridge forwards provider errors and rejects empty fragments", () => {
    assert.equal(
        resolveCallbackContinuation(
            new URL(
                "https://cognis.example/sso/x/callback#error=access_denied&state=state-token",
            ),
        ),
        "/sso/x/callback?error=access_denied&state=state-token",
    );
    assert.equal(
        resolveCallbackContinuation(
            new URL("https://cognis.example/sso/x/callback"),
        ),
        null,
    );
});
