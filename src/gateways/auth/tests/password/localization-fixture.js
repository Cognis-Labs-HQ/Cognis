import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { JSDOM } from "jsdom";
import { CapabilityStore, CTX_CAPABILITY, GatewayRegistry } from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.ts";
import {
    bootstrapAuthTestHost,
    createAuthTestContext,
    makeInMemoryDb,
} from "../auth-gateway-test-helpers.ts";

const sourceRoot = new URL("../../../../", import.meta.url);
const authRoot = new URL("../../ui/", import.meta.url);
const sharedRoot = new URL("ui/reuse/", sourceRoot);

export async function settleUntil(predicate) {
    for (let attempt = 0; attempt < 80 && !predicate(); attempt++) {
        await new Promise((resolve) => setImmediate(resolve));
    }
    assert.ok(predicate(), "Expected UI state did not settle");
}

export async function securityFixture(
    context,
    {
        locale = "en",
        policy = {
            minLength: 8,
            requireUppercase: 1,
            requireLowercase: 1,
            requireDigit: 1,
            requireSpecial: 1,
        },
        catalogEdits = {},
        unsupportedZeroCriteria = false,
        resetStatus = 200,
    } = {},
) {
    const capabilities = new CapabilityStore();
    const flow = createAuthTestContext(capabilities, makeInMemoryDb());
    await bootstrapAuthTestHost({
        adaptersRoot: "/nonexistent",
        routeRegistry: new RouteRegistry(),
        gatewayRegistry: new GatewayRegistry(),
        capabilities,
        ...flow,
    });
    const ctx = capabilities.require(CTX_CAPABILITY);
    const construction = await ctx.runFlow("construct-settings-ui");
    const descriptor = construction.data.sections.find(
        (entry) => entry.sectionId === "security",
    );
    assert.ok(
        descriptor,
        "Auth must contribute Security through the registered flow",
    );

    const window = new JSDOM(
        '<!doctype html><head></head><body><main id="settings"></main></body>',
        {
            url: "https://auth.example/settings#security",
            pretendToBeVisual: true,
        },
    ).window;
    context.after(() => window.close());
    const document = window.document;
    window.localStorage.setItem("cognis_access_token", "synthetic-session");
    window.localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify(["en", "de", "id", "ja"]),
    );
    window.localStorage.setItem("cognis_language_priority_mode", "manual");
    window.matchMedia = () => ({ matches: false });
    for (const href of [
        "/static/styles/popup.css",
        "/static/gateways/auth/security-prefs/index.css",
    ]) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        Object.defineProperty(link, "sheet", { value: {} });
        document.head.append(link);
    }
    const requests = [];
    const xmlRequests = [];
    const toasts = [];
    const redirects = [];
    const errors = [];
    window.addEventListener("error", (event) => errors.push(event.error));
    context.after(() => assert.deepEqual(errors, []));
    async function apiFetch(path, options = {}) {
        requests.push({ path, options });
        let data;
        if (path === "/api/v1/auth/password-change-capability")
            data = { supported: true };
        else if (path === "/api/v1/auth/login-session-timeout")
            data = {
                timeoutMinutes: 60,
                maximumMinutes: 120,
                usesDefault: false,
            };
        else if (path === "/api/v1/auth/security-sections") data = [];
        else if (path === "/api/v1/auth/password-policy") data = policy;
        else if (path === "/api/v1/auth/reset-password") {
            assert.equal(options.method, "POST");
            return new Response(
                JSON.stringify(
                    resetStatus === 200
                        ? { data: {} }
                        : {
                              error: {
                                  message: "gateway.auth.security.reset_failed",
                              },
                          },
                ),
                { status: resetStatus },
            );
        } else throw new Error(`Unexpected synthetic API request: ${path}`);
        return new Response(JSON.stringify({ data }));
    }
    async function fetchCatalog(path) {
        xmlRequests.push(path);
        const match = path.match(
            /^\/static\/(languages|gateways\/auth\/languages)\/(en|de|id|ja)\/strings.xml$/,
        );
        assert.ok(match, `Unexpected catalog or external request: ${path}`);
        const base =
            match[1] === "languages"
                ? new URL("ui/languages/", sourceRoot)
                : new URL("languages/", authRoot);
        let xml = await readFile(
            new URL(`${match[2]}/strings.xml`, base),
            "utf8",
        );
        if (match[1] === "languages") {
            const parsed = new window.DOMParser().parseFromString(
                xml,
                "application/xml",
            );
            for (const [key, value] of Object.entries(
                catalogEdits[match[2]] ?? {},
            )) {
                const entry = [...parsed.querySelectorAll("string")].find(
                    (element) => element.getAttribute("name") === key,
                );
                assert.ok(
                    entry,
                    `Cannot edit missing catalog fixture key: ${key}`,
                );
                if (value === null) entry.remove();
                else entry.textContent = value;
            }
            xml = new window.XMLSerializer().serializeToString(parsed);
        }
        return new Response(xml);
    }
    const sandbox = vm.createContext({
        window,
        document,
        console,
        URL,
        URLSearchParams,
        Response,
        Function,
        fetch: fetchCatalog,
        navigator: { languages: [locale] },
        localStorage: window.localStorage,
        DOMParser: window.DOMParser,
        HTMLElement: window.HTMLElement,
        HTMLFormElement: window.HTMLFormElement,
        HTMLInputElement: window.HTMLInputElement,
        HTMLButtonElement: window.HTMLButtonElement,
        HTMLTextAreaElement: window.HTMLTextAreaElement,
        HTMLSelectElement: window.HTMLSelectElement,
        FormData: window.FormData,
        AbortController: window.AbortController,
        AbortSignal: window.AbortSignal,
        crypto: window.crypto,
        getComputedStyle: window.getComputedStyle.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        setTimeout: (callback, delay) =>
            delay === 500 && callback.toString().includes("location.href")
                ? redirects.push(callback)
                : window.setTimeout(callback, delay),
        clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
    });
    const browserLifetime = new window.AbortController();
    context.after(() => browserLifetime.abort());
    const browserCtx = {
        signal: browserLifetime.signal,
        capabilities: new CapabilityStore(),
        registerFlow: (id, stages) => ctx.registerFlow({ id, stages }),
        extendFlow: (...args) => ctx.flow.extend(...args),
        runFlow: (id, input) => ctx.runFlow(id, input),
    };
    const boundaries = new Map([
        [
            new URL("api-client.js", sharedRoot).href,
            { apiFetch, requestTargetsApi: (path) => path.startsWith("/api/") },
        ],
        [
            new URL("toast.js", sharedRoot).href,
            { showToast: (...args) => toasts.push(args) },
        ],
        [new URL("ui-ctx.js", sharedRoot).href, { uiCtx: browserCtx }],
        [
            new URL("dynamic-contribution-loader.js", sharedRoot).href,
            {
                loadDynamicContributions: async (descriptors) => {
                    assert.deepEqual(Array.from(descriptors), []);
                    return [];
                },
            },
        ],
    ]);
    const modules = new Map();
    function resolve(specifier, parent) {
        if (specifier.startsWith("/static/reuse/"))
            return new URL(specifier.slice("/static/reuse/".length), sharedRoot)
                .href;
        if (specifier.startsWith("/static/gateways/auth/"))
            return new URL(
                specifier.slice("/static/gateways/auth/".length),
                authRoot,
            ).href;
        const url = new URL(specifier, parent).href;
        assert.ok(
            url.startsWith(sharedRoot.href) || url.startsWith(authRoot.href),
            `Unsupported module boundary: ${url}`,
        );
        return url;
    }
    async function load(url) {
        if (modules.has(url)) return modules.get(url);
        const boundary = boundaries.get(url);
        const module = boundary
            ? new vm.SyntheticModule(
                  Object.keys(boundary),
                  function () {
                      for (const [name, value] of Object.entries(boundary))
                          this.setExport(name, value);
                  },
                  { context: sandbox, identifier: url },
              )
            : new vm.SourceTextModule(await readFile(new URL(url), "utf8"), {
                  context: sandbox,
                  identifier: url,
              });
        modules.set(url, module);
        return module;
    }
    async function importModule(url) {
        const module = await load(url);
        if (module.status === "unlinked")
            await module.link((specifier, parent) =>
                load(resolve(specifier, parent.identifier)),
            );
        if (module.status !== "evaluated") await module.evaluate();
        return module.namespace;
    }
    if (unsupportedZeroCriteria) {
        const policyModule = await importModule(
            new URL("password-policy.js", authRoot).href,
        );
        const url = new URL("password-policy.js", authRoot).href;
        modules.delete(url);
        boundaries.set(url, {
            ...policyModule,
            normalizePasswordPolicy: () => policy,
        });
    }
    const languageState = await importModule(
        new URL("ui-language-state.js", sharedRoot).href,
    );
    languageState.selectUiLanguage(locale);
    const localization = await importModule(
        new URL("i18n.js", sharedRoot).href,
    );
    const baseI18n = await localization.createI18n({
        preferredLanguages: [locale, "en"],
    });
    const i18n = await localization.extendI18n(
        baseI18n,
        descriptor.stringsBaseUrl,
    );
    const passwordUrl = new URL("security-prefs/password-change.js", authRoot)
        .href;
    const passwordModule = await importModule(passwordUrl);
    modules.delete(passwordUrl);
    const openings = [];
    boundaries.set(passwordUrl, {
        openPasswordChangePopup: (options) => {
            const opening = { result: null, error: null, done: false };
            opening.result = passwordModule
                .openPasswordChangePopup(options)
                .then(
                    () => {
                        opening.done = true;
                    },
                    (error) => {
                        opening.error = error;
                        opening.done = true;
                    },
                );
            openings.push(opening);
            return opening.result;
        },
    });
    const security = await importModule(resolve(descriptor.scriptUrl));
    const root = document.querySelector("#settings");
    async function mount() {
        const section = security.createSettingsSection({ i18n, root });
        root.innerHTML = section.renderContent();
        await section.onRender();
        return section;
    }
    await mount();
    function active() {
        return [...document.querySelectorAll(".popup-overlay")].filter(
            (overlay) => !overlay.inert,
        );
    }
    async function open() {
        root.querySelector("#settings-reset-password-btn").click();
        const opening = openings.at(-1);
        await settleUntil(() => opening.done || active().length > 0);
        if (opening.error) throw opening.error;
        return { ...opening, result: opening.result, overlay: active().at(-1) };
    }
    const fill = (overlay, name, value) => {
        const input = overlay.querySelector(`[name="${name}"]`);
        input.value = value;
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        return input;
    };
    const action = (overlay, name) =>
        overlay.querySelector(`[data-popup-action="${name}"]`).click();
    return {
        browserCtx,
        loadShared: (path) => importModule(new URL(path, sharedRoot).href),
        loadOwned: (path) => importModule(new URL(path, authRoot).href),
        window,
        document,
        root,
        i18n,
        descriptor,
        construction,
        requests,
        xmlRequests,
        toasts,
        redirects,
        open,
        mount,
        active,
        fill,
        action,
    };
}
