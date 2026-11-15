import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { JSDOM, VirtualConsole } from "jsdom";
import { pathToFileURL } from "node:url";
import { host } from "./contracts.js";

const sourceRoot = new URL("../../../../", import.meta.url);
const contractsUrl = new URL("./contracts.js", import.meta.url).href;
const publicBoundaries = new Set([
    "/static/reuse/page-composer/index.js",
    "/static/reuse/page-entry.js",
    "/static/reuse/toast.js",
    "/static/reuse/auth-footer.js",
    "/static/reuse/auth-typing.js",
    "/static/reuse/popup.js",
    "/static/reuse/error-reporting.js",
    "/static/reuse/auth-setup-route.js",
    "/static/adapters/auth/keyring/keyring.js",
]);
const fileBoundaries = new Set([
    new URL("ui/reuse/api-client.js", sourceRoot).href,
    new URL("ui/reuse/pwa.js", sourceRoot).href,
]);
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (
            specifier === "/static/gateways/auth/login-page/index.js" &&
            process.env.AUTH_LOGIN_SOURCE
        ) {
            return {
                url: pathToFileURL(process.env.AUTH_LOGIN_SOURCE).href,
                shortCircuit: true,
            };
        }
        if (
            specifier === "/static/gateways/tfa/login-flow.js" &&
            process.env.TFA_LOGIN_SOURCE
        ) {
            return {
                url: pathToFileURL(process.env.TFA_LOGIN_SOURCE).href,
                shortCircuit: true,
            };
        }
        if (specifier === "/fixture/tfa-provider.js")
            return {
                url: new URL("./provider-contract.js", import.meta.url).href,
                shortCircuit: true,
            };
        if (publicBoundaries.has(specifier))
            return { url: contractsUrl, shortCircuit: true };
        for (const [prefix, path] of [
            ["/static/reuse/", "ui/reuse/"],
            ["/static/gateways/auth/", "gateways/auth/ui/"],
            ["/static/gateways/tfa/", "gateways/tfa/ui/"],
        ]) {
            if (specifier.startsWith(prefix))
                return {
                    url: new URL(
                        path + specifier.slice(prefix.length),
                        sourceRoot,
                    ).href,
                    shortCircuit: true,
                };
        }
        const result = nextResolve(specifier, context);
        return fileBoundaries.has(result.url)
            ? { url: contractsUrl, shortCircuit: true }
            : result;
    },
});

export async function settle() {
    for (let index = 0; index < 15; index++)
        await new Promise((resolve) => setImmediate(resolve));
}

export async function settleUntil(predicate) {
    for (let index = 0; index < 100 && !predicate(); index++) {
        await new Promise((resolve) => setTimeout(resolve, 2));
    }
    assert.ok(predicate(), "Expected UI state did not settle");
}

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

export function challenge(deadline, extra = {}) {
    return {
        maxLength: 6,
        deliveryStatus: "queued",
        retryAfterSeconds: 30,
        resendAvailableAt: new Date(deadline).toISOString(),
        ...extra,
    };
}

export function prompt(deadline = 30_000, extra = {}) {
    return {
        tfaRequired: true,
        loginUrl: "/login",
        loginAttemptId: "synthetic-attempt",
        methods: [
            {
                id: "email",
                name: "Email",
                loginUi: { supportsResend: true },
                challenge: challenge(deadline),
            },
        ],
        ...extra,
    };
}

