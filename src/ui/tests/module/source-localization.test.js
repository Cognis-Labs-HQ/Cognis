import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { installI18nEnvironment } from "../../reuse/tests/fixtures/i18n-environment.js";
import { createFormBuilder } from "../../reuse/form-builder.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { workerFixture } from "../fixtures/offline-worker.js";

const catalogBase = "/static/app/modules/languages";
const hintKey = "ui.app.modules.credential_shared_hint";
const hints = {
    en: "Stored credentials are shared by administrators and used by automatic scans. Their saved values cannot be retrieved or revealed. Leave the field blank to keep the current credential.",
    de: "Gespeicherte Zugangsdaten stehen allen Administratoren und automatischen Scans zur Verfügung. Ihre Werte können nicht abgerufen oder angezeigt werden. Lassen Sie das Feld leer, um die aktuellen Zugangsdaten beizubehalten.",
    id: "Kredensial tersimpan digunakan bersama oleh administrator dan pemindaian otomatis. Nilainya tidak dapat diambil atau ditampilkan. Kosongkan bidang untuk mempertahankan kredensial saat ini.",
    ja: "保存された認証情報は管理者全員と自動スキャンで共有されます。保存値を取得または表示することはできません。現在の値を維持するには空欄のままにしてください。",
};

function readCatalogXml(path, replacements = {}) {
    const match = String(path).match(
        /^\/static\/(app\/modules\/)?languages\/(en|de|id|ja)\/strings\.xml$/,
    );
    assert.ok(match, `Unexpected catalog request: ${path}`);
    let xml = readFileSync(
        new URL(
            `../../${match[1] ?? ""}languages/${match[2]}/strings.xml`,
            import.meta.url,
        ),
        "utf8",
    );
    if (match[1] && Object.hasOwn(replacements, match[2])) {
        xml = xml.replace(
            /<string name="ui.app.modules.credential_shared_hint">[^<]*<\/string>/,
            replacements[match[2]] === null
                ? ""
                : `<string name="${hintKey}">${replacements[match[2]]}</string>`,
        );
    }
    return xml;
}

async function loadCatalog(context, locale, replacements = {}, respond) {
    const previous = new Map(
        ["localStorage", "window", "document", "DOMParser", "fetch"].map(
            (name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)],
        ),
    );
    context.after(() => {
        for (const [name, descriptor] of previous) {
            if (descriptor) Object.defineProperty(globalThis, name, descriptor);
            else delete globalThis[name];
        }
    });
    const environment = installI18nEnvironment((path) => {
        return respond
            ? respond(path)
            : new Response(readCatalogXml(path, replacements));
    });
    const { createI18n } = await import(
        `../../reuse/i18n.js?source-localization=${crypto.randomUUID()}`
    );
    const i18n = await createI18n({
        preferredLanguages: [locale],
        componentStringBaseUrls: [catalogBase],
        persistLocale: false,
    });
    return { i18n, requests: environment.requests };
}

function sourcePopup(i18n, { configured = true, trusted = false } = {}) {
    const owner = new AbortController();
    const source = {
        uuid: "6931e77f-f740-4db7-9f7c-5809f44255ee",
        name: "Example",
        provider: "github",
        namespace: "example",
        baseUrl: "https://api.github.com",
        scanPrivateRepos: true,
        credentialConfigured: configured,
        trusted,
    };
    const forms = [];
    const tooltips = [];
    const pages = [];
    const add = {
        addEventListener(_type, handler) {
            this.click = handler;
        },
    };
    const edit = {
        dataset: { editSource: source.uuid },
        addEventListener(_type, handler) {
            this.click = handler;
        },
    };
    const overlay = {
        querySelector: (selector) =>
            selector === "[data-add-source]" ? add : null,
        querySelectorAll: (selector) =>
            selector === "[data-edit-source]" ? [edit] : [],
    };
    let popup;
    let pageApi;
    const { openMarketplaceSettings } = loadTestModule(
        new URL("../../app/modules/source-settings.js", import.meta.url),
        {
            "../../reuse/form-builder.js": {
                createFormBuilder(ctx, schema) {
                    forms.push(schema);
                    const builder = createFormBuilder(ctx, schema);
                    return { render: builder.render, attach: () => null };
                },
            },
            "../../reuse/escape-html.js": { escapeHtml },
            "../../reuse/info-tooltip.js": {
                renderInfoTooltip(text, ariaLabel) {
                    tooltips.push({ text, ariaLabel });
                    return "<span data-tooltip-contract></span>";
                },
            },
            "../../reuse/toast.js": {
                showToast: () => assert.fail("Unexpected notice"),
            },
            "../../reuse/popup.js": {
                async openPopup(options) {
                    popup = options;
                    assert.equal(options.signal, owner.signal);
                    pageApi = {
                        pageId: undefined,
                        setPage(id) {
                            const page = options.pages.find(
                                (entry) => entry.id === id,
                            );
                            const html = page.body();
                            pages.push({ id, html });
                            this.pageId = id;
                            options.onOpen(overlay, () => {}, this);
                        },
                    };
                    pageApi.setPage(options.initialPageId);
                },
            },
            "./api.js": {
                loadModuleSources: async () => [source],
                loadModuleMarketplaceSettings: async () => ({
                    recommendedModulesUrl: "https://example.test/modules.json",
                }),
                removeModuleSource: () =>
                    assert.fail("Unexpected source removal"),
                saveModuleMarketplaceSettings: () =>
                    assert.fail("Unexpected settings write"),
                saveModuleSource: () =>
                    assert.fail("Unexpected credential write"),
            },
        },
    );
    return {
        forms,
        pages,
        tooltips,
        add: () => add.click(),
        edit: () => edit.click(),
        back: () => popup.onAction("back", overlay, pageApi),
        open: (initialPage = "settings") =>
            openMarketplaceSettings(i18n, initialPage, {
                signal: owner.signal,
            }),
    };
}

