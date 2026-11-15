import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createProviderLifecycle } from "../../../../ui/reuse/provider-lifecycle.js";
import { JSDOM } from "jsdom";
import { popupFixture } from "../../../../ui/reuse/tests/popup/dom-fixture.js";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import {
    loadTestModule,
    importTestModule,
} from "../../../../tooling/reuse/test-module.ts";
import { loadProfileOfflineClient } from "./reuse/offline-client.js";
const source = new URL("../ui/", import.meta.url);
export const settle = async () => {
    for (let count = 0; count < 6; count++) await new Promise(setImmediate);
};
export function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}
export const profileFor = (handle = "learner") => ({
    accountId: handle,
    handle,
    displayName: handle,
    role: "user",
    visibility: "community",
    avatarKey: `${handle}/avatar`,
    bannerKey: `${handle}/banner`,
});
export async function heroFixture(
    context,
    { useProviderLifecycle = false, withPopup = false } = {},
) {
    const popup = withPopup ? await popupFixture(context) : null;
    const window =
        popup?.window ??
        new JSDOM('<body><main id="app"></main></body>', {
            url: "https://fixture.invalid/profile",
        }).window;
    const document = window.document;
    if (popup)
        document.body.insertAdjacentHTML("beforeend", '<main id="app"></main>');
    const pendingActions = new Set();
    const addListener = window.HTMLButtonElement.prototype.addEventListener;
    window.HTMLButtonElement.prototype.addEventListener = function (
        type,
        listener,
        options,
    ) {
        if (type !== "click")
            return addListener.call(this, type, listener, options);
        return addListener.call(
            this,
            type,
            function (event) {
                const result = listener.call(this, event);
                if (result?.then) {
                    pendingActions.add(result);
                    const remove = () => pendingActions.delete(result);
                    result.then(remove, remove);
                }
                return result;
            },
            options,
        );
    };
    let profile = profileFor();
    let followers = [];
    let media = async (path) => new Response(path);
    let override;
    let syncWork = async () => {};
    let cropWork = async () =>
        new Blob(["cropped-image"], { type: "image/png" });
    let providerId = "fixture-provider";
    let translationFailure;
    let refreshFailure;
    const logs = [];
    const requests = [],
        stages = [],
        revoked = [],
        notices = [],
        rendered = [],
        blobs = new Map(),
        polls = [];
    const host = createOfflineClientFixture(async (path, options = {}) => {
        requests.push({ path, method: options.method || "GET" });
        if (override) {
            const result = await override(path, options);
            if (result) return result;
        }
        if (path.startsWith("/api/v1/files/")) return media(path, options);
        if (options.method === "DELETE" && path.endsWith("/avatar")) {
            profile = { ...profile, avatarKey: null };
            return Response.json({ data: profile });
        }
        if (options.method === "DELETE" && path.endsWith("/banner")) {
            profile = { ...profile, bannerKey: null };
            return Response.json({ data: profile });
        }
        if (path.endsWith("/profile")) return Response.json({ data: profile });
        if (path.endsWith("/follow")) return Response.json({ data: followers });
        if (path.endsWith("/relationship"))
            return Response.json({ data: { following: false } });
        if (path.includes("/preferences/"))
            return Response.json({ data: null });
        return Response.json({ data: [] });
    });
    context.after(() => host.controller.abort());
    // The host transport fixture runs in Node; normalize DOM cancellation at this boundary.
    host.globals.AbortSignal = {
        any(signals) {
            const controller = new AbortController();
            for (const signal of signals) {
                if (signal.aborted) controller.abort();
                else
                    signal.addEventListener("abort", () => controller.abort(), {
                        once: true,
                    });
            }
            return controller.signal;
        },
    };
    const client = loadProfileOfflineClient(host);
    let lifecycle;
    const providerCatalog = [{ scriptUrl: "/profile-provider" }];
    if (useProviderLifecycle) {
        const provider = loadTestModule(
            new URL("provider.js", source),
            {
                "./offline-client.js": client,
                "./client.js": {
                    profileUiClient: {
                        getCurrentProfile: () =>
                            client.profileFetch("/api/v1/social/profile"),
                    },
                },
                "./profile-avatar.js": {
                    ensureProfileAvatarStyles: async () => {},
                    mountProfileAvatarRenderer: () => {},
                },
                "./profile-preview.js": { mountProfilePreviews: () => {} },
                "./availability.js": { mountAvailability: () => {} },
            },
            host.globals,
        );
        lifecycle = createProviderLifecycle({
            uiCtx: host.ctx,
            importProvider: async () => provider,
        });
        await lifecycle.reconcile(providerCatalog);
        context.after(() => lifecycle.reconcile([]));
    } else client.registerProfileOfflineClient(host.ctx);
    for (const flow of ["social:profile:request", "social:profileMedia:read"])
        for (const stage of ["before", "execute", "after"])
            host.ctx.extendFlow(
                flow,
                stage,
                { id: `probe:${flow}:${stage}` },
                (input) => stages.push(`${flow}:${stage}`),
            );
    host.ctx.capabilities.contribute("auth:externalProfileSync", {
        supports: (provider) => provider === "fixture-provider",
        synchronize: async () => {
            stages.push("external:sync");
            await syncWork();
        },
    });
    const globals = {
        ...host.globals,
        window,
        document,
        console: {
            error: (...args) => logs.push(args),
            info: (...args) => logs.push(args),
        },
        ...Object.fromEntries(
            [
                "HTMLElement",
                "Element",
                "HTMLFormElement",
                "HTMLInputElement",
                "HTMLTextAreaElement",
                "HTMLButtonElement",
                "HTMLSelectElement",
                "MutationObserver",
                "AbortController",
                "AbortSignal",
                "RadioNodeList",
            ].map((name) => [name, window[name]]),
        ),
        Blob,
        File,
        Response,
        URL: {
            createObjectURL: (blob) => {
                const url = `blob:probe-${blobs.size + 1}`;
                blobs.set(url, blob);
                return url;
            },
            revokeObjectURL: (url) => revoked.push(url),
        },
        localStorage: {
            getItem: (key) =>
                key === "cognis_provider_id"
                    ? providerId
                    : host.globals.localStorage.getItem(key),
            setItem: () => {},
        },
        CSS: { escape: (value) => value },
        setTimeout,
        clearTimeout,
    };
    const strings = [
        ...[
            new URL("languages/en/strings.xml", source),
            new URL("../../../../ui/languages/en/strings.xml", import.meta.url),
        ].flatMap((url) => [
            ...new window.DOMParser()
                .parseFromString(readFileSync(url, "utf8"), "application/xml")
                .querySelectorAll("string"),
        ]),
    ];
    const dictionary = new Map(
        strings.map((element) => [
            element.getAttribute("name"),
            element.textContent,
        ]),
    );
    const i18n = {
        t: (key) => {
            if (key === translationFailure)
                throw Object.assign(new Error(`missing_translation:${key}`), {
                    code: "missing_translation",
                });
            assert.ok(dictionary.get(key), key);
            return dictionary.get(key);
        },
    };
    const escapeHtml = (value) =>
        String(value ?? "").replace(
            /[&<>"']/g,
            (character) =>
                ({
                    "&": "&amp;",
                    "<": "&lt;",
                    ">": "&gt;",
                    '"': "&quot;",
                    "'": "&#39;",
                })[character],
        );
    const imports = {
        ...host.imports,
        "./offline-client.js": client,
        "/static/reuse/escape-html.js": { escapeHtml },
        "/static/reuse/markdown-renderer.js": { renderMarkdown: escapeHtml },
        "/static/reuse/timestamp.js": { formatDate: (value) => value },
        "/static/reuse/info-tooltip.js": { renderInfoTooltip: () => "" },
        "/static/reuse/access-role.js": {
            getRoleLabel: () => "",
            normalizeRoleValue: (value) => value,
        },
        "/static/reuse/page-styles.js": {
            ensurePersistentStylesheet: async () => {},
        },
        "/static/reuse/toast.js": {
            showToast: (message, options) =>
                notices.push({ message, ...options }),
        },
        "/static/reuse/popup.js": popup
            ? await popup.importModule("popup.js")
            : { openPopup: async () => "confirm" },
        "/static/reuse/app-router.js": {
            navigateTo: (path) => {
                throw new Error(`unexpected navigation ${path}`);
            },
        },
        "/static/layouts/dashboard-layout.js": {
            updateNavbarAvatar: async () => {},
        },
        "/static/reuse/i18n.js": {
            createI18n: async () => i18n,
            applyDocumentTitle: () => {},
        },
        "/static/reuse/page-entry.js": {
            mountWhenDirect: async (mount) => {
                assert.equal(typeof mount, "function");
            },
        },
        "./availability.js": {
            availabilityIndicatorMarkup: () => "",
            hydrateAvailabilityIndicators: async () => {},
        },
        "./search-groups.js": {
            registerProfilePostSearchIndex: (read) =>
                assert.equal(typeof read, "function"),
        },
        "./crop-popup.js": {
            openImageCropPopup: (options) => cropWork(options),
        },
        "/static/reuse/adaptive-poller.js": {
            createAdaptivePoller: (options) => {
                const poll = {
                    ...options,
                    active: false,
                    start() {
                        this.active = true;
                    },
                    stop() {
                        this.active = false;
                    },
                };
                polls.push(poll);
                return poll;
            },
        },
        "/static/reuse/form-builder.js": {
            createFormBuilder: (_context, options) => ({
                render: () => `<form id="${options.formId}"></form>`,
                attach: () => ({
                    getValues: () => ({ content: "Synthetic post" }),
                    validateField: () => true,
                    validateAll: () => true,
                    detach: () => {},
                }),
            }),
        },
    };
    const load = (file) =>
        loadTestModule(new URL(file, source), imports, globals);
    for (const file of [
        "file-namespaces.js",
        "profile-config.js",
        "image-crop.js",
        "follow-buttons.js",
        "guides.js",
    ])
        imports[`./${file}`] = load(file);
    imports["./image-blob.js"] = imports["./reuse/image-blob.js"] = load(
        "reuse/image-blob.js",
    );
    imports["./reuse/avatar-cache.js"] = load("reuse/avatar-cache.js");
    for (const file of [
        "profile-avatar.js",
        "profile-api-loaders.js",
        "profile-render.js",
        "profile-save.js",
        "profile-edit-fields.js",
        "profile-editor.js",
        "profile-image-selection.js",
        "profile-image-upload.js",
        "profile-post-actions.js",
        "follower-poller.js",
        "provider-sync.js",
        "profile-page-lifetime.js",
        "profile-hero-media.js",
    ]) {
        if (file === "profile-save.js")
            imports["./client.js"] = load("client.js");
        imports[`./${file}`] = load(file);
    }
    // Explicit host public-contract fake: ordinary refresh rerenders selected cards.
    // Production default enableDomParking=false uses host.innerHTML=element.render().
    imports["/static/reuse/page-composer/index.js"] = {
        createPageComposer: (root, options) => {
            const render = (ids) => {
                if (refreshFailure) throw refreshFailure;
                for (const element of options.elements.filter(
                    (item) => !ids || ids.includes(item.id),
                )) {
                    let card = root.querySelector(
                        `[data-composer-element="${element.id}"]`,
                    );
                    if (!card) {
                        card = document.createElement("section");
                        card.dataset.composerElement = element.id;
                        root.append(card);
                    }
                    card.innerHTML = element.render();
                    if (element.id === "hero")
                        rendered.push({
                            name: card.querySelector(
                                ".profile-hero-display-name",
                            )?.textContent,
                            src: card
                                .querySelector(".profile-hero-avatar-img")
                                ?.getAttribute("src"),
                        });
                }
                options.onRender();
            };
            return {
                init: async () => {
                    root.replaceChildren();
                    render();
                },
                refresh: () => render(),
                refreshElements: render,
            };
        },
    };
    const app = await importTestModule(
        new URL("app.js", source),
        imports,
        globals,
    );
    const controllers = [];
    const mount = async (path = "/profile") => {
        window.history.replaceState(null, "", path);
        const page = new window.AbortController();
        controllers.push(page);
        await app.mount(document.querySelector("#app"), {
            signal: page.signal,
        });
        return page;
    };
    context.after(() => {
        for (const page of controllers) page.abort();
        host.controller.abort();
        window.close();
    });
    return {
        window,
        document,
        popup,
        host,
        app,
        mount,
        lifecycle,
        providerCatalog,
        logs,
        requests,
        stages,
        revoked,
        notices,
        blobs,
        rendered,
        polls,
        setProfile: (value) => {
            profile = value;
        },
        setFollowers: (value) => {
            followers = value;
        },
        setMedia: (value) => {
            media = value;
        },
        setOverride: (value) => {
            override = value;
        },
        setRefreshFailure: (error) => {
            refreshFailure = error;
        },
        setTranslationFailure: (key) => {
            translationFailure = key;
        },
        setProviderId: (value) => {
            providerId = value;
        },
        setCropWork: (value) => {
            cropWork = value;
        },
        selectImage: async (kind) => {
            const inputs = [...document.querySelectorAll('input[type="file"]')];
            const input = inputs[kind === "avatar" ? 0 : 1];
            Object.defineProperty(input, "files", {
                configurable: true,
                value: [
                    new File(["source-image"], "fixture.png", {
                        type: "image/png",
                    }),
                ],
            });
            input.dispatchEvent(new window.Event("change"));
            await settle();
        },
        setSyncWork: (value) => {
            syncWork = value;
        },
        image: () => document.querySelector(".profile-hero-avatar-img"),
        banner: () => document.querySelector(".profile-hero-banner-img"),
        sync: async () => {
            document.querySelector(".profile-provider-sync-btn").click();
            await Promise.all([...pendingActions]);
            await settle();
        },
        poll: async () => {
            await polls.at(-1).task();
            await settle();
        },
    };
}