export async function fixture(
    context,
    {
        initialPrompt = prompt(),
        resume = true,
        locale = "en",
        expectPrompt = true,
        providerContract = null,
        respond,
    } = {},
) {
    const navigationDiagnostics = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on("jsdomError", (error) =>
        navigationDiagnostics.push(error),
    );
    const window = new JSDOM(
        '<!doctype html><head></head><body><main id="app"></main></body>',
        {
            url: "https://login.example/login",
            pretendToBeVisual: true,
            virtualConsole,
        },
    ).window;
    const state = {
        catalogEdits: {},
        providerContract,
        providerCalls: [],
        loading: 0,
        footerLoads: 0,
        notices: [],
        errors: [],
        pwaCalls: [],
        requests: [],
        clock: 0,
        timers: new Map(),
        timerId: 0,
        mount: null,
        pendingPrompt: resume ? initialPrompt : null,
        respond: respond ?? (() =>
            Response.json({
                data: { challenge: challenge(state.clock + 30_000) },
            })),
    };
    window.localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify([locale, "en"]),
    );
    window.localStorage.setItem("cognis_language_priority_mode", "manual");
    host.current = state;
    const originals = new Map();
    for (const name of [
        "window",
        "document",
        "localStorage",
        "navigator",
        "DOMParser",
        "Element",
        "HTMLElement",
        "HTMLInputElement",
        "HTMLAnchorElement",
        "HTMLFormElement",
        "HTMLButtonElement",
        "HTMLSelectElement",
        "HTMLTextAreaElement",
        "FormData",
        "MutationObserver",
        "AbortController",
        "AbortSignal",
        "ResizeObserver",
    ]) {
        originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
        Object.defineProperty(globalThis, name, {
            configurable: true,
            writable: true,
            value:
                name === "ResizeObserver"
                    ? class {
                          observe() {}
                          disconnect() {}
                      }
                    : window[name],
        });
    }
    const savedNow = Date.now;
    Date.now = () => state.clock;
    const savedFetch = globalThis.fetch;
    window.setInterval = (callback, interval) => {
        const id = ++state.timerId;
        state.timers.set(id, {
            callback,
            interval,
            next: state.clock + interval,
        });
        return id;
    };
    window.clearInterval = (id) => state.timers.delete(id);
    context.after(() => {
        Date.now = savedNow;
        globalThis.fetch = savedFetch;
        window.close();
        for (const [name, descriptor] of originals) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
    });
    const style = window.document.createElement("link");
    style.rel = "stylesheet";
    style.href = "/static/gateways/tfa/login.css";
    Object.defineProperty(style, "sheet", { value: {} });
    window.document.head.append(style);
    state.fetch = globalThis.fetch = async (path, options = {}) => {
        const locale = path.match(
            /^\/static\/(languages|gateways\/(?:auth|tfa)\/languages)\/(en|de|id|ja)\/strings.xml$/,
        );
        if (locale) {
            const base =
                locale[1] === "languages"
                    ? "ui/languages/"
                    : `${locale[1].replace("/languages", "/ui/languages")}/`;
            let xml = await readFile(
                new URL(`${base}${locale[2]}/strings.xml`, sourceRoot),
                "utf8",
            );
            if (locale[1] === "gateways/tfa/languages") {
                const parsed = new window.DOMParser().parseFromString(
                    xml,
                    "application/xml",
                );
                for (const [key, value] of Object.entries(
                    state.catalogEdits[locale[2]] ?? {},
                )) {
                    const entry = [...parsed.querySelectorAll("string")].find(
                        (element) => element.getAttribute("name") === key,
                    );
                    assert.ok(
                        entry,
                        `Cannot alter missing fixture key: ${key}`,
                    );
                    if (value === null) entry.remove();
                    else entry.textContent = value;
                }
                xml = new window.XMLSerializer().serializeToString(parsed);
            }
            return new Response(xml);
        }
        const request = {
            path,
            method: options.method ?? "GET",
            body: options.body ? JSON.parse(options.body) : null,
        };
        state.requests.push(request);
        if (path === "/api/v1/auth/login-ui")
            return Response.json({
                data: {
                    methods: [{ id: "local", name: "Local", credential: true }],
                    integrations: [
                        {
                            id: "tfa",
                            scriptUrl: providerContract
                                ? "/fixture/tfa-provider.js"
                                : "/static/gateways/tfa/login-flow.js",
                        },
                    ],
                },
            });
        if (path === "/api/v1/auth/registration-config")
            return Response.json({ data: { registrationsEnabled: false } });
        if (path === "/api/v1/auth/login-attempt") {
            if (request.method === "DELETE")
                return (
                    state.cancelResponse?.(request) ??
                    Response.json({ data: {} })
                );
            return Response.json({ data: state.pendingPrompt });
        }
        if (path === "/api/v1/auth/login")
            return Response.json({ data: initialPrompt });
        if (path === "/api/v1/tfa/login/resend") return state.respond(request);
        assert.fail(`Unexpected synthetic transport request: ${path}`);
    };
    if (providerContract) {
        const provider = await import("/fixture/tfa-provider.js");
        provider.setVersion(providerContract.moduleVersion);
    }
    const module = await import("/static/gateways/auth/login-page/index.js");
    const root = window.document.querySelector("#app");
    let lifetime = new window.AbortController();
    context.after(() => lifetime.abort());
    await module.mount(root, { signal: lifetime.signal });
    await settle();
    if (!resume) {
        root.querySelector("#login-username").value = "synthetic-user";
        root.querySelector("#login-password").value = "synthetic-password";
        root.querySelector("#login-form").dispatchEvent(
            new window.Event("submit", { bubbles: true, cancelable: true }),
        );
        await settle();
    }
    if (expectPrompt)
        await settleUntil(() => root.querySelector("#login-tfa-resend-action"));
    await settle();
    return {
        ...state,
        state,
        root,
        window,
        get lifetime() {
            return lifetime;
        },
        navigationDiagnostics,
        async reopen(nextPrompt, { abortPrevious = true } = {}) {
            if (abortPrevious) lifetime.abort();
            state.pendingPrompt = nextPrompt;
            lifetime = new window.AbortController();
            await module.mount(root, { signal: lifetime.signal });
            await settleUntil(() =>
                root.querySelector("#login-tfa-resend-action"),
            );
            await settle();
        },
        resend: () => root.querySelector("#login-tfa-resend-action"),
        requests: state.requests,
        resendRequests: () =>
            state.requests.filter(
                (entry) => entry.path === "/api/v1/tfa/login/resend",
            ),
        async click() {
            root.querySelector("#login-tfa-resend-action").click();
            await settle();
        },
        async advance(milliseconds) {
            const until = state.clock + milliseconds;
            while (true) {
                const next = Math.min(
                    ...[...state.timers.values()].map((timer) => timer.next),
                );
                if (next > until) break;
                state.clock = next;
                for (const [id, timer] of [...state.timers]) {
                    if (state.timers.has(id) && timer.next <= next) {
                        timer.next += timer.interval;
                        timer.callback();
                    }
                }
            }
            state.clock = until;
            await settle();
        },
    };
}

export function observeStorageListeners(context, window) {
    const listeners = new Set();
    const add = window.addEventListener.bind(window);
    const remove = window.removeEventListener.bind(window);
    context.mock.method(
        window,
        "addEventListener",
        (type, callback, options) => {
            if (type === "storage") listeners.add(callback);
            return add(type, callback, options);
        },
    );
    context.mock.method(
        window,
        "removeEventListener",
        (type, callback, options) => {
            if (type === "storage") listeners.delete(callback);
            return remove(type, callback, options);
        },
    );
    return listeners;
}
