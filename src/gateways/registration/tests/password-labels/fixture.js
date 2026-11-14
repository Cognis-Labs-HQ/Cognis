import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const sourceRoot = new URL("../../../../", import.meta.url);
const registrationRoot = new URL("gateways/registration/ui/", sourceRoot);
const sharedRoot = new URL("ui/reuse/", sourceRoot);
const policy = {
    minLength: 10,
    requireUppercase: 1,
    requireLowercase: 1,
    requireDigit: 1,
    requireSpecial: 1,
};
const sharedModules = new Set([
    "form-builder.js",
    "secret-visibility-toggle.js",
    "escape-html.js",
    "i18n.js",
    "ui-language-state.js",
    "in-page-callout.js",
]);

export async function registrationFixture({ locale = "en", edits = [] } = {}) {
    const dom = new JSDOM('<main id="app"></main>', {
        url: "https://registration.test/register",
        runScripts: "outside-only",
    });
    const { window } = dom;
    const root = window.document.querySelector("#app");
    const requests = [];
    const calls = [];
    window.localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify([locale, "en"]),
    );
    window.localStorage.setItem("cognis_language_priority_mode", "manual");
    const unexpected = (operation) => {
        calls.push(operation);
        throw new Error(`Unexpected external action: ${operation}`);
    };
    const fetchFixture = async (url, options = {}) => {
        requests.push({ url, method: options.method ?? "GET" });
        const bundles = {
            "/static/languages/": "ui/languages/",
            "/static/gateways/auth/languages/": "gateways/auth/ui/languages/",
            "/static/gateways/registration/languages/":
                "gateways/registration/ui/languages/",
        };
        for (const [prefix, directory] of Object.entries(bundles)) {
            if (!url.startsWith(prefix)) continue;
            assert.equal(options.method ?? "GET", "GET");
            const suffix = url.slice(prefix.length);
            assert.match(suffix, /^(en|de|id|ja)\/strings\.xml$/);
            const document = new window.DOMParser().parseFromString(
                readFileSync(new URL(directory + suffix, sourceRoot), "utf8"),
                "application/xml",
            );
            for (const edit of edits) {
                if (url !== `/static/languages/${edit.locale}/strings.xml`)
                    continue;
                const entry = [...document.querySelectorAll("string")].find(
                    (node) => node.getAttribute("name") === edit.key,
                );
                assert.ok(entry, `XML fixture must contain ${edit.key}`);
                if (edit.value === null) entry.remove();
                else entry.textContent = edit.value;
            }
            return new Response(
                new window.XMLSerializer().serializeToString(document),
            );
        }
        if (url === "/api/v1/auth/logout" && options.method === "POST")
            return new Response(null, { status: 204 });
        if (url === "/api/v1/auth/password-policy")
            return Response.json({ data: policy });
        if (url === "/api/v1/system/languages")
            return Response.json({ data: [{ key: locale, name: locale }] });
        return unexpected(`fetch:${url}`);
    };
    Object.assign(window, { fetch: fetchFixture });
    const fakeExports = {
        "/static/reuse/page-composer/index.js": {
            createPageComposer: (target, options) => ({
                async init() {
                    assert.equal(target, root);
                    for (const element of options.elements) {
                        target.innerHTML = await element.render();
                        await element.onRender();
                    }
                },
            }),
        },
        "/static/reuse/page-entry.js": { mountWhenDirect: async () => {} },
        "/static/reuse/auth-footer.js": {
            loadAuthFooterPlugins: async () => [],
            mountAuthFooter: () => {},
            renderAuthFooter: () => "",
        },
        "/static/reuse/auth-typing.js": {
            loadAuthTypingSamples: async () => [],
            runTypingShowcase: () => {},
        },
        "/static/reuse/auth-layout.js": {
            renderAuthBrandline: () => "",
            renderAuthLayout: ({ formPanelHtml }) => formPanelHtml,
        },
        "/static/reuse/auth-session.js": {
            clearStoredAuthSession() {
                window.localStorage.removeItem("cognis_access_token");
                window.localStorage.removeItem("cognis_account");
            },
        },
        "/static/reuse/api-client.js": {
            requestTargetsApi: (url) => url.startsWith("/api/"),
            apiFetch: fetchFixture,
        },
        "/static/reuse/toast.js": { showToast: () => unexpected("toast") },
        "/static/reuse/popup.js": { openPopup: () => unexpected("popup") },
        "/static/gateways/auth/onboarding-client.js": {
            createOnboardingClient: () => unexpected("onboarding"),
            registerPublicAccount: () => unexpected("register"),
        },
        "/static/gateways/auth/login-client.js": {
            getPendingAccountCreation: async () => null,
            loadRegistrationConfig: async () => ({
                registrationsEnabled: true,
                requiredFields: [],
                integrations: [],
            }),
        },
        "/static/gateways/auth/countdown.js": {
            formatCountdownClock: () => unexpected("countdown"),
        },
        "/static/gateways/auth/password-policy.js": {
            DEFAULT_PASSWORD_POLICY: policy,
            normalizePasswordPolicy: (value) => ({ ...value }),
            countPatternMatches: (value, pattern) =>
                (value.match(pattern) ?? []).length,
        },
        "/static/gateways/auth/reuse/bind-confirm-password-revalidation.js": {
            bindConfirmPasswordRevalidation({
                form,
                formController,
                passwordFieldName,
                confirmFieldName,
                signal,
            }) {
                form.elements
                    .namedItem(passwordFieldName)
                    .addEventListener(
                        "input",
                        () => formController.validateField(confirmFieldName),
                        { signal },
                    );
            },
        },
    };
    const context = dom.getInternalVMContext();
    const modules = new Map();
    function resolve(specifier, parent) {
        if (specifier.startsWith("/static/")) return specifier;
        return new URL(specifier, parent).href;
    }
    function load(id) {
        if (modules.has(id)) return modules.get(id);
        let module;
        if (fakeExports[id]) {
            const exports = fakeExports[id];
            module = new vm.SyntheticModule(
                Object.keys(exports),
                function () {
                    for (const [key, value] of Object.entries(exports))
                        this.setExport(key, value);
                },
                { context, identifier: id },
            );
        } else {
            let source;
            if (id.startsWith("/static/reuse/")) {
                const name = id.slice("/static/reuse/".length);
                assert.ok(
                    sharedModules.has(name),
                    `Undeclared shared dependency: ${id}`,
                );
                source = new URL(name, sharedRoot);
            } else {
                assert.ok(
                    id.startsWith(registrationRoot.href),
                    `Private component dependency: ${id}`,
                );
                source = new URL(id);
            }
            module = new vm.SourceTextModule(readFileSync(source, "utf8"), {
                context,
                identifier: id,
            });
        }
        modules.set(id, module);
        return module;
    }
    const entry = load(new URL("register/index.js", registrationRoot).href);
    await entry.link((specifier, parent) => {
        const id =
            parent.identifier.startsWith("/static/") &&
            specifier.startsWith(".")
                ? new URL(specifier, `https://fixture.test${parent.identifier}`)
                      .pathname
                : resolve(specifier, parent.identifier);
        return load(id);
    });
    await entry.evaluate();
    const controller = new window.AbortController();
    return {
        window,
        root,
        requests,
        calls,
        mount: () => entry.namespace.mount(root, { signal: controller.signal }),
        close() {
            controller.abort();
            window.close();
        },
    };
}
