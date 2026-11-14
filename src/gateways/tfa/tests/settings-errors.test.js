import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createSetupDismissalGuard } from "../ui/setup-dismissal.js";
import * as securityApi from "../ui/security-api.js";

const translations = new Set(
    [
        ...readFileSync(
            new URL("../../../ui/languages/en/strings.xml", import.meta.url),
            "utf8",
        ).matchAll(/name="([^"]+)"/g),
        ...readFileSync(
            new URL("../ui/languages/en/strings.xml", import.meta.url),
            "utf8",
        ).matchAll(/name="([^"]+)"/g),
    ].map((match) => match[1]),
);

class Row {
    getAttribute() {
        return "totp";
    }
}

class Input {
    value = "123456";
}

function fixture(error, operation) {
    const notices = [];
    const requestedKeys = [];
    const row = new Row();
    const target = new EventTarget();
    const i18n = {
        t(key) {
            requestedKeys.push(key);
            if (!translations.has(key))
                throw new Error(`missing_translation:${key}`);
            return `translated:${key}`;
        },
    };
    const apiFetch = async (path) => {
        if (path === "/api/v1/tfa/methods")
            return Response.json({
                data: {
                    availableMethods: [{ id: "totp" }],
                    enabledMethods: [],
                    requiresSetup: false,
                },
            });
        if (path === "/api/v1/tfa/recovery-codes")
            return Response.json({ data: { codes: [] } });
        if (path.endsWith("/setup/cancel"))
            return Response.json({ data: { cancelled: true } });
        if (operation === "verify" && path.endsWith("/setup/begin"))
            return Response.json({
                data: {
                    setupId: "synthetic-pending-setup",
                    view: {},
                },
            });
        assert.equal(path, `/api/v1/tfa/methods/totp/setup/${operation}`);
        return Response.json({ error }, { status: 503 });
    };
    const { createSettingsSection } = loadTestModule(
        new URL("../ui/settings-section.js", import.meta.url),
        {
            "./setup-dismissal.js": {
                createSetupDismissalGuard: (options) =>
                    createSetupDismissalGuard({ ...options, target }),
            },
            "/static/reuse/api-client.js": { apiFetch },
            "/static/reuse/toast.js": {
                showToast: (message, options) =>
                    notices.push({ message, ...options }),
            },
            "/static/reuse/popup.js": {
                async openPopup(options) {
                    assert.equal(operation, "verify");
                    options.onOpen(
                        { querySelector: () => new Input() },
                        async () => true,
                        { markDirty() {} },
                    );
                    assert.equal(await options.onAction("confirm"), false);
                    return "cancel";
                },
            },
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "/static/reuse/info-tooltip.js": { renderInfoTooltip: String },
            "/static/reuse/format-template.js": { formatTemplate: String },
            "/static/reuse/qr-image-source.js": {
                createQrImageSource: () => ({ src: "", revoke() {} }),
            },
            "/static/gateways/auth/reuse/password-confirmation.js": {
                createRepromptGuard: () => ({}),
            },
            "/static/reuse/secret-visibility-toggle.js": {
                bindSecretVisibilityToggles() {},
                renderSecretVisibilityField: () => "",
            },
            "/static/reuse/page-styles.js": {
                ensurePageStylesheet: async () => {},
            },
            "/static/gateways/tfa/security-api.js": securityApi,
        },
        {
            HTMLTableRowElement: Row,
            HTMLButtonElement: class {},
            HTMLInputElement: Input,
        },
    );
    const section = createSettingsSection({
        i18n,
        root: {
            querySelector: () => null,
            querySelectorAll: (selector) =>
                selector.startsWith("#available-tfa-methods") ? [row] : [],
            addEventListener() {},
        },
    });
    return {
        notices,
        requestedKeys,
        async activate() {
            await section.onRender();
            await row.onclick();
        },
    };
}

for (const operation of ["begin", "verify"]) {
    for (const code of [
        "account_policy_unavailable",
        "bad_request",
        "unrecognized_provider_error",
        "ui.unknown.translation",
        "constructor",
    ]) {
        for (const field of ["code", "message"]) {
            test(`TFA ${operation} displays a localized failure for ${field} ${code}`, async () => {
                const host = fixture({ [field]: code }, operation);
                await assert.doesNotReject(host.activate());
                assert.deepEqual(host.notices, [
                    {
                        message: "translated:gateway.tfa.settings.setup_failed",
                        variant: "error",
                    },
                ]);
                assert.equal(host.requestedKeys.includes(code), false);
            });
        }
    }
}

for (const [code, key, variant] of [
    ["invalid_verification_code", "ui.app.login.tfa.error_invalid", "error"],
    [
        "email_delivery_unavailable",
        "ui.app.settings.emails_verify_unavailable",
        "error",
    ],
    [
        "primary_email_required",
        "ui.app.settings.notif_email_required_body",
        "warning",
    ],
]) {
    test(`TFA setup retains the known localized ${code} message`, async () => {
        const host = fixture({ code }, "begin");
        await host.activate();
        assert.deepEqual(host.notices, [
            { message: `translated:${key}`, variant },
        ]);
    });
}
