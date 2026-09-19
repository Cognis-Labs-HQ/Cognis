import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { parseAuthLoginButton } from "../login-button.js";

test("login button icons must remain same-origin paths", () => {
    const descriptor = {
        providerId: "provider",
        label: "Continue with Provider",
        iconUrl: "/static/modules/provider/icon.svg",
    };

    assert.deepEqual(parseAuthLoginButton(descriptor), descriptor);
    assert.equal(
        parseAuthLoginButton({
            ...descriptor,
            iconUrl: "/\\attacker.example/icon.svg",
        }),
        null,
    );
    assert.equal(
        parseAuthLoginButton({
            ...descriptor,
            iconUrl: "//attacker.example/icon.svg",
        }),
        null,
    );
});

test("login button capability rejects duplicate provider presentation", async () => {
    const source = await readFile(
        new URL("../bootstrap/login-button-capability.ts", import.meta.url),
        "utf8",
    );

    assert.match(source, /buttons\.has\(button\.providerId\)/);
    assert.match(source, /auth_login_button_already_registered/);
    assert.match(source, /buttons\.get\(button\.providerId\) !== button/);
});
