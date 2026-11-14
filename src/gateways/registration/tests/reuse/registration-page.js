import vm from "node:vm";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export async function mountRegistrationPage({
    fieldFailure = false,
    registrationDescriptors,
} = {}) {
    const base = fileURLToPath(new URL("../../../../../", import.meta.url));
    const requests = [],
        toasts = [],
        popups = [],
        timers = [];
    const descriptors =
        registrationDescriptors ??
        (fieldFailure
            ? [
                  {
                      id: "consent",
                      scriptUrl: "synthetic:consent",
                      onboardingOperations: ["consent:record"],
                  },
              ]
            : []);
    class Form {
        constructor() {
            this.handlers = {};
            for (const [key, value] of Object.entries({
                email: "synthetic@example.test",
                username: "synthetic",
                displayName: "Synthetic",
                password: "synthetic-password",
                confirmPassword: "synthetic-password",
            }))
                this[key] = { value };
            this.elements = { namedItem: () => null };
        }
        addEventListener(key, fn) {
            this.handlers[key] = fn;
        }
    }
    class Input {
        value = "123456";
    }
    const form = new Form();
    const root = {
        querySelector: (selector) =>
            selector === "#register-form" ? form : null,
    };
    const window = new EventTarget();
    window.location = { search: "", href: "/register" };
    window.setTimeout = (fn) => timers.push(fn);
    const i18n = { locale: "en", t: (key) => key };
    const fetchImpl = async (url, options = {}) => {
        requests.push({ url, options });
        let data = {};
        if (url === "/api/v1/auth/registration-config")
            data = {
                registrationsEnabled: true,
                requiredFields: fieldFailure ? [] : ["email"],
                integrations: descriptors,
            };
        else if (url === "/api/v1/auth/register")
            data = {
                verifyToken: "synthetic-only",
                onboardingOperations: fieldFailure
                    ? []
                    : ["notify:email:add", "notify:email:verify"],
            };
        else if (url === "/api/v1/system/languages") data = [];
        else if (url === "/api/v1/auth/account-creation-attempt")
            return { ok: false, json: async () => ({}) };
        return {
            ok: true,
            status: url.endsWith("/complete") ? 204 : 200,
            json: async () => ({ data }),
        };
    };
    const context = vm.createContext({
        console: { error() {}, warn() {} },
        URL,
        URLSearchParams,
        AbortController,
        Error,
        Object,
        Array,
        Set,
        String,
        Date,
        JSON,
        fetch: fetchImpl,
        window,
        HTMLFormElement: Form,
        HTMLInputElement: Input,
        HTMLSelectElement: class {},
        FormData: class {
            entries() {
                return Object.entries({
                    email: "synthetic@example.test",
                    username: "synthetic",
                    password: "synthetic-password",
                    confirmPassword: "synthetic-password",
                });
            }
        },
        setInterval,
        clearInterval,
    });
    const fakes = {
        "synthetic:consent": {
            createRegistrationField() {
                throw new Error("synthetic_field_failure");
            },
            completeRegistration: async () => {},
        },
        "/static/reuse/page-composer/index.js": {
            createPageComposer: (_root, config) => ({
                async init() {
                    for (const element of config.elements) {
                        element.render();
                        element.onRender();
                    }
                },
            }),
        },
        "/static/reuse/auth-footer.js": {
            loadAuthFooterPlugins: async () => {},
            mountAuthFooter: () => {},
            renderAuthFooter: () => "",
        },
        "/static/reuse/page-entry.js": { mountWhenDirect: async () => {} },
        "/static/reuse/i18n.js": {
            DEFAULT_LOCALE: "en",
            createI18n: async () => i18n,
            extendI18n: async () => i18n,
            applyDocumentTitle: () => {},
            readPreferredLanguages: () => ["en"],
            sanitizeLanguagePriority: (value) => value,
            selectSupportedLanguage: () => "en",
            setPreferredLanguages: () => {},
        },
        "/static/reuse/escape-html.js": { escapeHtml: (value) => value },
        "/static/reuse/toast.js": {
            showToast: (...value) => toasts.push(value),
        },
        "/static/reuse/popup.js": {
            openPopup: (options) =>
                new Promise((resolve) => {
                    const popup = {
                        options,
                        closed: false,
                        resolve: (value) => {
                            popup.closed = true;
                            resolve(value);
                        },
                    };
                    popups.push(popup);
                    options.onOpen({ querySelector: () => new Input() });
                    options.signal?.addEventListener("abort", () =>
                        popup.resolve(null),
                    );
                }),
        },
        "/static/reuse/in-page-callout.js": { renderInPageCallout: () => "" },
        "/static/reuse/auth-typing.js": {
            loadAuthTypingSamples: async () => [],
            runTypingShowcase: () => {},
        },
        "/static/reuse/auth-layout.js": {
            renderAuthBrandline: () => "",
            renderAuthLayout: ({ formPanelHtml }) => formPanelHtml,
        },
        "/static/gateways/auth/countdown.js": {
            formatCountdownClock: () => "",
        },
        "/static/reuse/form-builder.js": {
            createFormBuilder: () => ({
                render: () => "",
                attach: () => ({ validateAll: () => true }),
            }),
        },
        "/static/gateways/auth/password-policy.js": {
            DEFAULT_PASSWORD_POLICY: {},
            normalizePasswordPolicy: () => ({}),
        },
        "/static/gateways/auth/reuse/bind-confirm-password-revalidation.js": {
            bindConfirmPasswordRevalidation: () => {},
        },
    };
    const cache = new Map();
    async function get(id, parent) {
        let filename;
        if (fakes[id]) filename = id;
        else if (id.startsWith("/static/gateways/"))
            filename = path.join(
                base,
                "src/gateways",
                id
                    .slice("/static/gateways/".length)
                    .replace(/^(auth|notify)\//, "$1/ui/"),
            );
        else filename = path.resolve(path.dirname(parent), id);
        if (cache.has(filename)) return cache.get(filename);
        let module;
        if (fakes[id]) {
            const values = fakes[id];
            module = new vm.SyntheticModule(
                Object.keys(values),
                function () {
                    for (const [key, value] of Object.entries(values))
                        this.setExport(key, value);
                },
                { context, identifier: filename },
            );
        } else if (filename.endsWith("/register/form.js")) {
            module = new vm.SyntheticModule(
                ["buildPasswordCriteria", "resetAuthSessionForRegister"],
                function () {
                    this.setExport("buildPasswordCriteria", () => []);
                    this.setExport(
                        "resetAuthSessionForRegister",
                        async () => false,
                    );
                },
                { context, identifier: filename },
            );
        } else {
            module = new vm.SourceTextModule(readFileSync(filename, "utf8"), {
                context,
                identifier: filename,
                importModuleDynamically: async (specifier, ref) => {
                    const child = await get(specifier, ref.identifier);
                    if (child.status === "unlinked")
                        await child.link((specifier, reference) =>
                            get(specifier, reference.identifier),
                        );
                    if (child.status === "linked") await child.evaluate();
                    return child;
                },
            });
        }
        cache.set(filename, module);
        return module;
    }
    const file = path.join(
        base,
        "src/gateways/registration/ui/register/index.js",
    );
    const module = await get(file, file);
    await module.link((specifier, ref) => get(specifier, ref.identifier));
    await module.evaluate();
    const controller = new AbortController();
    await module.namespace.mount(root, { signal: controller.signal });
    return { requests, toasts, popups, timers, form, controller };
}
