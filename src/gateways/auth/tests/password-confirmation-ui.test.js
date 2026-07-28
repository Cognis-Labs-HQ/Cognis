import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordConfirmationGuard } from "../ui/reuse/password-confirmation-guard.js";

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
    const guard = createPasswordConfirmationGuard({
        i18n: createI18nStub(),
        async confirmPasswordImpl(password) {
            apiCalls.push(password);
            return true;
        },
        escapeHtmlImpl: String,
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
    assert.equal(apiCalls[0], undefined);
});

test("reprompt guard opens popup when silent verification is stale", async () => {
    let popupOpened = false;
    const apiCalls = [];
    const guard = createPasswordConfirmationGuard({
        i18n: createI18nStub(),
        async confirmPasswordImpl(password) {
            apiCalls.push(password);
            return false;
        },
        escapeHtmlImpl: String,
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
