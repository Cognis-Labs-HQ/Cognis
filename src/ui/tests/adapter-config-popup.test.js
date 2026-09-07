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
        await popup.openAdapterConfig("Adapter", { configUrl: "/config" }),
        false,
    );
    assert.equal(popupOpened, false);
});
