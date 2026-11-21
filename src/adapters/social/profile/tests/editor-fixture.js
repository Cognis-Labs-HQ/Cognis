import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { popupFixture } from "../../../../ui/reuse/tests/popup/dom-fixture.js";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";
import {
    importTestModule,
    loadTestModule,
} from "../../../../tooling/reuse/test-module.ts";
import { loadProfileOfflineClient } from "./reuse/offline-client.js";
import { createProfileEditFields } from "../ui/profile-edit-fields.js";
import * as config from "../ui/profile-config.js";
import * as followButtons from "../ui/follow-buttons.js";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

export const originalProfile = {
    accountId: "learner",
    handle: "learner",
    role: "user",
    displayName: "Original",
    bio: "Original bio",
    location: "Original location",
    website: "https://example.com",
    visibility: "community",
};
export const editedFields = {
    displayName: "名前 Updated",
    bio: "First line 日本語\nSecond line 🌱",
    location: "",
    website: "",
    visibility: "friends",
};
export const settle = () => new Promise((resolve) => setImmediate(resolve));

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((accept, fail) => {
        resolve = accept;
        reject = fail;
    });
    return { promise, resolve, reject };
}

export async function editorFixture(
    context,
    { send, refreshError, storageError, navbarError } = {},
) {
    const popup = await popupFixture(context);
    const { window, document } = popup;
    window.history.replaceState(null, "", "/profile");
    document.body.insertAdjacentHTML("beforeend", '<main id="app"></main>');
    const requests = [];
    let persisted = structuredClone(originalProfile);
    const host = createOfflineClientFixture(async (path, options = {}) => {
        if (options.method === "PATCH") {
            const fields = JSON.parse(options.body);
            requests.push(fields);
            return send
                ? send(fields, host)
                : Response.json({
                      data: (persisted = { ...persisted, ...fields }),
                  });
        }
        if (path.endsWith("/profile"))
            return Response.json({ data: persisted });
        if (path.includes("/preferences/"))
            return Response.json({ data: null });
        return Response.json({ data: [] });
    });
    context.after(() => host.controller.abort());
    const client = loadProfileOfflineClient(host);
    client.registerProfileOfflineClient(host.ctx);
    const stages = [];
    for (const stage of ["before", "execute", "after"])
        host.ctx.extendFlow(
            "social:profile:request",
            stage,
            { id: `test:editor:${stage}` },
            () => stages.push(stage),
        );
    const notices = [];
    const logs = [];
    const writes = [];
    const refreshed = [];
    const renderedProfiles = [];
    const navbarRefreshes = [];
    const globals = {
        ...host.globals,
        window,
        document,
        ...Object.fromEntries(
            [
                "HTMLElement",
                "Element",
                "HTMLInputElement",
                "HTMLTextAreaElement",
                "HTMLSelectElement",
                "HTMLButtonElement",
                "HTMLFormElement",
                "RadioNodeList",
                "AbortController",
                "AbortSignal",
                "MutationObserver",
            ].map((name) => [name, window[name]]),
        ),
        CSS: { escape: (value) => value },
        console: {
            info: (...args) => logs.push(["info", ...args]),
            error: (...args) => logs.push(["error", ...args]),
        },
        localStorage: {
            getItem: host.globals.localStorage.getItem,
            setItem: (...args) => {
                if (storageError) throw storageError;
                writes.push(args);
            },
        },
    };
    const language = await readFile(
        new URL("../ui/languages/en/strings.xml", import.meta.url),
        "utf8",
    );
    const shared = await readFile(
        new URL("../../../../ui/languages/en/strings.xml", import.meta.url),
        "utf8",
    );
    const dictionary = new Map(
        [
            ...new window.DOMParser()
                .parseFromString(
                    `<root>${language.replace(/<\?xml[^>]*>/g, "")}${shared.replace(/<\?xml[^>]*>/g, "")}</root>`,
                    "application/xml",
                )
                .querySelectorAll("string"),
        ].map((element) => [element.getAttribute("name"), element.textContent]),
    );
    const i18n = {
        t: (key) => {
            assert.ok(dictionary.get(key), key);
            return dictionary.get(key);
        },
    };
    const formBuilder = loadTestModule(
        new URL("../../../../ui/reuse/form-builder.js", import.meta.url),
        {
            "./secret-visibility-toggle.js": loadTestModule(
                new URL(
                    "../../../../ui/reuse/secret-visibility-toggle.js",
                    import.meta.url,
                ),
                {},
                globals,
            ),
        },
        globals,
    );
    const popupModule = await popup.importModule("popup.js");
    const uiClient = loadTestModule(
        new URL("../ui/client.js", import.meta.url),
        { "./offline-client.js": client },
        globals,
    );
    const boundaries = {
        ...host.imports,
        "./client.js": uiClient,
        "./offline-client.js": client,
        "./profile-edit-fields.js": { createProfileEditFields },
        "/static/reuse/form-builder.js": formBuilder,
        "/static/reuse/popup.js": popupModule,
        "/static/reuse/escape-html.js": { escapeHtml },
        "/static/reuse/i18n.js": {
            createI18n: async () => i18n,
            applyDocumentTitle: (language, key) => {
                document.title = language.t(key);
            },
        },
        "/static/reuse/toast.js": {
            showToast: (message, options) =>
                notices.push({ message, ...options }),
        },
        "/static/layouts/dashboard-layout.js": {
            updateNavbarAvatar: async () => {
                navbarRefreshes.push(true);
                if (navbarError) throw navbarError;
            },
        },
    };
    boundaries["./profile-save.js"] = loadTestModule(
        new URL("../ui/profile-save.js", import.meta.url),
        boundaries,
        globals,
    );
    boundaries["./profile-render.js"] = {
        renderComposerMarkdownPreview: (value) => escapeHtml(value),
        renderHero: ({ profile }) => {
            renderedProfiles.push(structuredClone(profile));
            return '<button class="profile-hero-edit-btn">Edit Profile</button>';
        },
        ...Object.fromEntries(
            [
                "renderFollowers",
                "renderFollowing",
                "renderSocialLinks",
                "renderSuggestedContacts",
                "renderPosts",
                "renderNewPost",
                "renderFollowRequests",
            ].map((name) => [
                name,
                () => `<section data-fixture-card="${name}"></section>`,
            ]),
        ),
        createPostFormBuilderForVisibility: () =>
            assert.fail("Unexpected post editor"),
    };
    boundaries["./profile-api-loaders.js"] = loadTestModule(
        new URL("../ui/profile-api-loaders.js", import.meta.url),
        {
            "./offline-client.js": client,
            "./file-namespaces.js": await import("../ui/file-namespaces.js"),
        },
        globals,
    );
    boundaries["./profile-editor.js"] = loadTestModule(
        new URL("../ui/profile-editor.js", import.meta.url),
        boundaries,
        globals,
    );
    let directMount;
    const app = await importTestModule(
        new URL("../ui/app.js", import.meta.url),
        {
            ...boundaries,
            "./guides.js": await import("../ui/guides.js"),
            "./profile-config.js": config,
            "./follow-buttons.js": followButtons,
            "./image-crop.js": await import("../ui/image-crop.js"),
            "./profile-image-selection.js": loadTestModule(
                new URL("../ui/profile-image-selection.js", import.meta.url),
                {},
                globals,
            ),
            "./profile-image-upload.js": {
                createProfileImageUploadActions: () => ({
                    revokeProfileBlobUrls: () => {
                        assert.equal(document.querySelector("img"), null);
                    },
                }),
            },
            "./profile-post-actions.js": {
                createProfilePostActions: () => ({}),
            },
            "./availability.js": {
                hydrateAvailabilityIndicators: async (root) =>
                    assert.ok(root.isConnected),
            },
            "./search-groups.js": {
                registerProfilePostSearchIndex: (read) =>
                    assert.equal(typeof read, "function"),
            },
            "./follower-poller.js": {
                createFollowerCountPoller: () => ({
                    start: () => stages.push("poll:start"),
                    stop: () => stages.push("poll:stop"),
                }),
                loadSocialConnectionList: () =>
                    assert.fail("Unexpected polling"),
            },
            "./provider-sync.js": {
                resolveExternalProfileProvider: () => null,
                bindExternalProfileSync: () =>
                    assert.fail("Unexpected external synchronization"),
            },
            "/static/reuse/app-router.js": {
                navigateTo: () => assert.fail("Unexpected redirect"),
            },
            "/static/reuse/page-entry.js": {
                mountWhenDirect: async (mount) => {
                    directMount = mount;
                },
            },
            "/static/reuse/page-composer/index.js": {
                createPageComposer: (root, options) => {
                    const render = (ids) => {
                        for (const element of options.elements.filter(
                            (item) => !ids || ids.includes(item.id),
                        )) {
                            const old = root.querySelector(
                                `[data-element="${element.id}"]`,
                            );
                            const card = document.createElement("div");
                            card.dataset.element = element.id;
                            card.innerHTML = element.render();
                            if (old) old.replaceWith(card);
                            else root.appendChild(card);
                        }
                    };
                    return {
                        init: async () => {
                            root.replaceChildren();
                            render();
                            options.onRender();
                        },
                        refreshElements: (ids) => {
                            if (refreshError) throw refreshError;
                            refreshed.push([...ids]);
                            render(ids);
                        },
                        refresh: () => {
                            render();
                            options.onRender();
                        },
                    };
                },
            },
        },
        globals,
    );
    assert.equal(directMount, app.mount);
    const page = new window.AbortController();
    context.after(() => page.abort());
    await app.mount(document.querySelector("#app"), { signal: page.signal });
    const active = () => [
        ...document.querySelectorAll(".popup-overlay[data-popup-active]"),
    ];
    async function open() {
        const button = document.querySelector(".profile-hero-edit-btn");
        button.focus();
        button.click();
        await settle();
        return active().find((overlay) =>
            overlay.querySelector(".profile-edit-form"),
        );
    }
    function fill(overlay, values = editedFields) {
        for (const [name, value] of Object.entries(values)) {
            const input = overlay.querySelector(`[name="${name}"]`);
            input.value = value;
            input.dispatchEvent(new window.Event("input", { bubbles: true }));
        }
    }
    async function click(overlay, action) {
        overlay.querySelector(`[data-popup-action="${action}"]`).click();
        await settle();
    }
    const values = (overlay) =>
        Object.fromEntries(
            [
                ...overlay.querySelectorAll(
                    "input[name],textarea[name],select[name]",
                ),
            ].map((input) => [input.name, input.value]),
        );
    return {
        ...popup,
        host,
        page,
        app,
        open,
        active,
        fill,
        click,
        values,
        requests,
        notices,
        logs,
        writes,
        refreshed,
        renderedProfiles,
        navbarRefreshes,
        stages,
        i18n,
    };
}
