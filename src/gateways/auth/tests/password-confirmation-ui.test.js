import test from "node:test";
import assert from "node:assert/strict";
import { createPasswordConfirmationGuard } from "../ui/reuse/password-confirmation-guard.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const loginSource = readFileSync(resolve("src/ui/app/login/index.js"), "utf8");

test("login persists the authenticated identity before running account setup flows", () => {
    assert.match(
        loginSource,
        /async function finalizeAuthenticatedSession\(data, password = ""\) \{\s*persistSession\(data\);\s*await uiCtx\.runFlow\("complete-login", \{\s*accountPassword: password,\s*\}\);/,
    );
    assert.doesNotMatch(loginSource, /unlockKeyring/);
});

test("login retains the password until TFA authentication unlocks the keyring", () => {
    assert.match(loginSource, /pendingKeyringPassword = password;/);
    assert.match(
        loginSource,
        /finalizeAuthenticatedSession\(\s*tfaBody\.data,\s*pendingKeyringPassword,\s*\)/,
    );
    assert.match(
        loginSource,
        /persistSession\(data\);\s*await uiCtx\.runFlow\("complete-login", \{\s*accountPassword: password,\s*\}\);\s*tfaLoginClient\.handleSetupRequired/,
    );
});

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

test("password request returns the provider-confirmed password", async () => {
    const guard = createPasswordConfirmationGuard({
        i18n: createI18nStub(),
        async confirmPasswordImpl(password) {
            return password === "directory-password";
        },
        escapeHtmlImpl: String,
        async openPopupImpl(options) {
            const input = {
                value: "directory-password",
                focus() {},
                select() {},
            };
            const warning = { textContent: "", hidden: true };
            options.onOpen({
                querySelector(selector) {
                    if (selector === "#reprompt-password") return input;
                    if (selector === "#reprompt-warning") return warning;
                    return { addEventListener() {} };
                },
            });
            assert.equal(await options.onAction("confirm"), true);
            return "confirm";
        },
    });
    const OriginalInput = globalThis.HTMLInputElement;
    const OriginalElement = globalThis.HTMLElement;
    globalThis.HTMLInputElement = Object;
    globalThis.HTMLElement = Object;
    try {
        assert.deepEqual(
            await guard.requestPasswordConfirmation({ alwaysPrompt: true }),
            { password: "directory-password" },
        );
    } finally {
        globalThis.HTMLInputElement = OriginalInput;
        globalThis.HTMLElement = OriginalElement;
    }
});
