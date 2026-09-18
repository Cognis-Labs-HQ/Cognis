import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAuthTypingSamples } from "../../../ui/reuse/auth-typing.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("loadAuthTypingSamples resolves translated keys without runtime errors", async () => {
    const originalFetch = globalThis.fetch;
    try {
        globalThis.fetch = async () => ({
            ok: true,
            async json() {
                return {
                    data: [
                        { textKey: "ui.app.login.typing.sample.1" },
                        { textKey: "ui.app.login.typing.sample.7" },
                    ],
                };
            },
        });

        const samples = await loadAuthTypingSamples({
            t(key) {
                const map = {
                    "ui.app.login.typing.sample.1": "Self-study courses",
                    "ui.app.login.typing.sample.7":
                        "Register your account today",
                };
                return map[key] ?? key;
            },
        });

        assert.ok(samples.includes("Self-study courses"));
        assert.ok(samples.includes("Register your account today"));
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test("login disables layout preference persistence", () => {
    const loginSource = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/login-page/index.js"),
        "utf8",
    );
    assert.match(loginSource, /persistLayoutPreferences:\s*false/);
});

test("login includes mobile auth brandline inside auth panel", () => {
    const loginSource = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/login-page/index.js"),
        "utf8",
    );
    assert.match(loginSource, /auth-brandline--panel-mobile/);
});

test("auth brandline links to base domain", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/auth-layout.js"),
        "utf8",
    );

    assert.match(source, /<a class="\$\{classes\}" href="\/">/);
});

test("invalid reset token view renders go-back login action", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/login-page/index.js"),
        "utf8",
    );

    assert.match(source, /id="login-link-invalid-back"/);
    assert.match(source, /ui\.app\.login\.login_link\.go_back/);
    assert.match(
        source,
        /login-link-invalid-back[\s\S]*?window\.history\.replaceState\(\{\},\s*"",\s*"\/login"\);[\s\S]*?restoreLoginForm\(\);/m,
    );
});

test("password reset action uses form submit button", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/login-page/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /id="login-link-email"[\s\S]*?<button type="submit" id="login-link-submit"/m,
    );
    assert.match(
        source,
        /id="login-link-password"[\s\S]*?<button type="submit" id="login-link-submit"/m,
    );
});

test("typing showcase keeps each full message visible for one minute before delete animation", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/auth-typing.js"),
        "utf8",
    );

    assert.match(
        source,
        /for \(\s*let charIndex = 0;[\s\S]*?window\.setTimeout\(resolve,\s*85\),[\s\S]*?window\.setTimeout\(resolve,\s*60000\),[\s\S]*?for \(\s*let charIndex = sample\.length;/m,
    );
});
