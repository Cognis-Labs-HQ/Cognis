import test from "node:test";
import assert from "node:assert/strict";
import { installI18nEnvironment } from "../fixtures/i18n-environment.js";
import { workerFixture } from "../../../tests/fixtures/offline-worker.js";

const xml = (text) =>
    new Response(
        `<resources><string name="title">${text}</string></resources>`,
    );

test(
    "cold offline translations render cached fallback locales without waiting for a stalled network",
    { timeout: 1000 },
    async (t) => {
        const worker = workerFixture();
        await worker.lifecycle("install");
        worker.serve(() => xml("Cached"));
        for (const locale of ["en", "de"])
            await worker.request(`/static/languages/${locale}/strings.xml`);
        worker.advance(60_001);
        const releases = [];
        const pending = [];
        let cleaningUp = false;
        worker.serve(() =>
            cleaningUp
                ? xml("Recovered")
                : new Promise((resolve) => releases.push(resolve)),
        );
        t.after(async () => {
            cleaningUp = true;
            for (const release of releases) release(xml("Recovered"));
            await Promise.all(pending.map((request) => request.finished()));
        });
        const host = installI18nEnvironment((path, options) => {
            const request = worker.beginRequest(path, undefined, options);
            pending.push(request);
            return request.response;
        });
        const { createI18n } = await import(
            `../../i18n.js?offline=${crypto.randomUUID()}`
        );
        assert.equal(
            (await createI18n({ preferredLanguages: ["de", "en"] })).t("title"),
            "Cached",
        );
        assert.ok(
            host.requests.every(({ options }) => options.cache === "default"),
        );
    },
);
