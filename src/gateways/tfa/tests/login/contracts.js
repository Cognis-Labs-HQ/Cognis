import assert from "node:assert/strict";

export const host = { current: null };

export function createPageComposer(root, options) {
    const composer = {
        async init() {
            root.innerHTML = options.elements
                .map((element) => element.render())
                .join("");
            for (const element of options.elements) await element.onRender?.();
        },
    };
    host.current.render = () => composer.init();
    return composer;
}

export function beginPageLoading() {
    host.current.loading++;
    let active = true;
    return () => {
        if (active) host.current.loading--;
        active = false;
    };
}

export async function mountWhenDirect(mount) {
    host.current.mount = mount;
}

export function showToast(text, options) {
    host.current.notices.push({ text, options });
    return () => {};
}

export async function loadAuthFooterPlugins() {
    host.current.footerLoads++;
}

export function renderAuthFooter() {
    return '<footer data-fixture="auth-footer"></footer>';
}

export function mountAuthFooter(root) {
    assert.ok(root.querySelector('[data-fixture="auth-footer"]'));
}

export async function loadAuthTypingSamples() {
    return [];
}

export function runTypingShowcase(samples) {
    assert.deepEqual(samples, []);
}

export async function openPopup() {
    assert.fail("Unexpected popup in login resend scenario");
}

export function reportClientError(error) {
    host.current.errors.push(error);
}

export function capturePwaInstallPrompt() {
    host.current.pwaCalls.push("capture");
}

export function registerServiceWorker() {
    host.current.pwaCalls.push("register");
}

export function apiFetch(path, options) {
    return host.current.fetch(path, options);
}

export function requestTargetsApi(path) {
    return path.startsWith("/api/");
}

export function redirectToRequiredTfaSetup() {
    assert.fail("Unexpected setup redirect in login resend scenario");
}
