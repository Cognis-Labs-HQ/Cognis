import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";
import { formatTemplate } from "../../../../ui/reuse/format-template.js";

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((done, fail) => {
        resolve = done;
        reject = fail;
    });
    return { promise, resolve, reject };
}

export const settle = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
};

export const response = (data = [], status = 200) =>
    Response.json({ data }, { status });
export const broadcasts = ["A", "B"].map((id, index) => ({
    id,
    title: `Broadcast ${id}`,
    message: "Synthetic content",
    targetRoles: ["user"],
    displayMode: "bar",
    enabled: index === 0,
    requireAcknowledgement: true,
}));

export async function environment(kind = "notifications", options = {}) {
    const dom = new JSDOM(
        '<!doctype html><html><head><link rel="stylesheet" href="/static/gateways/notify/broadcast-admin.css"></head><body><main></main></body></html>',
        { url: "https://fixture.invalid/administration" },
    );
    const { window } = dom;
    const { document, localStorage } = window;
    localStorage.setItem("cognis_account", "synthetic-admin");
    Object.defineProperty(document.querySelector("link"), "sheet", {
        value: {},
    });
    const root = document.querySelector("main");
    const requests = [];
    const notices = [];
    const dirty = [];
    const logs = [];
    let handler = options.intercept;
    const apiFetch = async (url, init = {}) => {
        const request = {
            url,
            method: init.method ?? "GET",
            body: init.body ? JSON.parse(init.body) : undefined,
            signal: init.signal,
        };
        requests.push(request);
        if (request.method !== "GET") {
            assert.equal(request.method, "POST");
            assert.match(
                url,
                /^\/api\/v1\/notify\/(send|broadcasts(?:\/[AB]\/(?:enable|disable))?)$/,
            );
        }
        const result = await handler?.(request);
        if (result !== undefined) return result;
        if (request.method !== "GET") return response();
        if (url === "/api/v1/users")
            return response([
                { username: "synthetic-user", role: "user" },
                { username: "second-user", role: "teacher" },
            ]);
        if (url === "/api/v1/notify/categories")
            return response([
                { id: "system", label: "System" },
                { id: "study", label: "Study" },
            ]);
        if (url === "/api/v1/notify/broadcasts")
            return response(options.rows ?? broadcasts);
        if (url === "/api/v1/system/security")
            return response({ trustedDomains: ["trusted.invalid"] });
        if (/^\/api\/v1\/notify\/broadcasts\/[AB]\/states$/.test(url))
            return response([]);
        throw new Error(`Unexpected API request: ${url}`);
    };
    const fetch = async (url) => {
        let file;
        const catalog = String(url).match(
            /^\/static\/(languages|gateways\/notify\/languages)\/(en|de|id|ja)\/strings\.xml$/,
        );
        if (catalog) {
            file =
                catalog[1] === "languages"
                    ? new URL(
                          `../../../../ui/languages/${catalog[2]}/strings.xml`,
                          import.meta.url,
                      )
                    : new URL(
                          `../../ui/languages/${catalog[2]}/strings.xml`,
                          import.meta.url,
                      );
            let text = readFileSync(file, "utf8");
            for (const key of options.omitKeys?.[catalog[2]] ?? []) {
                text = text.replace(
                    new RegExp(
                        `<string name="${key.replaceAll(".", "\\.")}"[^>]*>[^<]*<\\/string>`,
                    ),
                    "",
                );
            }
            return new Response(text);
        }
        const template = String(url).match(
            /^\/static\/gateways\/notify\/templates\/([a-z-]+\.html)$/,
        );
        if (template)
            return new Response(
                readFileSync(
                    new URL(
                        `../../ui/templates/${template[1]}`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
            );
        throw new Error(`Unexpected static request: ${url}`);
    };
    const globals = {
        window,
        document,
        localStorage,
        navigator: window.navigator,
        DOMParser: window.DOMParser,
        Element: window.Element,
        HTMLElement: window.HTMLElement,
        HTMLButtonElement: window.HTMLButtonElement,
        HTMLInputElement: window.HTMLInputElement,
        HTMLSelectElement: window.HTMLSelectElement,
        HTMLTextAreaElement: window.HTMLTextAreaElement,
        HTMLTableRowElement: window.HTMLTableRowElement,
        AbortController: window.AbortController,
        AbortSignal: window.AbortSignal,
        URL,
        fetch,
        console,
    };
    const uiModule = (file, imports = {}) =>
        loadTestModule(
            new URL(`../../../../ui/reuse/${file}.js`, import.meta.url),
            imports,
            globals,
        );
    const languageState = uiModule("ui-language-state");
    const i18nModule = uiModule("i18n", {
        "./ui-language-state.js": languageState,
        "./api-client.js": {
            apiFetch,
            requestTargetsApi: (path) => path.startsWith("/api/"),
        },
    });
    const i18n = await i18nModule.extendI18n(
        await i18nModule.createI18n({
            preferredLanguages: [options.locale ?? "en"],
            persistLocale: false,
        }),
        "/static/gateways/notify/languages",
    );
    const lifecycle = loadTestModule(
        new URL("../../ui/reuse/admin-draft.js", import.meta.url),
        {
            "/static/reuse/offline-identity.js": uiModule("offline-identity"),
            "/static/reuse/ui-ctx.js": {
                uiCtx: {
                    capabilities: {
                        get: (name) => {
                            assert.equal(name, "ui:log");
                            return (...args) => logs.push(args);
                        },
                    },
                },
            },
        },
        globals,
    );
    const imports = {
        "./reuse/admin-draft.js": lifecycle,
        "./reuse/templates.js": loadTestModule(
            new URL("../../ui/reuse/templates.js", import.meta.url),
            {},
            globals,
        ),
        "/static/reuse/access-role.js": uiModule("access-role"),
        "/static/reuse/page-styles.js": uiModule("page-styles"),
        "/static/reuse/trusted-domains.js": uiModule("trusted-domains"),
        "/static/reuse/markdown-renderer.js": { renderMarkdown: escapeHtml },
        "/static/reuse/timestamp.js": { formatDateTime: String },
        "/static/reuse/format-template.js": { formatTemplate },
    };
    const filename =
        kind === "notifications" ? "admin-section" : "broadcast-admin-section";
    const module = loadTestModule(
        new URL(`../../ui/${filename}.js`, import.meta.url),
        imports,
        globals,
    );
    const section = module.createAdminSection({
        i18n,
        apiFetch,
        escapeHtml,
        showToast: (message, detail) => notices.push({ message, ...detail }),
        onDirtyChange: (id, value) => dirty.push({ id, value }),
    });
    await section.dataReady;
    function render() {
        root.innerHTML = section.subComposerOptions.elements[0].render();
        section.subComposerOptions.onRender(root);
    }
    if (options.mount !== false) render();
    function field(name, value) {
        return root.querySelector(
            `[name="${name}"]${value === undefined ? "" : `[value="${value}"]`}`,
        );
    }
    function edit(name, value, choice) {
        const input = field(name, choice);
        assert(input, name);
        if (typeof value === "boolean") input.checked = value;
        else input.value = value;
        input.dispatchEvent(new window.Event("input", { bubbles: true }));
        input.dispatchEvent(new window.Event("change", { bubbles: true }));
    }
    return {
        window,
        root,
        section,
        i18n,
        notices,
        dirty,
        logs,
        requests,
        field,
        edit,
        render,
        intercept: (next) => {
            handler = next;
        },
        writes: () => requests.filter((request) => request.method !== "GET"),
        button: () =>
            root.querySelector(
                kind === "notifications"
                    ? ".notif-debug-send"
                    : ".notif-broadcast-create",
            ),
        fill() {
            if (kind === "notifications") {
                edit("debugSubject", "Synthetic title");
                edit("debugBody", "Synthetic message");
            } else {
                edit("broadcastTitle", "Synthetic title");
                edit("broadcastMessage", "Synthetic message");
                edit("broadcastRoles", true, "user");
            }
        },
        unmount() {
            section.subComposerOptions.onUnmount();
            root.replaceChildren();
        },
        close() {
            section.subComposerOptions.onUnmount();
            dom.window.close();
        },
    };
}
