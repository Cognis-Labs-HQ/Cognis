import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { guides } from "../../app/settings/guides.js";
import { installI18nEnvironment } from "../../reuse/tests/fixtures/i18n-environment.js";
import { tutorialHost } from "../../reuse/tutorials/tests/fixtures/host.js";
import { mountPageTutorials } from "../../reuse/tutorials/pages.js";

test("Settings registers every guide with its own public locale catalog and no optional components", async (context) => {
    const environment = installI18nEnvironment(async (path) => {
        const match = String(path).match(
            /^\/static\/languages\/(en|de|id|ja)\/strings\.xml$/,
        );
        assert.ok(match, `Unexpected component catalog request: ${path}`);
        return new Response(
            await readFile(
                new URL(
                    `../../languages/${match[1]}/strings.xml`,
                    import.meta.url,
                ),
                "utf8",
            ),
        );
    });
    const { createI18n } = await import(
        `../../reuse/i18n.js?settings=${crypto.randomUUID()}`
    );
    for (const locale of ["en", "de", "id", "ja"]) {
        const state = tutorialHost();
        context.after(state.dispose);
        const i18n = await createI18n({
            preferredLanguages: [locale],
            persistLocale: false,
        });
        const root = {
            ownerDocument: state.document,
            querySelectorAll: () => [],
        };
        for (const guide of guides) {
            const dispose = await mountPageTutorials(state.api, {
                ...guide,
                root,
                signal: state.ctx.signal,
                i18n,
            });
            assert.equal(
                state.events.filter((event) => event === "ui:tutorial:register")
                    .length,
                guide.definitions.length,
            );
            dispose();
        }
        assert.deepEqual(
            state.logs.filter(([level]) => level === "error"),
            [],
        );
    }
    assert.ok(environment.requests.length >= 4);
});
