import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fixture, deferred, settle } from "./fixture.js";

for (const locale of ["en", "de", "id", "ja"]) {
    test(`resend feedback uses the actual ${locale} catalog`, async (context) => {
        const logs = [];
        context.mock.method(console, "error", (...args) => logs.push(args));
        const host = await fixture(context, { locale });
        const xml = new host.window.DOMParser().parseFromString(
            await readFile(
                new URL(
                    `../../ui/languages/${locale}/strings.xml`,
                    import.meta.url,
                ),
                "utf8",
            ),
            "application/xml",
        );
        const translation = (suffix) =>
            xml.querySelector(`string[name="ui.app.login.tfa.${suffix}"]`)
                .textContent;
        await host.advance(30_000);
        for (const [body, status, suffix, variant] of [
            [
                { error: { code: "tfa_attempt_expired" } },
                401,
                "resend_expired",
                "error",
            ],
            [
                { error: { code: "private-detail" } },
                503,
                "resend_unconfirmed",
                "error",
            ],
            [{ data: { challenge: {} } }, 200, "resend_received", "info"],
        ]) {
            host.state.respond = () => Response.json(body, { status });
            await host.click();
            assert.equal(host.state.notices.at(-1).text, translation(suffix));
            assert.equal(host.state.notices.at(-1).options.variant, variant);
        }
        const pending = deferred();
        host.state.respond = () => pending.promise;
        await host.click();
        assert.equal(host.resend().textContent, translation("resend_pending"));
        assert.equal(host.resend().getAttribute("aria-busy"), "true");
        pending.resolve(Response.json({ data: { challenge: {} } }));
        await settle();
        assert.equal(logs.length, 2);
        assert.equal(JSON.stringify(logs).includes("private-detail"), false);
    });
}

test("resend keys fall back to English and fail explicitly when English is missing", async (context) => {
    const host = await fixture(context, { locale: "de" });
    const localization = await import("/static/reuse/i18n.js");
    const base = await localization.createI18n({
        preferredLanguages: ["de", "en"],
    });
    for (const suffix of [
        "resend_expired",
        "resend_unconfirmed",
        "resend_received",
        "resend_pending",
    ]) {
        const key = `ui.app.login.tfa.${suffix}`;
        host.state.catalogEdits = { de: { [key]: "" } };
        const fallback = await localization.extendI18n(
            base,
            "/static/gateways/tfa/languages",
            { revision: `fallback-${suffix}` },
        );
        const english = new host.window.DOMParser().parseFromString(
            await readFile(
                new URL("../../ui/languages/en/strings.xml", import.meta.url),
                "utf8",
            ),
            "application/xml",
        );
        assert.equal(
            fallback.t(key),
            english.querySelector(`string[name="${key}"]`).textContent,
        );
        host.state.catalogEdits = { de: { [key]: null }, en: { [key]: null } };
        const unavailable = await localization.extendI18n(
            base,
            "/static/gateways/tfa/languages",
            { revision: `unavailable-${suffix}` },
        );
        assert.throws(() => unavailable.t(key), /missing_translation:/);
    }
});

for (const suffix of [
    "resend_expired",
    "resend_received",
    "resend_unconfirmed",
    "resend_pending",
]) {
    for (const mode of ["missing", "fallback"]) {
        test(`the real click outcome preserves ${mode} behavior for ${suffix}`, async () => {
            const { execFile } = await import("node:child_process");
            const { promisify } = await import("node:util");
            const { fileURLToPath } = await import("node:url");
            const result = await promisify(execFile)(process.execPath, [
                fileURLToPath(
                    new URL("./localization-outcome.mjs", import.meta.url),
                ),
                suffix,
                mode,
            ]);
            const outcome = JSON.parse(result.stdout.trim().split("\n").at(-1));
            assert.equal(outcome.clickEvents, 1);
            assert.equal(
                outcome.requests,
                suffix === "resend_pending" && mode === "missing" ? 0 : 1,
            );
            assert.equal(outcome.surfacedFailures, mode === "missing" ? 1 : 0);
        });
    }
}
