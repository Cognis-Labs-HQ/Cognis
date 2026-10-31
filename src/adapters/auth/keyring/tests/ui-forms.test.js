import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { keyringSource, settingsSource } from "./ui-environment.js";

test("keyring password popups use the form composer with required fields", () => {
    const resourcesSource = readFileSync(
        resolve("src/adapters/auth/keyring/ui/resources.js"),
        "utf8",
    );
    assert.match(keyringSource, /createFormBuilder/);
    assert.match(keyringSource, /ensureKeyringFormStyles/);
    assert.match(resourcesSource, /styles\/reuse\/page-sections\.css/);
    assert.match(keyringSource, /formId: "keyring-unlock-form"/);
    assert.match(keyringSource, /formClassName: "keyring-password-form"/);
    assert.match(keyringSource, /name: "password"[\s\S]*required: true/);
    assert.match(keyringSource, /name: "confirmation"[\s\S]*required: true/);
    assert.match(keyringSource, /setup_password_match/);
    assert.match(keyringSource, /name: "relockMinutes"/);
    assert.match(settingsSource, /formId: "keyring-change-password-form"/);
    assert.match(settingsSource, /styles\/reuse\/page-sections\.css/);
    assert.match(settingsSource, /gateway\.auth\.keyring\.not_found/);
    assert.match(settingsSource, /id="settings-keyring-create"/);
    assert.match(settingsSource, /variant: "cancel"/);
    assert.match(settingsSource, /await initialResult[\s\S]*rerender\(\)/);
    assert.match(
        settingsSource,
        /promptToUnlock\(\)[\s\S]*rerender\(\);[\s\S]*return;/,
    );
    assert.match(
        settingsSource,
        /name: "confirmation"[\s\S]*required: true[\s\S]*keyring-password-change-match/,
    );
});

test("account password setup reuses the authenticated credential", () => {
    assert.match(keyringSource, /id: "use-account-password"/);
    assert.match(
        keyringSource,
        /result === "use-account-password"\) return accountPassword/,
    );
    assert.match(
        keyringSource,
        /id: "use-account-password"[\s\S]*?variant: "confirm"/,
    );
    assert.match(
        readFileSync(
            resolve(import.meta.dirname, "../ui/languages/en/strings.xml"),
            "utf8",
        ),
        />Use User Password</,
    );
});

test("cancelled keyring creation remains available", () => {
    assert.match(
        settingsSource,
        /#settings-keyring-create"\)\s*\?\.addEventListener\("click", async \(\) => \{\s*if \(await createKeyring\(\)\) rerender\(\);\s*\}\);/,
    );
});
