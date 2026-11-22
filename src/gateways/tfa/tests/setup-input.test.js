import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { createSetupDismissalGuard } from "../ui/setup-dismissal.js";

class Input {
    maxLength = -1;
    value = "";
    type(value) {
        this.value =
            this.maxLength >= 0 ? value.slice(0, this.maxLength) : value;
    }
}

class Row {
    getAttribute() {
        return "synthetic-provider";
    }
}

function fixture({ maxLength, cancel = false }) {
    const row = new Row();
    const inputs = [];
    const submissions = [];
    const cancellations = [];
    const target = new EventTarget();
    const setup = {
        setupId: "synthetic-pending-setup",
        view: { fields: [{ label: "synthetic.code", maxLength }] },
    };
    const module = loadTestModule(
        new URL("../ui/settings-section.js", import.meta.url),
        {
            "./setup-dismissal.js": {
                createSetupDismissalGuard: (options) =>
                    createSetupDismissalGuard({ ...options, target }),
            },
            "/static/reuse/api-client.js": { apiFetch() {} },
            "/static/reuse/toast.js": { showToast() {} },
            "/static/reuse/escape-html.js": { escapeHtml: String },
            "/static/reuse/info-tooltip.js": { renderInfoTooltip: String },
            "/static/reuse/format-template.js": {
                formatTemplate: (text) => text,
            },
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
            "/static/gateways/tfa/security-api.js": {
                loadTfaStatus: async () => ({
                    availableMethods: [{ id: "synthetic-provider" }],
                    enabledMethods: [],
                    requiresSetup: false,
                }),
                loadRecoveryCodesStatus: async () => ({ codes: [] }),
                beginTfaSetup: async () => setup,
                verifyTfaSetup: async (_fetch, methodId, setupId, payload) => {
                    submissions.push({ methodId, setupId, code: payload.code });
                    return { ok: true };
                },
                cancelTfaSetup: async (_fetch, methodId, setupId) => {
                    cancellations.push({ methodId, setupId });
                    return true;
                },
            },
            "/static/reuse/popup.js": {
                async openPopup(options) {
                    const markup = options.body();
                    const input = new Input();
                    const renderedLength = markup.match(/maxlength="(\d+)"/);
                    if (renderedLength)
                        input.maxLength = Number(renderedLength[1]);
                    setup.view.fields[0].maxLength = 2;
                    options.onOpen(
                        { querySelector: () => input },
                        async () => true,
                        { markDirty() {} },
                    );
                    input.type("1234567890123456");
                    inputs.push(input);
                    if (cancel) return "cancel";
                    assert.equal(await options.onAction("confirm"), true);
                    return "confirm";
                },
            },
        },
        {
            HTMLInputElement: Input,
            HTMLTableRowElement: Row,
            HTMLButtonElement: class {},
        },
    );
    const section = module.createSettingsSection({
        i18n: { t: (key) => `translated:${key}` },
        root: {
            querySelector: () => null,
            querySelectorAll: (selector) =>
                selector.startsWith("#available-tfa-methods") ? [row] : [],
            addEventListener() {},
        },
    });
    return {
        inputs,
        submissions,
        cancellations,
        async activate() {
            await section.onRender();
            await row.onclick();
        },
    };
}

for (const maxLength of [4, 6, 8, 10]) {
    test(`settings enrollment keeps its issued ${maxLength}-character input constraint`, async () => {
        const client = fixture({ maxLength });
        await client.activate();
        assert.equal(client.inputs[0].maxLength, maxLength);
        assert.deepEqual(client.submissions, [
            {
                methodId: "synthetic-provider",
                setupId: "synthetic-pending-setup",
                code: "1234567890".slice(0, maxLength),
            },
        ]);
        assert.deepEqual(client.cancellations, []);
    });
}

for (const maxLength of [undefined, 0, -1, 1.5, "10"]) {
    test(`settings enrollment leaves unspecified or invalid limits to the provider (${maxLength})`, async () => {
        const client = fixture({ maxLength });
        await client.activate();
        assert.equal(client.inputs[0].value, "1234567890123456");
        assert.equal(client.submissions[0].code, "1234567890123456");
    });
}

test("dismissing constrained enrollment cancels the issued setup without verification", async () => {
    const client = fixture({ maxLength: 10, cancel: true });
    await client.activate();
    assert.deepEqual(client.submissions, []);
    assert.deepEqual(client.cancellations, [
        {
            methodId: "synthetic-provider",
            setupId: "synthetic-pending-setup",
        },
    ]);
});
