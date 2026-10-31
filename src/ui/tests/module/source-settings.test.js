import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture({ refreshFails = false, abortDuringRead = false } = {}) {
    const owner = new AbortController();
    const source = {
        uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
        name: "Shared",
        provider: "github",
        namespace: "review",
        baseUrl: "https://api.github.com",
        scanPrivateRepos: true,
        credentialConfigured: true,
    };
    const notices = [];
    const writes = [];
    const forms = [];
    let reads = 0;
    let popupCount = 0;
    const edit = {
        dataset: { editSource: source.uuid },
        addEventListener(_type, handler) {
            this.click = handler;
        },
    };
    const form = {
        elements: {
            scanPrivateRepos: { checked: true },
            clearCredential: { checked: false },
        },
    };
    const overlay = {
        querySelector: (selector) => (selector.startsWith("#") ? form : null),
        querySelectorAll: (selector) =>
            selector === "[data-edit-source]" ? [edit] : [],
    };
    const { openMarketplaceSettings } = loadTestModule(
        new URL("../../app/modules/source-settings.js", import.meta.url),
        {
            "../../reuse/form-builder.js": {
                createFormBuilder: (_ctx, schema) => {
                    forms.push(schema);
                    return {
                        render: () => "<form></form>",
                        attach: () => ({
                            detach() {},
                            validateAll: () => true,
                            setFieldRequired() {},
                        }),
                    };
                },
            },
            "../../reuse/escape-html.js": { escapeHtml: String },
            "../../reuse/info-tooltip.js": { renderInfoTooltip: () => "" },
            "../../reuse/toast.js": {
                showToast: (message, options) =>
                    notices.push({ message, ...options }),
            },
            "../../reuse/popup.js": {
                openPopup: async (options) => {
                    popupCount++;
                    assert.equal(options.signal, owner.signal);
                    const api = {
                        pageId: "settings",
                        setPage(id) {
                            api.pageId = id;
                            options.pages.find((page) => page.id === id).body();
                            options.onOpen(overlay, () => {}, api);
                        },
                    };
                    api.setPage("settings");
                    edit.click();
                    assert.equal(
                        await options.onAction("save", overlay, api),
                        false,
                    );
                },
            },
            "./api.js": {
                loadModuleSources: async () => {
                    if (abortDuringRead) owner.abort();
                    if (++reads > 1 && refreshFails)
                        throw new Error("read_failed");
                    return [source];
                },
                loadModuleMarketplaceSettings: async () => ({
                    recommendedModulesUrl: "https://example.test/list",
                }),
                saveModuleSource: async (data) => {
                    writes.push(data);
                    return { ...source, revision: "saved" };
                },
                removeModuleSource: () => assert.fail("unexpected removal"),
                saveModuleMarketplaceSettings: () =>
                    assert.fail("unexpected settings save"),
            },
        },
        {
            crypto,
            FormData: class {
                *[Symbol.iterator]() {
                    yield* Object.entries({
                        name: source.name,
                        provider: source.provider,
                        namespace: source.namespace,
                        baseUrl: source.baseUrl,
                        token: "",
                    });
                }
            },
            console: { error() {} },
        },
    );
    return {
        source,
        notices,
        writes,
        forms,
        run: () =>
            openMarketplaceSettings({ t: String }, "settings", {
                signal: owner.signal,
            }),
        popupCount: () => popupCount,
    };
}

for (const refreshFails of [false, true]) {
    test(`saving an existing shared source preserves a blank credential and acknowledges persistence (refreshFails=${refreshFails})`, async () => {
        const host = fixture({ refreshFails });
        const sources = await host.run();
        assert.equal(host.writes.length, 1);
        assert.equal(host.writes[0].token, undefined);
        assert.equal(host.writes[0].clearCredential, false);
        assert.equal(host.writes[0].scanPrivateRepos, true);
        const token = host.forms
            .find((form) => form.formId === "module-source-form")
            .fields.find((field) => field.name === "token");
        assert.equal(token.value, "");
        assert.equal(token.required, false);
        assert.equal(token.placeholder, "ui.app.modules.credential_stored");
        assert.equal(host.notices[0].message, "ui.app.modules.source_saved");
        assert.equal(host.notices[0].variant, "success");
        if (refreshFails) {
            assert.equal(sources[0].revision, "saved");
            assert.equal(
                host.notices[1].message,
                "ui.app.modules.source_refresh_failed",
            );
            assert.equal(host.notices[1].variant, "warning");
        }
    });
}

test("disposed source settings never open a credential form after delayed reads", async () => {
    const host = fixture({ abortDuringRead: true });
    await host.run();
    assert.equal(host.popupCount(), 0);
    assert.deepEqual(host.writes, []);
});
