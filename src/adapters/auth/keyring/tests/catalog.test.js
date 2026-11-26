import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { installI18nEnvironment } from "../../../../tooling/reuse/i18n-environment.js";
import { showKeyringLifecycleToast } from "../ui/lifecycle-notifications.js";
import { loadKeyringI18n } from "../ui/resources.js";
import { notifications } from "./fixtures/lifecycle-toast.js";

test("guest keyring creation resolves its real catalog and lifecycle toast in every UI language", async (t) => {
    const originalLocation = Object.getOwnPropertyDescriptor(
        globalThis,
        "location",
    );
    Object.defineProperty(globalThis, "location", {
        configurable: true,
        value: { protocol: "https:" },
    });
    const hook = registerHooks({
        resolve(specifier, context, nextResolve) {
            if (specifier === "/static/reuse/toast.js")
                return {
                    url: new URL(
                        "./fixtures/lifecycle-toast.js",
                        import.meta.url,
                    ).href,
                    shortCircuit: true,
                };
            if (specifier === "/static/reuse/i18n.js")
                return {
                    url: new URL(
                        "../../../../ui/reuse/i18n.js",
                        import.meta.url,
                    ).href,
                    shortCircuit: true,
                };
            return nextResolve(specifier, context);
        },
    });
    t.after(() => {
        hook.deregister();
        if (originalLocation)
            Object.defineProperty(globalThis, "location", originalLocation);
        else delete globalThis.location;
    });
    const labels = {
        en: "Keyring created.",
        de: "Schlüsselbund erstellt.",
        id: "Keyring dibuat.",
        ja: "キーリングを作成しました。",
    };
    for (const [locale, label] of Object.entries(labels)) {
        let available = locale !== "en";
        const host = installI18nEnvironment((path) => {
            const match = /\/languages\/([^/]+)\/strings.xml$/.exec(path);
            assert.ok(match, `Unexpected translation request: ${path}`);
            if (!available && path.startsWith("/static/adapters/auth/keyring/"))
                return new Response("<html>Starting</html>");
            const url = path.startsWith("/static/adapters/auth/keyring/")
                ? new URL(
                      `../ui/languages/${match[1]}/strings.xml`,
                      import.meta.url,
                  )
                : new URL(
                      `../../../../ui/languages/${match[1]}/strings.xml`,
                      import.meta.url,
                  );
            return new Response(readFileSync(url, "utf8"));
        });
        host.storage.set("cognis_language_priority", JSON.stringify([locale]));
        host.storage.set("cognis_language_priority_mode", "manual");
        if (!available) {
            const unavailable = await loadKeyringI18n();
            assert.throws(() => unavailable.t("adapter.auth.keyring.created"), {
                code: "missing_translation",
            });
            available = true;
        }
        const i18n = await loadKeyringI18n();
        await showKeyringLifecycleToast(
            "adapter.auth.keyring.created",
            "success",
            loadKeyringI18n,
        );
        assert.deepEqual(notifications.at(-1), {
            message: label,
            variant: "success",
        });
        const xml = readFileSync(
            new URL(`../ui/languages/${locale}/strings.xml`, import.meta.url),
            "utf8",
        );
        for (const [, key] of xml.matchAll(/<string name="([^"]+)"/g))
            assert.ok(i18n.t(key).trim(), `${locale}: ${key}`);
    }
});
