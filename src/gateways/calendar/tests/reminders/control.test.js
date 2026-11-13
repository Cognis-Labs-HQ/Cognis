import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

const { renderReminderField, getSelectedReminderOffsets } = loadTestModule(
    new URL("../../ui/app/popup-manager-reminders.js", import.meta.url),
    { "/static/reuse/info-tooltip.js": { renderInfoTooltip: () => "" } },
);

test("reminder control renders independent visible checkboxes and preserves nonpreset selections", () => {
    const markup = renderReminderField({
        i18n: { t: (key, values) => `${key}:{minutes}` },
        escapeHtml: (value) => value,
        selectedOffsets: [5, 30, 90],
    });
    assert.match(
        markup,
        /role="group" aria-label="gateway.calendar.event_reminders:/,
    );
    const labels = [...markup.matchAll(/<label[^>]*>(.*?)<\/label>/g)];
    assert.equal(labels.length, 8);
    assert.equal(
        labels.filter((match) => match[1].includes(" checked")).length,
        3,
    );
    for (const [, content] of labels)
        assert.match(content, /class="choice-checkbox" type="checkbox"/);
    assert.match(markup, /value="90" checked/);
    assert.match(markup, /gateway.calendar.reminder_minutes:90/);
});

test("reading reminder selections returns all checked values and preserves empty selection", () => {
    const overlay = {
        querySelectorAll: (selector) => {
            assert.equal(
                selector,
                'input[name="calendar-popup-reminder-offset"]:checked',
            );
            return [{ value: "60" }, { value: "5" }, { value: "30" }];
        },
    };
    assert.deepEqual(
        Array.from(getSelectedReminderOffsets(overlay)),
        [5, 30, 60],
    );
    assert.deepEqual(
        Array.from(getSelectedReminderOffsets({ querySelectorAll: () => [] })),
        [],
    );
});

test("custom reminder labels use locale catalogs with English fallback and explicit missing-key failure", async () => {
    const { readFile } = await import("node:fs/promises");
    const { installI18nEnvironment } =
        await import("../../../../ui/reuse/tests/fixtures/i18n-environment.js");
    async function translations(locale, omitted = []) {
        installI18nEnvironment(async (path) => {
            const language = path.split("/").at(-2);
            const component = path.startsWith("/calendar/");
            const location = component
                ? `../../ui/languages/${language}/strings.xml`
                : `../../../../ui/languages/${language}/strings.xml`;
            let xml = await readFile(
                new URL(location, import.meta.url),
                "utf8",
            );
            if (component && omitted.includes(language))
                xml = xml.replace(
                    /<string name="gateway\.calendar\.reminder_minutes">[^<]*<\/string>/,
                    "",
                );
            return new Response(xml);
        });
        const { createI18n } = await import(
            `../../../../ui/reuse/i18n.js?fixture=${crypto.randomUUID()}`
        );
        return createI18n({
            preferredLanguages: [locale],
            componentStringBaseUrls: ["/calendar"],
        });
    }
    for (const [locale, expected] of Object.entries({
        en: "90 minutes before",
        de: "90 Minuten vorher",
        id: "90 menit sebelumnya",
        ja: "90分前",
    })) {
        const i18n = await translations(locale);
        assert.ok(
            renderReminderField({
                i18n,
                escapeHtml: String,
                selectedOffsets: [90],
            }).includes(expected),
        );
    }
    const fallback = await translations("de", ["de"]);
    assert.ok(
        renderReminderField({
            i18n: fallback,
            escapeHtml: String,
            selectedOffsets: [90],
        }).includes("90 minutes before"),
    );
    const missing = await translations("de", ["de", "en"]);
    assert.throws(
        () =>
            renderReminderField({
                i18n: missing,
                escapeHtml: String,
                selectedOffsets: [90],
            }),
        /missing_translation:gateway.calendar.reminder_minutes/,
    );
});
