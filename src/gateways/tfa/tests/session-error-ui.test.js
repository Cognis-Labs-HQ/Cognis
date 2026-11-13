import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

for (const [code, key] of [
    ["session_unavailable", "ui.app.login.error.generic"],
    ["account_archived", "ui.app.login.reason.account_archived"],
    ["account_disabled", "ui.app.login.reason.account_disabled"],
]) {
    test(`TFA completion translates ${code} through the public login client`, async () => {
        const { createTfaLoginClient } = loadTestModule(
            new URL("../ui/login-flow.js", import.meta.url),
            {
                "/static/reuse/auth-setup-route.js": {
                    redirectToRequiredTfaSetup() {},
                },
                "/static/reuse/i18n.js": { extendI18n: async (i18n) => i18n },
                "/static/reuse/page-styles.js": {
                    ensurePageStylesheet: async () => {},
                },
                "/static/reuse/toast.js": { showToast() {} },
            },
        );
        const client = await createTfaLoginClient({
            root: {},
            baseI18n: { t: (value) => `translated:${value}` },
        });
        assert.equal(client.resolveErrorMessage(code), `translated:${key}`);
    });
}
