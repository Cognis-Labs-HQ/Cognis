import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const FLOW_REGISTRY_PATH = resolve(ROOT, "src/ui/reuse/flow-registry.js");
const CATALOG_PATH = resolve(ROOT, "src/ui/reuse/page-flow-catalog.js");
const AUTH_HOOKS_PATH = resolve(
    ROOT,
    "src/gateways/auth/ui/session-flow-hooks.js",
);
const SHARE_HOOKS_PATH = resolve(
    ROOT,
    "src/gateways/share/ui/session-flow-hooks.js",
);

test("flow-registry.js declares authenticate-session with the required stages", () => {
    const src = readFileSync(FLOW_REGISTRY_PATH, "utf8");
    assert.match(
        src,
        /registerFlow\(["']authenticate-session["']/,
        "flow-registry.js must register the authenticate-session flow",
    );
    assert.match(
        src,
        /validate-stored-token/,
        "authenticate-session must include validate-stored-token stage",
    );
    assert.match(
        src,
        /apply-alternate-auth/,
        "authenticate-session must include apply-alternate-auth stage",
    );
    assert.match(
        src,
        /enforce-setup-requirements/,
        "authenticate-session must include enforce-setup-requirements stage",
    );
    assert.match(
        src,
        /resolve-session/,
        "authenticate-session must include resolve-session stage",
    );
});

test("flow-registry.js declares navigate-to with the required stages", () => {
    const src = readFileSync(FLOW_REGISTRY_PATH, "utf8");
    assert.match(
        src,
        /registerFlow\(["']navigate-to["']/,
        "flow-registry.js must register the navigate-to flow",
    );
    assert.match(
        src,
        /resolve-route/,
        "navigate-to must include resolve-route stage",
    );
    assert.match(
        src,
        /prepare-assets/,
        "navigate-to must include prepare-assets stage",
    );
    assert.match(
        src,
        /mount-page/,
        "navigate-to must include mount-page stage",
    );
});

test("flow-registry.js declares load-page with the required stages", () => {
    const src = readFileSync(FLOW_REGISTRY_PATH, "utf8");
    assert.match(
        src,
        /registerFlow\(["']load-page["']/,
        "flow-registry.js must register the load-page flow",
    );
    assert.match(
        src,
        /authenticate/,
        "load-page must include authenticate stage",
    );
    assert.match(src, /mount-page/, "load-page must include mount-page stage");
});

test("flow-registry.js declares the post-login account setup flow", () => {
    const src = readFileSync(FLOW_REGISTRY_PATH, "utf8");
    assert.match(
        src,
        /uiCtx\.registerFlow\("complete-login", \["setup-account-services"\]\)/,
    );
});

test("flow-registry.js declares search with component and settings index stages", () => {
    const src = readFileSync(FLOW_REGISTRY_PATH, "utf8");
    assert.match(src, /registerFlow\(["']search["']/);
    assert.match(src, /visible-indexes/);
    assert.match(src, /component-indexes/);
    assert.match(src, /settings-index/);
});

test("page-flow-catalog.js imports flow-registry.js to delegate flow registration", () => {
    const src = readFileSync(CATALOG_PATH, "utf8");
    assert.match(
        src,
        /import ["']\.\/flow-registry\.js["']/,
        "page-flow-catalog.js must import flow-registry.js to ensure flows are registered before hook files run",
    );
    assert.doesNotMatch(
        src,
        /registerFlow\(/,
        "page-flow-catalog.js must not register flows itself — that belongs in flow-registry.js",
    );
});

test("page-flow-catalog.js imports the auth gateway session-flow-hooks", () => {
    const src = readFileSync(CATALOG_PATH, "utf8");
    assert.match(
        src,
        /import ["']\/static\/gateways\/auth\/session-flow-hooks\.js["']/,
        "page-flow-catalog.js must import auth session-flow-hooks.js to register its stage handlers",
    );
});

test("auth session-flow-hooks.js imports flow-registry.js before extending flows", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /import ["']\/static\/reuse\/flow-registry\.js["']/,
        "auth session-flow-hooks.js must import flow-registry.js so flows are registered before extendFlow is called, regardless of load order",
    );
    const registryImportIdx = src.indexOf("flow-registry.js");
    const firstExtendIdx = src.indexOf("extendFlow(");
    assert.ok(
        registryImportIdx < firstExtendIdx,
        "flow-registry.js import must appear before the first extendFlow() call in auth session-flow-hooks.js",
    );
});

test("auth session bootstrap loads the required keyring before page authentication", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/auth/ui/session-flow-hooks.js"),
        "utf8",
    );
    assert.match(source, /\/static\/adapters\/auth\/keyring\/keyring\.js/);
    assert.ok(
        source.indexOf("/static/adapters/auth/keyring/keyring.js") <
            source.indexOf("uiCtx.extendFlow"),
    );
});

test("auth session-flow-hooks.js registers a validate-stored-token hook", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /extendFlow\(\s*["']authenticate-session["'],\s*["']validate-stored-token["']/,
        "auth session-flow-hooks.js must register a validate-stored-token hook on authenticate-session",
    );
});

test("auth session-flow-hooks.js registers an enforce-setup-requirements hook", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /extendFlow\(\s*["']authenticate-session["'],\s*["']enforce-setup-requirements["']/,
        "auth session-flow-hooks.js must register an enforce-setup-requirements hook",
    );
});

test("auth session-flow-hooks.js registers a resolve-session hook", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /extendFlow\(\s*["']authenticate-session["'],\s*["']resolve-session["']/,
        "auth session-flow-hooks.js must register a resolve-session hook",
    );
});

test("auth session result preserves an alternate share failure reason", () => {
    const source = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(source, /failureReason: alternateResult\.reason \?\? null/);
});

test("auth session-flow-hooks.js registers load-page hooks for authenticate and mount-page", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /extendFlow\(\s*["']load-page["'],\s*["']authenticate["']/,
        "auth session-flow-hooks.js must register a load-page authenticate hook",
    );
    assert.match(
        src,
        /extendFlow\(\s*["']load-page["'],\s*["']mount-page["']/,
        "auth session-flow-hooks.js must register a load-page mount-page hook",
    );
});

test("auth session-flow-hooks.js redirects to /settings#security when TFA setup is required", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /\/settings#security/,
        "auth session-flow-hooks.js must redirect users who require TFA setup to /settings#security",
    );
});

test("auth session-flow-hooks.js exports invalidateAuthSetupCache", () => {
    const src = readFileSync(AUTH_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /export function invalidateAuthSetupCache\(/,
        "auth session-flow-hooks.js must export invalidateAuthSetupCache for use after settings changes",
    );
});

test("share session-flow-hooks.js imports page-flow-catalog.js to ensure flows are pre-registered", () => {
    const src = readFileSync(SHARE_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /import ["']\/static\/reuse\/page-flow-catalog\.js["']/,
        "share session-flow-hooks.js must import page-flow-catalog.js to guarantee flow registration before its hooks run",
    );
});

test("share session-flow-hooks.js registers an apply-alternate-auth hook on authenticate-session", () => {
    const src = readFileSync(SHARE_HOOKS_PATH, "utf8");
    assert.match(
        src,
        /extendFlow\(\s*["']authenticate-session["'],\s*["']apply-alternate-auth["']/,
        "share session-flow-hooks.js must register an apply-alternate-auth hook on authenticate-session",
    );
});

test("share session-flow-hooks.js defaults guest share chrome to hidden", () => {
    const src = readFileSync(SHARE_HOOKS_PATH, "utf8");
    assert.match(src, /SHARE_GUEST_PAGE_DEFAULTS[\s\S]*showNavbar:\s*false/);
    assert.match(
        src,
        /SHARE_GUEST_PAGE_DEFAULTS[\s\S]*showShareControls:\s*false/,
    );
    assert.match(
        src,
        /page:\s*\{[\s\S]*\.\.\.SHARE_GUEST_PAGE_DEFAULTS[\s\S]*\.\.\.\(shareData\.page \?\? \{\}\)/,
    );
});

test("page actions can defer popup work until mounting has completed", () => {
    const registrySource = readFileSync(
        resolve(ROOT, "src/ui/reuse/flow-registry.js"),
        "utf8",
    );
    assert.match(registrySource, /registerFlow\("defer-page-action"/);
    assert.match(registrySource, /setTimeout\(\(\) => void action\(\), 0\)/);
});
