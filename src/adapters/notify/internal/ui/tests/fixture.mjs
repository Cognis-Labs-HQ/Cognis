import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { JSDOM } from "jsdom";

export const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
};

export function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

export async function fixture(options = {}) {
    const dom = new JSDOM(
        '<!doctype html><html><head><link rel="stylesheet" href="/static/gateways/notify-internal/notifications.css"></head><body><div class="account-cluster"><div class="profile-menu"></div></div></body></html>',
        {
            url: "https://synthetic.invalid/dashboard",
            runScripts: "outside-only",
            pretendToBeVisual: true,
        },
    );
    const { window } = dom;
    const { document } = window;
    const context = dom.getInternalVMContext();
    if (!options.deferStyles)
        Object.defineProperty(document.querySelector("link"), "sheet", {
            value: {},
        });
    window.localStorage.setItem(
        "cognis_access_token",
        "synthetic-fixture-token",
    );
    const requests = [];
    const notices = [];
    const logs = [];
    const search = new Map();
    const timers = new Map();
    const capabilities = new Map();
    let timerId = 0;
    const state = {
        reads: "success",
        writes: "success",
        rows: [
            {
                id: "synthetic-notice",
                subject: "Synthetic Notice",
                body: "Synthetic Body",
                senderName: "Fixture Sender",
                createdAt: 1000,
                read: false,
                category: "system",
                actionUrl: "/synthetic-destination",
            },
        ],
        intercept: undefined,
        ...options,
    };
    const request = async (path, init = {}) => {
        const method = init.method ?? "GET";
        requests.push({ path, method });
        const override = await state.intercept?.(path, init);
        if (override !== undefined) return override;
        const translation = path.match(
            /^\/static\/(languages|gateways\/notify-internal\/languages)\/([a-z]+)\/strings.xml$/,
        );
        if (translation) {
            const base =
                translation[1] === "languages"
                    ? "src/ui/languages"
                    : "src/adapters/notify/internal/ui/languages";
            let xml = readFileSync(
                new URL(`${base}/${translation[2]}/strings.xml`, root),
                "utf8",
            );
            const xmlDocument = new window.DOMParser().parseFromString(
                xml,
                "application/xml",
            );
            for (const element of xmlDocument.querySelectorAll("string")) {
                if (
                    state.missingTranslations?.[translation[2]]?.includes(
                        element.getAttribute("name"),
                    )
                )
                    element.remove();
            }
            xml = new window.XMLSerializer().serializeToString(xmlDocument);
            return new Response(xml, {
                headers: { "content-type": "application/xml" },
            });
        }
        if (path === "/api/v1/system/healthcheck")
            return Response.json({ ok: true });
        assert.match(path, /^\/api\/v1\/notify\/inbox(?:\/[^/]+)?(?:\/read)?$/);
        const mode = method === "GET" ? state.reads : state.writes;
        if (mode === "reject")
            throw new TypeError("synthetic transport failure");
        if (mode === "http500")
            return Response.json(
                { error: "synthetic failure" },
                { status: 500 },
            );
        if (mode === "malformed") return new Response("not-json");
        if (method === "PUT")
            state.rows = state.rows.map((row) =>
                path === "/api/v1/notify/inbox/read" ||
                path.includes("/" + row.id + "/")
                    ? { ...row, read: true }
                    : row,
            );
        const previousCount = state.rows.length;
        if (method === "DELETE")
            state.rows =
                path === "/api/v1/notify/inbox"
                    ? []
                    : state.rows.filter((row) => !path.endsWith("/" + row.id));
        return Response.json({
            data:
                method === "GET"
                    ? state.rows
                    : method === "DELETE" && path === "/api/v1/notify/inbox"
                      ? { removed: previousCount - state.rows.length }
                      : { ok: true },
        });
    };
    const i18n = { t: (key) => key };
    capabilities.set("ui:log", (...args) => logs.push(args));
    const providerController = new window.AbortController();
    const flows = new Map();
    const flowCalls = [];
    const uiCtx = {
        signal: providerController.signal,
        capabilities: {
            get: (name) => capabilities.get(name),
            contribute: (name, value) => {
                capabilities.set(name, value);
                return true;
            },
        },
        registerFlow(name, stages) {
            assert.ok(!flows.has(name), `duplicate flow ${name}`);
            flows.set(name, new Map(stages.map((stage) => [stage, []])));
        },
        extendFlow(name, stage, hook, handler) {
            assert.ok(
                flows.get(name)?.has(stage),
                `undeclared stage ${name}/${stage}`,
            );
            flows
                .get(name)
                .get(stage)
                .push({ ...hook, handler });
            return true;
        },
        async runFlow(name, input) {
            assert.ok(flows.has(name), `undeclared flow ${name}`);
            flowCalls.push(name);
            const data = {};
            const stageResults = {};
            for (const [stage, hooks] of flows.get(name)) {
                stageResults[stage] = [];
                for (const hook of hooks.toSorted(
                    (left, right) => (left.order ?? 0) - (right.order ?? 0),
                )) {
                    stageResults[stage].push(
                        await hook.handler({ input, data, stageResults }),
                    );
                }
            }
            return { data, stageResults };
        },
    };
    uiCtx.registerFlow("logout", [
        "revokeSession",
        "clearSession",
        "redirectToLogin",
    ]);
    uiCtx.registerFlow("authenticate-session", ["afterSession"]);
    uiCtx.registerFlow("page:mounted", ["publish"]);
    const stubs = {
        "/static/reuse/i18n.js": { createI18n: async () => i18n },
        "/static/reuse/timestamp.js": {
            formatRelativeTime: () => "Synthetic time",
        },
        "/static/reuse/ui-ctx.js": { uiCtx },
        "/static/reuse/app-router.js": {
            navigateTo: (path) => requests.push({ path, method: "NAVIGATE" }),
        },
        "/static/reuse/search-util/popup.js": {
            registerSearchIndex: (name, collect) => {
                search.set(name, collect);
                return () => search.delete(name);
            },
        },
        "/static/reuse/toast.js": {
            showToast: (...args) => notices.push(args),
        },
        "/static/reuse/popup.js": {
            openPopup: async (args) => {
                state.popupCalls = (state.popupCalls ?? 0) + 1;
                return state.popup?.(args) ?? "cancel";
            },
        },
        "/static/reuse/crypto-utils.js": {
            hexToBytes: () => {
                throw new Error(
                    "No cryptographic flow belongs to this fixture",
                );
            },
        },
        "/static/reuse/offline-state.js": {
            isOffline: () => false,
            offlineEnabled: () => false,
            setOffline: () => {
                throw new Error(
                    "No offline transition belongs to this fixture",
                );
            },
        },
    };
    if (options.realI18n) delete stubs["/static/reuse/i18n.js"];
    Object.assign(context, {
        fetch: request,
        Headers,
        Response,
        TextDecoder,
        CSS: {
            escape: (value) => {
                assert.match(value, /^[a-z0-9-]+$/);
                return value;
            },
        },
        console: {
            error: (...args) => logs.push(args),
            warn: (...args) => logs.push(args),
            info: (...args) => logs.push(args),
        },
        setTimeout: (callback, delay) => {
            timers.set(++timerId, { callback, delay });
            return timerId;
        },
        clearTimeout: (id) => timers.delete(id),
        setInterval: (callback, delay) => {
            timers.set(++timerId, { callback, delay, interval: true });
            return timerId;
        },
        clearInterval: (id) => timers.delete(id),
    });
    const modules = new Map();
    const sourceFiles = [];
    function canonical(specifier, parent) {
        if (specifier.startsWith("/static/reuse/")) return specifier;
        if (specifier.startsWith(".")) return new URL(specifier, parent).href;
        return specifier;
    }
    const root = new URL("../../../../../../", import.meta.url);
    async function moduleFor(specifier, parent = root.href) {
        let identifier = canonical(specifier, parent);
        if (
            identifier.startsWith("file:") &&
            identifier.includes("/src/ui/reuse/")
        ) {
            identifier =
                "/static/reuse/" + identifier.split("/src/ui/reuse/")[1];
        }
        if (modules.has(identifier)) return modules.get(identifier);
        if (Object.hasOwn(stubs, identifier)) {
            const values = stubs[identifier];
            const module = new vm.SyntheticModule(
                Object.keys(values),
                function () {
                    for (const [key, value] of Object.entries(values))
                        this.setExport(key, value);
                },
                { context, identifier },
            );
            modules.set(identifier, module);
            return module;
        }
        const url = identifier.startsWith("/static/reuse/")
            ? new URL(
                  "src/ui/reuse/" + identifier.slice("/static/reuse/".length),
                  root,
              )
            : new URL(identifier);
        sourceFiles.push(url.pathname);
        const module = new vm.SourceTextModule(readFileSync(url, "utf8"), {
            context,
            identifier: url.href,
        });
        modules.set(identifier, module);
        await module.link((child, referring) =>
            moduleFor(child, referring.identifier),
        );
        return module;
    }
    const plugin = await moduleFor(
        new URL("src/adapters/notify/internal/ui/navbar-plugin.js", root).href,
    );
    await plugin.evaluate();
    const mounting = plugin.namespace.mountProvider(uiCtx);
    if (options.deferStyles) {
        await settle();
        assert.equal(document.querySelector("#notification-toggle"), null);
        document.querySelector("link").dispatchEvent(new window.Event("load"));
    }
    const dispose = await mounting;
    await settle();
    assert.ok(
        document.querySelector("#notification-toggle"),
        JSON.stringify(logs),
    );
    const snapshot = () => ({
        rows: document.querySelectorAll(".notification-item").length,
        unread: document.querySelectorAll(".notification-item--unread").length,
        badge: document.querySelector("#notification-count").textContent,
        badgeHidden: document.querySelector("#notification-count").hidden,
        empty: !document.querySelector(".notification-empty").hidden,
        clearDisabled: document.querySelector(".notification-clear-all")
            .disabled,
        search: search
            .get("notifications")()
            .flatMap((group) => group.items).length,
        errors: notices.length,
    });
    return {
        state,
        window,
        document,
        requests,
        notices,
        logs,
        sourceFiles,
        snapshot,
        uiCtx,
        flowCalls,
        search,
        dispose,
        providerController,
        capabilities,
        timers,
        click: async (selector) => {
            document.querySelector(selector).click();
            await settle();
        },
        poll: async () => {
            const entry = [...timers].find(
                ([, timer]) =>
                    !timer.interval &&
                    timer.callback.name === "tick" &&
                    [10000, 30000].includes(timer.delay),
            );
            assert.ok(entry, "Production polling callback is scheduled");
            timers.delete(entry[0]);
            await entry[1].callback();
            await settle();
        },
        translate: async (key, locale = "en") => {
            const resolver = await modules
                .get("/static/reuse/i18n.js")
                .namespace.createI18n({
                    preferredLanguages: [locale],
                    persistLocale: false,
                    componentStringBaseUrls: [
                        "/static/gateways/notify-internal/languages",
                    ],
                });
            return resolver.t(key);
        },
        close: () => {
            dispose?.();
            dom.window.close();
        },
    };
}
