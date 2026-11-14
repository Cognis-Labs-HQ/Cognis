import { readFileSync } from "node:fs";
import { webcrypto } from "node:crypto";
import { JSDOM } from "jsdom";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

export const settle = () => new Promise((resolve) => setImmediate(resolve));
export function deferred() {
    let resolve;
    const promise = new Promise((accept) => {
        resolve = accept;
    });
    return { promise, resolve };
}

export function avatarFixture(context, { menu = false } = {}) {
    const window = new JSDOM(
        '<body><button class="avatar-button"></button><li><a data-profile-link></a></li><main></main></body>',
        { url: "https://fixture.invalid/" },
    ).window;
    context.after(() => window.close());
    const document = window.document;
    if (menu)
        document.body.insertAdjacentHTML(
            "beforeend",
            '<ul id="profile-dropdown"></ul>',
        );
    const subscribers = new Set();
    const searchProviders = new Set();
    const menuMarkup = readFileSync(
        new URL("../ui/availability-menu.html", import.meta.url),
        "utf8",
    );
    let menuResponse = () => new Response(menuMarkup);
    const menuRequests = [];
    const values = new Map();
    const uiCtx = {
        capabilities: {
            get: (id) => values.get(id),
            contribute: (id, value) => {
                if (values.has(id)) return false;
                values.set(id, value);
                return true;
            },
            remove: (id, value) =>
                values.get(id) === value && values.delete(id),
        },
    };
    window.localStorage.setItem("cognis_account", "alice");
    window.localStorage.setItem("cognis_access_token", "token-alice");
    let profile = {
        handle: "alice",
        displayName: "Alice",
        avatarKey: "alice/avatar-one",
    };
    let availabilityFailure;
    let request = async (path) =>
        path.startsWith("/api/v1/files/")
            ? new Response("image")
            : Response.json({ data: profile });
    const requests = [];
    const logs = [];
    const revoked = [];
    const timers = new Map();
    let timer = 0;
    let blob = 0;
    let now = Date.now();
    const globals = {
        Date: class extends Date {
            static now() {
                return now;
            }
        },
        window,
        document,
        crypto: webcrypto,
        localStorage: window.localStorage,
        URL: {
            createObjectURL: () => `blob:fixture-${++blob}`,
            revokeObjectURL: (url) => revoked.push(url),
        },
        console: { error: (...args) => logs.push(args) },
        AbortController: window.AbortController,
        fetch: async (path) => {
            if (
                path !==
                "/static/adapters/social/profile/availability-menu.html"
            )
                throw new Error("unexpected_fixture_fetch");
            menuRequests.push(path);
            return menuResponse();
        },
        setTimeout: (callback) => {
            timers.set(++timer, callback);
            return timer;
        },
        clearTimeout: (id) => timers.delete(id),
    };
    const apiFetch = (...args) => {
        requests.push(args[0]);
        return request(...args);
    };
    const shared = {
        "/static/reuse/ui-ctx.js": { uiCtx },
        "/static/reuse/api-client.js": { apiFetch },
        "/static/reuse/escape-html.js": { escapeHtml },
        "/static/reuse/page-styles.js": {
            ensurePersistentStylesheet: async () => {},
        },
    };
    const availability = {
        availabilityIndicatorMarkup: () =>
            '<span class="availability-indicator"></span>',
        fetchAvailability: async () => ({ status: "free" }),
        refreshAvailabilityIndicators: async () => {},
        setManualAvailability: async () => true,
        subscribeAvailabilityUpdates: (callback) => {
            subscribers.add(callback);
            return () => subscribers.delete(callback);
        },
        STATUS_OPTIONS: ["free", "busy", "tentative"],
        hydrateAvailabilityIndicators: async () => {},
    };
    const cache = loadTestModule(
        new URL("../ui/reuse/avatar-cache.js", import.meta.url),
        shared,
        globals,
    );
    const avatar = loadTestModule(
        new URL("../ui/profile-avatar.js", import.meta.url),
        {
            ...shared,
            "./availability.js": availability,
            "./reuse/avatar-cache.js": cache,
        },
        globals,
    );
    const preview = loadTestModule(
        new URL("../ui/profile-preview.js", import.meta.url),
        {
            ...shared,
            "./profile-avatar.js": avatar,
            "./reuse/avatar-cache.js": cache,
            "./offline-client.js": { profileFetch: apiFetch },
            "/static/reuse/markdown-renderer.js": {
                renderMarkdown: escapeHtml,
            },
            "/static/reuse/access-role.js": {
                normalizeRoleValue: (value) => value,
                getRoleLabel: () => "",
            },
        },
        globals,
    );
    const provider = loadTestModule(
        new URL("../ui/provider.js", import.meta.url),
        {
            "./availability.js": {
                mountAvailability: () => {
                    if (availabilityFailure) throw availabilityFailure;
                },
            },
            "./offline-client.js": { registerProfileOfflineClient: () => {} },
            "./client.js": { profileUiClient: {} },
            "./profile-avatar.js": avatar,
            "./profile-preview.js": preview,
        },
        globals,
    );
    const avatarProvider = loadTestModule(
        new URL("../ui/navbar-avatar-provider.js", import.meta.url),
        {
            ...shared,
            "/static/reuse/offline-state.js": { isOffline: () => false },
            "./profile-avatar.js": avatar,
            "./reuse/avatar-cache.js": cache,
        },
        globals,
    );
    const navbarPlugin = loadTestModule(
        new URL("../ui/navbar.js", import.meta.url),
        {
            ...shared,
            "./navbar-avatar-provider.js": avatarProvider,
            "/static/reuse/i18n.js": {
                createI18n: async () => ({ t: () => "Profile" }),
                applyStaticTranslations: () => {},
            },
            "./profile-avatar.js": avatar,
            "./profile-preview.js": preview,
            "./search/index.js": {
                registerSearchIndexing: () => {
                    const item = {};
                    searchProviders.add(item);
                    return () => searchProviders.delete(item);
                },
            },
            "./availability.js": availability,
        },
        globals,
    );
    const { createProviderLifecycle } = loadTestModule(
        new URL("../../../../ui/reuse/provider-lifecycle.js", import.meta.url),
        {},
        globals,
    );
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async (url) =>
            url === "/profile" ? provider : navbarPlugin,
    });
    const catalog = [{ scriptUrl: "/profile" }, { scriptUrl: "/navbar" }];
    const ready = lifecycle.reconcile(catalog);
    context.after(() => lifecycle.reconcile([]));
    const navbar = loadTestModule(
        new URL("../../../../ui/layouts/navbar-avatar.js", import.meta.url),
        {
            "../reuse/ui-ctx.js": { uiCtx },
        },
        globals,
    );
    return {
        window,
        document,
        uiCtx,
        avatar,
        preview,
        navbar,
        requests,
        logs,
        revoked,
        subscribers,
        searchProviders,
        menuRequests,
        menuMarkup,
        setMenuResponse: (callback) => {
            menuResponse = callback;
        },
        ready,
        lifecycle,
        catalog,
        provider,
        failAvailability: (error) => {
            availabilityFailure = error;
        },
        advance: (milliseconds) => {
            now += milliseconds;
        },
        setRequest: (value) => {
            request = value;
        },
        setProfile: (value) => {
            profile = value;
        },
        async timers() {
            const callbacks = [...timers.values()];
            timers.clear();
            await Promise.all(callbacks.map((callback) => callback()));
            await settle();
        },
        markup(key = "alice/avatar-one") {
            return avatar.buildProfileAvatarMarkup({
                avatarKey: key,
                label: "Alice",
                colorSeed: "alice",
                avatarClass: "avatar",
                imageClass: "image",
                fallbackClass: "initials",
                showAvailability: false,
            });
        },
    };
}
