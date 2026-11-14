import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { JSDOM } from "jsdom";

export const settle = async () => {
    for (let index = 0; index < 4; index += 1) {
        await new Promise((resolve) => setImmediate(resolve));
    }
};

export function deferred() {
    let resolve;
    const promise = new Promise((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

export async function fixture(context, options = {}) {
    const window = new JSDOM(
        '<!doctype html><head></head><body><main id="app"></main></body>',
        {
            url: "https://fixture.invalid/invite",
            pretendToBeVisual: true,
        },
    ).window;
    context.after(() => window.close());
    const document = window.document;
    const logs = [];
    const errors = [];
    window.addEventListener("error", (event) => errors.push(event.error));
    context.after(() => assert.deepEqual(errors, []));
    window.matchMedia = () => ({ matches: false });
    for (const href of [
        "/static/styles/popup.css",
        "/static/styles/reuse/toast.css",
        "/static/gateways/registration/app/invite/index.css",
    ]) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = href;
        Object.defineProperty(link, "sheet", { value: {} });
        document.head.appendChild(link);
    }
    const requests = [];
    const creations = [];
    let refreshes = 0;
    let composerOptions;
    const apiFetch = async (url, init = {}) => {
        requests.push({ url, init });
        if (url === "/api/v1/registration/state")
            return Response.json({
                data: {
                    inviteEnabled: true,
                    canInvite: true,
                    canGenerateToken: false,
                },
            });
        if (url === "/api/v1/registration/tokens?includeClosed=true")
            return Response.json({ data: [] });
        if (url === "/api/v1/registration/tokens" && init.method === "POST") {
            creations.push(JSON.parse(init.body));
            return (
                options.create?.() ??
                Response.json({ data: { tokenId: "synthetic-only" } })
            );
        }
        throw new Error(`Unexpected API request: ${url}`);
    };
    const sourceRoot = new URL("../../../../", import.meta.url);
    async function fetch(url) {
        const match = String(url).match(
            /^\/static\/(languages|gateways\/registration\/languages)\/(en|de|id|ja)\/strings\.xml$/,
        );
        assert.ok(match, `Unexpected external request: ${url}`);
        const base =
            match[1] === "languages"
                ? "ui/languages"
                : "gateways/registration/ui/languages";
        let body = await readFile(
            new URL(`${base}/${match[2]}/strings.xml`, sourceRoot),
            "utf8",
        );
        for (const key of options.omitKeys?.[match[2]] ?? []) {
            body = body.replace(
                new RegExp(
                    `<string name="${key.replaceAll(".", "\\.")}"[^>]*>[^<]*<\\/string>`,
                ),
                "",
            );
        }
        return new Response(body);
    }
    const sandbox = vm.createContext({
        window,
        document,
        localStorage: window.localStorage,
        navigator: window.navigator,
        DOMParser: window.DOMParser,
        Element: window.Element,
        HTMLElement: window.HTMLElement,
        HTMLInputElement: window.HTMLInputElement,
        HTMLButtonElement: window.HTMLButtonElement,
        HTMLFormElement: window.HTMLFormElement,
        HTMLTextAreaElement: window.HTMLTextAreaElement,
        HTMLSelectElement: window.HTMLSelectElement,
        RadioNodeList: window.RadioNodeList,
        AbortController: window.AbortController,
        AbortSignal: window.AbortSignal,
        CSS: { escape: (value) => value },
        URL,
        Response,
        fetch,
        console: Object.fromEntries(
            ["info", "warn", "error", "debug", "log"].map((level) => [
                level,
                (...args) => logs.push({ level, args }),
            ]),
        ),
        setTimeout: window.setTimeout.bind(window),
        clearTimeout: window.clearTimeout.bind(window),
        setInterval: window.setInterval.bind(window),
        clearInterval: window.clearInterval.bind(window),
        requestAnimationFrame: window.requestAnimationFrame.bind(window),
        getComputedStyle: window.getComputedStyle.bind(window),
    });
    const capabilities = new Map();
    const ctx = {
        capabilities: {
            get: (key) => capabilities.get(key),
            contribute: (key, value) => capabilities.set(key, value),
        },
    };
    const boundaries = new Map([
        [
            "ui/reuse/api-client.js",
            { apiFetch, requestTargetsApi: (path) => path.startsWith("/api/") },
        ],
        ["ui/reuse/ui-ctx.js", { uiCtx: ctx }],
        ["ui/reuse/page-entry.js", { mountWhenDirect: async () => {} }],
        [
            "gateways/auth/ui/reuse/password-confirmation.js",
            {
                createRepromptGuard: () => ({
                    runWithReprompt: async (action) => {
                        await options.confirm?.();
                        await action();
                        return true;
                    },
                }),
            },
        ],
        [
            "ui/reuse/page-composer/index.js",
            {
                createPageComposer: (root, config) => {
                    composerOptions = config;
                    const render = () => {
                        root.innerHTML = config.elements
                            .map((element) => element.render())
                            .join("");
                    };
                    return {
                        init: async () => render(),
                        refreshElements: () => {
                            refreshes += 1;
                            render();
                        },
                    };
                },
            },
        ],
    ]);
    const modules = new Map();
    function resolve(specifier, identifier) {
        if (specifier.startsWith("/static/gateways/"))
            return specifier
                .slice("/static/".length)
                .replace(/^gateways\/([^/]+)\//, "gateways/$1/ui/");
        if (specifier.startsWith("/static/"))
            return `ui/${specifier.slice("/static/".length)}`;
        return new URL(specifier, new URL(identifier, sourceRoot)).href.slice(
            sourceRoot.href.length,
        );
    }
    async function load(identifier) {
        if (modules.has(identifier)) return modules.get(identifier);
        const pending = (async () => {
            const boundary = boundaries.get(identifier);
            return boundary
                ? new vm.SyntheticModule(
                      Object.keys(boundary),
                      function () {
                          for (const [key, value] of Object.entries(boundary))
                              this.setExport(key, value);
                      },
                      { context: sandbox, identifier },
                  )
                : new vm.SourceTextModule(
                      await readFile(new URL(identifier, sourceRoot), "utf8"),
                      {
                          context: sandbox,
                          identifier,
                      },
                  );
        })();
        modules.set(identifier, pending);
        return pending;
    }
    async function importModule(identifier) {
        const module = await load(identifier);
        if (module.status === "unlinked")
            await module.link((specifier, referencing) =>
                load(resolve(specifier, referencing.identifier)),
            );
        if (module.status !== "evaluated") await module.evaluate();
        return module.namespace;
    }
    const i18nModule = await importModule("ui/reuse/i18n.js");
    i18nModule.setPreferredLanguages([options.locale ?? "en"], {
        mode: "manual",
    });
    const page = await importModule(
        "gateways/registration/ui/app/invite/index.js",
    );
    const lifecycle = new window.AbortController();
    const root = document.querySelector("#app");
    const actionErrors = [];
    const addRootListener = root.addEventListener.bind(root);
    root.addEventListener = (type, listener, listenerOptions) => {
        if (type !== "click")
            return addRootListener(type, listener, listenerOptions);
        return addRootListener(
            type,
            function (event) {
                const result = listener.call(this, event);
                result?.catch?.((error) => actionErrors.push(error));
            },
            listenerOptions,
        );
    };
    context.after(() =>
        assert.deepEqual(actionErrors, [], "Unexpected action rejection"),
    );
    await page.mount(root, { signal: lifecycle.signal });
    context.after(() => lifecycle.abort());
    const active = () =>
        document.querySelector(".popup-overlay[data-popup-active]");
    async function open() {
        const trigger = root.querySelector("#invite-email-btn");
        trigger.focus();
        trigger.click();
        await settle();
        assert.ok(active());
        return active();
    }
    function edit(value) {
        const input = active().querySelector('input[type="email"]');
        input.value = value;
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        return input;
    }
    function key(value) {
        document.activeElement.dispatchEvent(
            new window.KeyboardEvent("keydown", {
                key: value,
                bubbles: true,
                cancelable: true,
            }),
        );
    }
    const create = () => {
        const button = active().querySelector('[data-popup-action="create"]');
        button.focus();
        button.click();
    };
    return {
        window,
        document,
        page,
        lifecycle,
        root,
        active,
        open,
        edit,
        key,
        create,
        creations,
        requests,
        logs,
        importModule,
        takeActionErrors: () => actionErrors.splice(0),
        refreshes: () => refreshes,
        composerOptions: () => composerOptions,
        toast: () =>
            [...document.querySelectorAll(".toast-message")].at(-1)
                ?.textContent,
    };
}
