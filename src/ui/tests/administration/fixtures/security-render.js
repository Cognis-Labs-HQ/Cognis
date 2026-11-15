import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { JSDOM } from "jsdom";

const root = new URL("../../../../../", import.meta.url);
const actualFiles = new Set([
    "src/ui/app/administration/security.js",
    "src/ui/app/administration/render-components.js",
    "src/ui/reuse/collapsible-section-composer.js",
    "src/ui/reuse/escape-html.js",
    "src/ui/reuse/info-tooltip.js",
    "src/ui/reuse/duration-input.js",
    "src/ui/reuse/trusted-domains.js",
    "src/ui/reuse/i18n.js",
    "src/ui/reuse/ui-language-state.js",
]);

export const controlKeys = {
    "security-login-session-timeout":
        "ui.app.admin.security.login_session_timeout_label",
    "security-login-session-timeout-unit": "ui.reuse.unit",
    "security-user-validation-mode":
        "ui.app.admin.security.user_validation_mode_label",
    "security-require-teacher-approval":
        "ui.app.admin.security.require_teacher_approval_label",
    "security-enforce-tfa-for-all-users":
        "ui.app.admin.security.tfa_enforce_all_users_label",
};

export function associatedName(input) {
    const references = input.getAttribute("aria-labelledby");
    const elements = references
        ? references
              .split(/\s+/)
              .map((id) => input.ownerDocument.getElementById(id))
        : [...input.labels];
    assert.ok(elements.every(Boolean), "Every name reference resolves");
    return elements
        .map((element) => element.textContent.trim())
        .filter(Boolean)
        .join(" ");
}

export async function securityRenderFixture(
    context,
    locale = "en",
    options = {},
) {
    const { window } = new JSDOM(
        '<!doctype html><head></head><body><main id="security"></main><section id="components"></section></body>',
        {
            url: "https://fixture.invalid/administration",
            pretendToBeVisual: true,
        },
    );
    context.after(() => window.close());
    const requests = [];
    const englishStrings = new Map();
    const unexpected = (name) => () =>
        assert.fail(`Render-only dependency invoked: ${name}`);
    const apiFetch = (...args) => {
        requests.push(args);
        assert.fail(
            "Security rendering must not initialize, read, or save settings",
        );
    };
    const fetch = async (url) => {
        const match = String(url).match(
            /^\/static\/(languages|gateways\/tfa\/languages)\/(en|de|id|ja)\/strings\.xml$/,
        );
        assert.ok(match, `Explicit public catalog request: ${url}`);
        const directory =
            match[1] === "languages"
                ? "src/ui/languages"
                : "src/gateways/tfa/ui/languages";
        const document = new window.DOMParser().parseFromString(
            await readFile(
                new URL(`${directory}/${match[2]}/strings.xml`, root),
                "utf8",
            ),
            "application/xml",
        );
        for (const element of document.querySelectorAll("string")) {
            const key = element.getAttribute("name");
            if (match[2] === "en") englishStrings.set(key, element.textContent);
            if ((options.omitKeys?.[match[2]] ?? []).includes(key))
                element.remove();
            if ((options.emptyKeys?.[match[2]] ?? []).includes(key))
                element.textContent = "";
        }
        return new Response(
            new window.XMLSerializer().serializeToString(document),
        );
    };
    const globals = {
        window,
        document: window.document,
        localStorage: window.localStorage,
        navigator: window.navigator,
        URL,
        Response,
        fetch,
        console,
        setTimeout,
        clearTimeout,
    };
    for (const name of [
        "DOMParser",
        "Element",
        "HTMLElement",
        "HTMLButtonElement",
        "HTMLInputElement",
        "HTMLSelectElement",
        "AbortController",
        "AbortSignal",
    ])
        globals[name] = window[name];
    const runtime = vm.createContext(globals);
    const fakes = new Map([
        [
            "src/ui/reuse/api-client.js",
            {
                apiFetch,
                requestTargetsApi: (url) => String(url).startsWith("/api/"),
            },
        ],
        [
            "src/ui/reuse/ui-ctx.js",
            {
                uiCtx: {
                    capabilities: { get: unexpected("capability lookup") },
                },
            },
        ],
        [
            "provider:password-policy",
            {
                normalizePasswordPolicy: unexpected("normalizePasswordPolicy"),
                parsePolicyCount: unexpected("parsePolicyCount"),
            },
        ],
    ]);
    const modules = new Map();
    async function load(relative) {
        if (modules.has(relative)) return modules.get(relative);
        let module;
        if (fakes.has(relative)) {
            const exported = fakes.get(relative);
            module = new vm.SyntheticModule(
                Object.keys(exported),
                function () {
                    for (const [key, value] of Object.entries(exported))
                        this.setExport(key, value);
                },
                { context: runtime, identifier: relative },
            );
        } else {
            assert.ok(
                actualFiles.has(relative),
                `Explicit actual ESM boundary: ${relative}`,
            );
            const url = new URL(relative, root);
            module = new vm.SourceTextModule(await readFile(url, "utf8"), {
                context: runtime,
                identifier: relative,
                initializeImportMeta(meta) {
                    meta.url = url.href;
                },
            });
        }
        modules.set(relative, module);
        return module;
    }
    async function entry(relative) {
        const module = await load(relative);
        if (module.status === "unlinked") {
            await module.link((specifier, importer) =>
                load(
                    specifier === "/static/gateways/auth/password-policy.js"
                        ? "provider:password-policy"
                        : path.posix.normalize(
                              path.posix.join(
                                  path.posix.dirname(importer.identifier),
                                  specifier,
                              ),
                          ),
                ),
            );
        }
        if (module.status === "linked") await module.evaluate();
        return module.namespace;
    }
    const { createI18n, extendI18n } = await entry("src/ui/reuse/i18n.js");
    const i18n = await extendI18n(
        await createI18n({
            preferredLanguages: [locale],
            persistLocale: false,
        }),
        "/static/gateways/tfa/languages",
    );
    const securityRoot = window.document.querySelector("#security");
    const security = (
        await entry("src/ui/app/administration/security.js")
    ).initSecuritySection(securityRoot, { i18n });
    const render = () => {
        securityRoot.innerHTML = security.renderContent();
    };
    const { renderComponentsContent } = await entry(
        "src/ui/app/administration/render-components.js",
    );
    const { escapeHtml } = await entry("src/ui/reuse/escape-html.js");
    const componentsRoot = window.document.querySelector("#components");
    const renderRows = (locked = false) => {
        componentsRoot.innerHTML = renderComponentsContent(
            [],
            [
                {
                    id: "fixture",
                    name: "Synthetic gateway",
                    version: "1.0.0",
                    status: "active",
                    hasAdapters: true,
                    required: locked,
                },
            ],
            [
                {
                    id: "fixture-adapter",
                    _gatewayId: "fixture",
                    name: "Synthetic adapter",
                    version: "1.0.0",
                    active: true,
                    schema: [],
                    locked,
                },
            ],
            { i18n, escapeHtml },
        );
    };
    const styles = [
        "src/ui/styles/reuse/page-sections.css",
        "src/ui/styles/page-builder/admin.css",
    ];
    for (const filename of options.reverseStyles ? styles.reverse() : styles) {
        const style = window.document.createElement("style");
        style.textContent = await readFile(new URL(filename, root), "utf8");
        window.document.head.append(style);
    }
    context.after(() => assert.deepEqual(requests, []));
    return {
        window,
        i18n,
        englishStrings,
        securityRoot,
        componentsRoot,
        security,
        render,
        renderRows,
        requests,
    };
}
