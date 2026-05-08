import test from "node:test";
import assert from "node:assert/strict";
import { createRepromptGuard } from "../reprompt.js";

function createI18nStub() {
    return {
        t(key) {
            return key;
        },
    };
}

test("reprompt guard reuses fresh verification without opening popup", async () => {
    let popupOpened = false;
    let actionRan = false;
    const apiCalls = [];
    const guard = createRepromptGuard({
        i18n: createI18nStub(),
        async apiFetchImpl(url, options) {
            apiCalls.push({ url, options });
            return { ok: true };
        },
        async openPopupImpl() {
            popupOpened = true;
            return "confirm";
        },
    });

    const result = await guard.runWithReprompt(async () => {
        actionRan = true;
    });

    assert.equal(result, true);
    assert.equal(actionRan, true);
    assert.equal(popupOpened, false);
    assert.equal(apiCalls.length, 1);
    assert.equal(apiCalls[0].url, "/api/v1/auth/verify");
    assert.equal(apiCalls[0].options.body, JSON.stringify({}));
});

test("reprompt guard opens popup when silent verification is stale", async () => {
    let popupOpened = false;
    const apiCalls = [];
    const guard = createRepromptGuard({
        i18n: createI18nStub(),
        async apiFetchImpl(url, options) {
            apiCalls.push({ url, options });
            return { ok: false };
        },
        async openPopupImpl() {
            popupOpened = true;
            return "cancel";
        },
    });

    const result = await guard.runWithReprompt(async () => {});

    assert.equal(result, false);
    assert.equal(popupOpened, true);
    assert.equal(apiCalls.length, 1);
});
