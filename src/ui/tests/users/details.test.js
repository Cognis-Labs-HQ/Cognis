import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { uiCtx } from "../../reuse/ui-ctx.js";
import { getRoleLabel } from "../../reuse/access-role.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { formatDateTime } from "../../reuse/timestamp.js";

test("account details execute registered stages, escape email/provider values, reject non-admins and clean up", async () => {
    let admin = true;
    let calls = 0;
    const controller = new AbortController();
    const { createUserDetailsReader } = loadTestModule(
        new URL("../../app/users/details.js", import.meta.url),
        {
            "../../reuse/ui-ctx.js": { uiCtx },
            "../../reuse/api-client.js": {
                apiFetch: async () => {
                    calls++;
                    return Response.json({
                        data: {
                            username: "x:person",
                            provider: "<provider>",
                            createdAt: "2026-10-25T00:00:00Z",
                            lastLogin: null,
                            enabled: true,
                        },
                    });
                },
            },
            "../../reuse/access-role.js": {
                getRoleLabel,
                isAdminScope: () => admin,
            },
            "../../reuse/escape-html.js": { escapeHtml },
            "../../reuse/timestamp.js": { formatDateTime },
            "/static/gateways/notify/email-client.js": {
                loadUserEmails: async () => [
                    {
                        email: "<private>@example.com",
                        verified: false,
                        primary: true,
                    },
                ],
            },
        },
    );
    const reader = createUserDetailsReader({
        i18n: { t: (key) => key },
        signal: controller.signal,
    });
    const html = await reader({ username: "x:person" });
    assert.match(html, /&lt;provider&gt;/);
    assert.match(html, /&lt;private&gt;@example.com/);
    assert.match(html, /emails_unverified/);
    assert.match(html, /member_since/);
    assert.equal(calls, 1);
    admin = false;
    await assert.rejects(reader({ username: "x:person" }), /admin_required/);
    assert.equal(calls, 1);
    controller.abort();
    await assert.rejects(reader({ username: "x:person" }), {
        name: "AbortError",
    });
    const flow = await uiCtx.runFlow("users:readDetails", {
        user: { username: "x:person" },
    });
    assert.equal(flow.stageResults.present.length, 0);
});
