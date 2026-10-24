import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { resolveSettingsSetupRedirect } from "../../../app/settings/setup-requirement.js";

export async function loadSettingsMount({
    account,
    apiFetch,
    loadEditorAcknowledgement,
    createI18n,
}) {
    const source = await readFile(
        new URL("../../../app/settings/index.js", import.meta.url),
        "utf8",
    );
    const contracts = JSON.parse(
        await readFile(new URL("./imports.json", import.meta.url), "utf8"),
    );
    const redirects = [];
    const languageChanges = [];
    const renderBoundary = new Error("settings_render_boundary");
    let directMount;
    const context = vm.createContext({
        localStorage: { getItem: () => account() },
        window: {
            location: {
                pathname: "/settings",
                hash: "",
                replace: (url) => redirects.push(url),
            },
        },
    });
    const overrides = {
        apiFetch,
        loadEditorAcknowledgement,
        createI18n,
        readLanguagePriorityMode: () => "auto",
        readPreferredLanguages: () => ["en"],
        setPreferredLanguages: (languages, options) =>
            languageChanges.push({ languages, options }),
        resolveSettingsSetupRedirect,
        mountWhenDirect: async (handler) => {
            directMount = handler;
        },
        applyDocumentTitle: () => {
            throw renderBoundary;
        },
    };
    const module = new vm.SourceTextModule(source, { context });
    await module.link((specifier) => {
        const names = contracts[specifier];
        assert.ok(names, `explicit public contract for ${specifier}`);
        return new vm.SyntheticModule(
            names,
            function () {
                for (const name of names)
                    this.setExport(
                        name,
                        overrides[name] ??
                            (() => {
                                throw new Error(
                                    `unexpected startup dependency: ${specifier}:${name}`,
                                );
                            }),
                    );
            },
            { context },
        );
    });
    await module.evaluate();
    assert.equal(directMount, module.namespace.mount);
    return {
        mount: module.namespace.mount,
        redirects,
        languageChanges,
        renderBoundary,
    };
}

export function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((yes, no) => {
        resolve = yes;
        reject = no;
    });
    return { promise, resolve, reject };
}
