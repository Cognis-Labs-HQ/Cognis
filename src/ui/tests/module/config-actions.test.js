import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

async function popupFixture(runActions, request) {
    const inputs = new Map();
    const children = [];
    const revoked = [];
    const failures = [];
    let paused = 0;
    const form = {
        elements: { namedItem: (name) => inputs.get(name) },
        querySelector: (selector) =>
            children.find((child) =>
                selector.startsWith("#")
                    ? child.id === selector.slice(1)
                    : child.tagName === "audio",
            ),
        append: (child) => children.push(child),
    };
    const overlay = { querySelector: () => form };
    const context = {
        AbortController,
        escapeHtml: String,
        renderInfoTooltip() {},
        loadModuleConfig: async () => ({ apiKeyConfigured: true, voiceId: "" }),
        extendI18n: async () => ({ t: (key) => key }),
        createFormBuilder: (_dependencies, options) => {
            for (const field of options.fields)
                inputs.set(field.name, {
                    value: field.value,
                    setAttribute() {},
                    focus() {},
                });
            return {
                render: () => "",
                attach: () => ({ validateAll: () => true, detach() {} }),
            };
        },
        document: {
            createElement: (tagName) => ({
                tagName,
                dataset: {},
                replaceChildren(...options) {
                    this.options = options;
                },
                play: async () => {},
                pause: () => paused++,
            }),
        },
        URL: {
            createObjectURL: () => "blob:test",
            revokeObjectURL: (url) => revoked.push(url),
        },
        runModuleConfigAction: request,
        showToast: (message) => failures.push(message),
        reportClientError() {},
        openPopup: async (options) => {
            options.onOpen(overlay);
            await runActions(options, overlay, inputs);
            return "cancel";
        },
    };
    vm.createContext(context);
    Object.assign(
        context,
        loadTestModule(
            new URL("../../app/modules/preferences.js", import.meta.url),
            {
                "../../reuse/toast.js": context,
                "../../reuse/error-reporting.js": context,
                "../../reuse/escape-html.js": context,
                "../../reuse/popup.js": context,
                "../../reuse/info-tooltip.js": context,
                "../../reuse/form-builder.js": context,
                "../../reuse/i18n.js": context,
                "./api.js": context,
            },
            context,
        ),
    );
    await context.openModulePreferences(
        {
            id: "speech",
            ui: {
                preferences: [
                    { key: "apiKey", type: "password", labelKey: "key" },
                    { key: "voiceId", type: "string", labelKey: "voice" },
                ],
                configActions: [
                    {
                        id: "voices",
                        result: "options",
                        fieldKey: "voiceId",
                        labelKey: "discover",
                    },
                    { id: "test", result: "audio", labelKey: "test" },
                ],
            },
        },
        { i18n: { t: (key) => key } },
    );
    return { inputs, children, revoked, failures, paused };
}

test("discovery selects a default while keeping manual entry available after failure", async () => {
    let calls = 0;
    const result = await popupFixture(
        async (popup, overlay, inputs) => {
            await popup.onAction("config:voices", overlay);
            assert.equal(inputs.get("voiceId").value, "discovered");
            inputs.get("voiceId").value = "manual";
            await popup.onAction("config:voices", overlay);
            assert.equal(inputs.get("voiceId").value, "manual");
        },
        async (_id, _action, values) => {
            assert.equal(values.apiKey, "");
            if (++calls === 2) throw new Error("discovery_denied");
            return { options: [{ value: "discovered", label: "Voice" }] };
        },
    );
    assert.equal(result.failures.length, 1);
});

test("test previews cancel scoped requests and release playback URLs on close", async () => {
    let signal;
    const result = await popupFixture(
        async (popup, overlay) => {
            await popup.onAction("config:test", overlay);
        },
        async (_id, _action, _values, requestSignal) => {
            signal = requestSignal;
            return {};
        },
    );
    assert.equal(signal.aborted, true);
    assert.deepEqual(result.revoked, ["blob:test"]);
    assert.equal(result.paused, 1);
});
