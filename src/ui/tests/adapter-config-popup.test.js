import assert from "node:assert/strict";
import test from "node:test";

import {
    adapterConfigHasFields,
    createAdapterConfigPopup,
} from "../app/administration/adapter-config-popup.js";

test("adapter config popup recognizes configurable fields", () => {
    assert.equal(
        adapterConfigHasFields({
            data: { host: "smtp.example.com" },
            schema: [],
        }),
        true,
    );
    assert.equal(
        adapterConfigHasFields({
            data: {},
            schema: [{ key: "host" }],
        }),
        true,
    );
});

test("adapter config popup ignores empty and power-only contracts", () => {
    assert.equal(adapterConfigHasFields({ data: {}, schema: [] }), false);
    assert.equal(
        adapterConfigHasFields({
            data: { enabled: true },
            envValues: {},
            requiredFields: ["enabled"],
            schema: [{ key: "enabled" }],
        }),
        false,
    );
});

test("adapter config opener reports when an adapter has no settings popup", async () => {
    let popupOpened = false;
    const popup = createAdapterConfigPopup({
        i18n: { t: (key) => key },
        escapeHtml: String,
        apiFetch: async () => ({
            ok: true,
            json: async () => ({ data: {}, schema: [] }),
        }),
        openPopup: async () => {
            popupOpened = true;
        },
        showToast: () => {},
    });

    assert.equal(
        await popup.openAdapterConfig("Adapter", {
            configUrl: "/config",
            gatewayId: "auth",
            adapterId: "example",
        }),
        false,
    );
    assert.equal(popupOpened, false);
});

for (const englishAvailable of [true, false]) {
    test(`adapter configuration resolves provider labels with English availability ${englishAvailable}`, async () => {
        const { readFile } = await import("node:fs/promises");
        const { installI18nEnvironment } =
            await import("../reuse/tests/fixtures/i18n-environment.js");
        const { createI18n } = await import("../reuse/i18n.js");
        const baseUrl = `/provider-labels/${englishAvailable}`;
        installI18nEnvironment(async (path) => {
            if (path.startsWith("/static/languages/")) {
                const locale = path.split("/")[3];
                return new Response(
                    await readFile(
                        new URL(
                            `../languages/${locale}/strings.xml`,
                            import.meta.url,
                        ),
                        "utf8",
                    ),
                );
            }
            return new Response(
                path.includes("/en/") && englishAvailable
                    ? '<resources><string name="example.adapter.label">Provider Field</string><string name="example.adapter.choice">Provider Choice</string></resources>'
                    : '<resources><string name="example.adapter.label"> </string></resources>',
            );
        });
        const i18n = await createI18n({
            preferredLanguages: ["de"],
            persistLocale: false,
        });
        let opened = false;
        const popup = createAdapterConfigPopup({
            i18n,
            escapeHtml: String,
            apiFetch: async () =>
                Response.json({
                    data: {},
                    schema: [
                        {
                            key: "level",
                            label: "example.adapter.label",
                            type: "select",
                            options: [
                                {
                                    value: "info",
                                    labelKey: "example.adapter.choice",
                                },
                            ],
                        },
                    ],
                    testSchema: [
                        {
                            key: "recipient",
                            label: "example.adapter.label",
                            type: "email",
                        },
                    ],
                    stringsBaseUrl: baseUrl,
                    supportsTest: true,
                }),
            openPopup: async ({ body }) => {
                opened = true;
                assert.match(body, /Provider Field/);
                assert.match(body, /Provider Choice/);
                assert.match(body, /data-provider-test-field/);
            },
            showToast: () =>
                assert.fail("A valid configuration must open without a toast."),
        });
        const result = popup.openAdapterConfig("Provider", {
            configUrl: "/config",
            gatewayId: "auth",
            adapterId: "example",
        });
        if (englishAvailable) {
            assert.equal(await result, true);
            assert.equal(opened, true);
        } else {
            await assert.rejects(result, {
                code: "missing_translation",
                key: "example.adapter.label",
            });
            assert.equal(opened, false);
        }
    });
}
