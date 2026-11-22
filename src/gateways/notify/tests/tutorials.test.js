import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mountProvider } from "../ui/tutorials.js";

const titles = {
    en: "Notification Preferences",
    de: "Benachrichtigungseinstellungen",
    id: "Preferensi Notifikasi",
    ja: "通知の設定",
};

for (const [locale, title] of Object.entries(titles)) {
    test(`the Notify provider supplies its own complete ${locale} tutorial catalog`, async () => {
        const lifetime = new AbortController();
        const catalog = new Map(
            [
                ...readFileSync(
                    new URL(
                        `../ui/languages/${locale}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                ).matchAll(/<string name="([^"]+)">([^<]*)<\/string>/g),
            ].map(([, key, value]) => [key, value.trim()]),
        );
        const mounted = [];
        let disposed = false;
        const cleanup = () => {
            disposed = true;
        };
        const ctx = {
            signal: lifetime.signal,
            capabilities: {
                get: (name) => {
                    assert.equal(name, "ui:reuse");
                    return {
                        importModule: async (path) => {
                            assert.equal(path, "tutorials/pages.js");
                            return {
                                mountTutorialProvider: async (
                                    scope,
                                    options,
                                ) => {
                                    assert.equal(scope, ctx);
                                    assert.deepEqual(options.stringsBaseUrls, [
                                        "/static/gateways/notify/languages",
                                    ]);
                                    assert.equal(
                                        options.capability,
                                        "notify:pageTutorials",
                                    );
                                    for (const contribution of options.guides) {
                                        for (const definition of contribution.definitions) {
                                            const keys = [
                                                definition.titleKey,
                                                ...definition.steps.flatMap(
                                                    (step) =>
                                                        [
                                                            step.titleKey,
                                                            step.bodyKey,
                                                        ].filter(Boolean),
                                                ),
                                            ];
                                            for (const key of keys) {
                                                assert.ok(
                                                    key.startsWith(
                                                        "gateway.notify.tutorial.",
                                                    ),
                                                    key,
                                                );
                                                assert.ok(
                                                    catalog.get(key),
                                                    `${locale}: ${key}`,
                                                );
                                            }
                                            mounted.push({
                                                id: `${contribution.owner}:${definition.id}`,
                                                page: definition.page,
                                                role:
                                                    contribution.minRole ??
                                                    "user",
                                                title: catalog.get(
                                                    definition.titleKey,
                                                ),
                                            });
                                        }
                                    }
                                    return cleanup;
                                },
                            };
                        },
                    };
                },
            },
        };
        const dispose = await mountProvider(ctx);
        assert.deepEqual(
            mounted.map(({ id, page, role }) => ({ id, page, role })),
            [
                {
                    id: "notify.preferences.tutorials:preferences",
                    page: "/settings",
                    role: "user",
                },
                {
                    id: "notify.administration.tutorials:delivery",
                    page: "/administration",
                    role: "admin",
                },
                {
                    id: "notify.administration.tutorials:broadcasts",
                    page: "/administration",
                    role: "admin",
                },
            ],
        );
        assert.equal(mounted[0].title, title);
        assert.equal(dispose, cleanup);
        dispose();
        assert.equal(disposed, true);
        lifetime.abort();
    });
}
