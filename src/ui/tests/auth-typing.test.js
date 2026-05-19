import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadAuthTypingSamples } from "../reuse/auth-typing.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

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

test("register page clears stored auth instead of redirecting authenticated users", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /import \{ clearStoredAuthSession \} from "\.\.\/\.\.\/reuse\/auth-session\.js";/,
    );
    assert.match(source, /clearStoredAuthSession\(\);/);
    assert.doesNotMatch(source, /redirectToDashboardIfAuthenticated/);
});

test("register page uses shared auth intro copy and class", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/register/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /<p class="auth-intro">\$\{escapeHtml\(i18n\.t\("ui\.app\.login\.hero\.subtitle"\)\)\}<\/p>/,
    );
});

test("login and register disable layout preference persistence", () => {
    const loginSource = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    const registerSource = readFileSync(
        resolve(ROOT, "src/ui/app/register/index.js"),
        "utf8",
    );

    assert.match(loginSource, /persistLayoutPreferences:\s*false/);
    assert.match(registerSource, /persistLayoutPreferences:\s*false/);
});

test("login and register include mobile auth brandline inside auth panel", () => {
    const loginSource = readFileSync(
        resolve(ROOT, "src/ui/app/login/index.js"),
        "utf8",
    );
    const registerSource = readFileSync(
        resolve(ROOT, "src/ui/app/register/index.js"),
        "utf8",
    );

    assert.match(loginSource, /auth-brandline--panel-mobile/);
    assert.match(registerSource, /auth-brandline--panel-mobile/);
});

test("register page renders invalid-token intro message instead of disabled form shell", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/register/index.js"),
        "utf8",
    );

    assert.match(
        source,
        /if \(isInvalid\) \{\s*messageHtml = renderInPageCallout\(\{\s*variant: "danger",\s*title: i18n\.t\("ui\.reuse\.error"\),\s*\}\);/m,
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
