import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadPopupManager } from "../fixtures/popup-manager-loader.js";

const createCalendarPopupManager = await loadPopupManager();
const calendar = { id: "personal", visibility: "private", name: "Personal" };
const slot = { startAt: "2026-10-23T10:00", endAt: "2026-10-23T11:00" };
const expectedTitles = {
    en: ["New Event", "Edit Event"],
    de: ["Neuer Termin", "Ereignis Bearbeiten"],
    id: ["Acara Baru", "Edit Acara"],
    ja: ["新しいイベント", "予定を編集"],
};

for (const [locale, titles] of Object.entries(expectedTitles)) {
    for (const path of ["create", "timeslot", "edit"]) {
        test(`${locale} resolves the ${path} popup title and preserves cancellation`, async () => {
            const catalogs = await Promise.all([
                readFile(
                    new URL(
                        `../../ui/languages/${locale}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
                readFile(
                    new URL(
                        `../../../../ui/languages/${locale}/strings.xml`,
                        import.meta.url,
                    ),
                    "utf8",
                ),
            ]);
            const strings = new Map(
                catalogs.flatMap((xml) =>
                    [
                        ...xml.matchAll(
                            /<string name="([^"]+)">([^<]*)<\/string>/g,
                        ),
                    ].map((match) => [match[1], match[2]]),
                ),
            );
            let popup;
            let defaults;
            const manager = createCalendarPopupManager({
                i18n: {
                    t: (key) => {
                        assert.ok(
                            strings.get(key),
                            `Missing ${locale} translation: ${key}`,
                        );
                        return strings.get(key);
                    },
                },
                calendarUi: {
                    createEventComposerBuilder: (options) => {
                        defaults = options.defaultValues;
                        return {};
                    },
                },
                getCalendars: () => [calendar],
                getSelectedCalendarId: () => calendar.id,
                getCurrentAccountId: () => "owner",
                getJitsiAvailable: () => false,
                normalizeDateTimeInputValue: (value) => value,
                openPopup: async (options) => {
                    popup = options;
                    assert.equal(await options.onAction("cancel"), true);
                    assert.equal(await options.onAction(null), true);
                    assert.equal(await options.onAction("save"), false);
                },
            });
            const event = {
                id: "existing",
                title: "Existing event",
                ...slot,
                attendees: [],
            };
            await manager.openEventComposerPopup(
                path === "edit"
                    ? { eventData: { calendar, event } }
                    : path === "timeslot"
                      ? slot
                      : undefined,
            );
            assert.equal(popup.title, titles[path === "edit" ? 1 : 0]);
            assert.equal(popup.closeProtection, true);
            assert.equal(popup.actions[0].id, "save");
            assert.equal(
                popup.actions[0].label,
                strings.get(
                    path === "edit"
                        ? "gateway.calendar.save_event"
                        : "gateway.calendar.create_event",
                ),
            );
            assert.equal(defaults.title, path === "edit" ? event.title : "");
            assert.equal(
                defaults.startAt,
                path === "create" ? "" : slot.startAt,
            );
            assert.equal(defaults.endAt, path === "create" ? "" : slot.endAt);
            assert.equal(defaults.calendarId, calendar.id);
        });
    }
}