for (const locale of Object.keys(hints)) {
    for (const configured of [false, true]) {
        test(`source popup resolves ${locale} copy through add, back and edit (stored=${configured})`, async (context) => {
            const { i18n, requests } = await loadCatalog(context, locale);
            const host = sourcePopup(i18n, { configured });
            assert.equal(i18n.locale, locale);
            assert.equal(i18n.t(hintKey), hints[locale]);
            for (let opening = 0; opening < 2; opening++) {
                await host.open();
                host.add();
                assert.equal(await host.back(), false);
                host.edit();
                const form = host.forms.at(-1);
                const token = form.fields.find(
                    (field) => field.name === "token",
                );
                assert.equal(token.value, "");
                assert.equal(token.required, !configured);
                assert.equal(
                    token.placeholder,
                    configured
                        ? i18n.t("ui.app.modules.credential_stored")
                        : "",
                );
                assert.equal(
                    token.infoTooltip.text,
                    `${i18n.t("ui.app.modules.pat_permissions_hint")} ${hints[locale]}`,
                );
                assert.equal(
                    host.tooltips.at(-1).ariaLabel,
                    i18n.t("ui.reuse.more_information"),
                );
                assert.ok(
                    host.pages
                        .at(-1)
                        .html.includes(
                            escapeHtml(i18n.t("ui.app.modules.pat")),
                        ),
                );
                assert.match(host.pages.at(-1).html, /type="password"/);
                assert.equal(
                    form.fields.some(
                        (field) => field.name === "clearCredential",
                    ),
                    configured,
                );
                assert.equal(await host.back(), false);
            }
            assert.deepEqual(
                host.pages.map((page) => page.id),
                [
                    "settings",
                    "editor",
                    "settings",
                    "editor",
                    "settings",
                    "settings",
                    "editor",
                    "settings",
                    "editor",
                    "settings",
                ],
            );
            for (const expectedLocale of new Set(["en", locale])) {
                assert.ok(
                    requests.some(
                        ({ path }) =>
                            path ===
                            `${catalogBase}/${expectedLocale}/strings.xml`,
                    ),
                );
            }
        });
    }
}

test("trusted source editing retains translated credential help and locked identity fields", async (context) => {
    const { i18n } = await loadCatalog(context, "en");
    const host = sourcePopup(i18n, { trusted: true });
    await host.open();
    host.edit();
    const form = host.forms.at(-1);
    for (const name of ["name", "provider", "namespace", "baseUrl"]) {
        assert.equal(
            form.fields.find((field) => field.name === name).disabled,
            true,
        );
    }
    assert.ok(host.tooltips.at(-1).text.endsWith(hints.en));
});

for (const replacement of [null, " "]) {
    test(`source editor uses English when preferred credential hint is ${replacement === null ? "missing" : "empty"}`, async (context) => {
        const { i18n } = await loadCatalog(context, "de", { de: replacement });
        const host = sourcePopup(i18n);
        await host.open();
        host.edit();
        assert.ok(host.tooltips.at(-1).text.endsWith(hints.en));
        assert.equal(i18n.t(hintKey), hints.en);
        assert.equal(i18n.locale, "de");
    });

    test(`source editor fails explicitly when preferred and English hints are ${replacement === null ? "missing" : "empty"}`, async (context) => {
        const { i18n } = await loadCatalog(context, "de", {
            de: replacement,
            en: replacement,
        });
        const host = sourcePopup(i18n);
        await host.open();
        assert.throws(() => host.edit(), {
            code: "missing_translation",
            key: hintKey,
        });
        assert.equal(host.pages.at(-1).id, "settings");
    });
}

test("direct source editor opening resolves the same credential catalog", async (context) => {
    const { i18n } = await loadCatalog(context, "ja");
    const host = sourcePopup(i18n);
    await host.open("editor");
    assert.equal(host.pages[0].id, "editor");
    assert.ok(host.tooltips.at(-1).text.endsWith(hints.ja));
});

test("a cached older catalog cannot hide current credential help from a fresh page resolver", async (context) => {
    const worker = workerFixture();
    const path = `${catalogBase}/en/strings.xml`;
    worker.serve(
        (url) =>
            new Response(readCatalogXml(new URL(url).pathname, { en: null })),
    );
    await worker.request(path);
    worker.serve((url) => new Response(readCatalogXml(new URL(url).pathname)));
    const { i18n } = await loadCatalog(context, "en", {}, (url) =>
        worker.request(url),
    );
    const host = sourcePopup(i18n);
    await host.open();
    host.edit();
    assert.ok(host.tooltips.at(-1).text.endsWith(hints.en));
    assert.equal(
        worker.requests.filter(({ url }) => url.endsWith(path)).length,
        2,
    );
});
