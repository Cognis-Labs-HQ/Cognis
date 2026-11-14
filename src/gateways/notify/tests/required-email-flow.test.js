import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

class Input {
    value = "";
}

function fixture({ codes, resendStatus = 200, cancel = false }) {
    const submitted = [];
    const notices = [];
    let verified = false;
    let prompts = 0;
    const module = loadTestModule(
        new URL("../ui/login-required-email-flow.js", import.meta.url),
        {
            "/static/reuse/i18n.js": {},
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "/static/reuse/format-template.js": {
                formatTemplate: (text) => text,
            },
            "/static/reuse/toast.js": {
                showToast: (message) => notices.push(message),
            },
            "/static/reuse/popup.js": {
                async openPopup(options) {
                    const markup = options.body();
                    const input = new Input();
                    const maxLength = markup.match(/maxlength="(\d+)"/);
                    const code = codes[prompts++];
                    assert.equal(typeof code, "string");
                    input.value = maxLength
                        ? code.slice(0, Number(maxLength[1]))
                        : code;
                    options.onOpen({ querySelector: () => input });
                    return cancel ? "cancel" : "confirm";
                },
            },
            "/static/reuse/api-client.js": {
                async apiFetch(url, options) {
                    if (url.endsWith("/resend")) {
                        return new Response(null, { status: resendStatus });
                    }
                    if (url.endsWith("/verify")) {
                        submitted.push(JSON.parse(options.body).code);
                        verified = submitted.length === codes.length;
                        return new Response(null, {
                            status: verified ? 204 : 422,
                        });
                    }
                    return Response.json({
                        data: [
                            {
                                email: "synthetic@example.invalid",
                                primary: true,
                                verified,
                            },
                        ],
                    });
                },
            },
        },
        { HTMLInputElement: Input },
    );
    return {
        submitted,
        notices,
        enforce: () =>
            module
                .createRequiredEmailEnforcementClient()
                .enforceRequiredEmailSetup({
                    accountId: "synthetic-account",
                    i18n: { t: (key) => `translated:${key}` },
                }),
    };
}

for (const length of [4, 6, 8, 10]) {
    test(`required email verification submits the full ${length}-digit pending code`, async () => {
        const code = "1234567890".slice(0, length);
        const client = fixture({ codes: [code] });
        await client.enforce();
        assert.deepEqual(client.submitted, [code]);
        assert.deepEqual(client.notices, []);
    });
}

test("rate-limited resend preserves a ten-digit pending verification input", async () => {
    const client = fixture({
        codes: ["0000000000", "1234567890"],
        resendStatus: 429,
    });
    await client.enforce();
    assert.deepEqual(client.submitted, ["0000000000", "1234567890"]);
    assert.deepEqual(client.notices, [
        "translated:ui.app.settings.emails_verify_invalid",
    ]);
});

test("dismissing required verification never submits a partial code", async () => {
    const client = fixture({ codes: ["1234567890"], cancel: true });
    await assert.rejects(client.enforce(), /verification_cancelled/);
    assert.deepEqual(client.submitted, []);
});
