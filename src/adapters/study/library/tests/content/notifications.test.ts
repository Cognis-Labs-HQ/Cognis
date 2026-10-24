import assert from "node:assert/strict";
import test from "node:test";
import { createContentNotifiers } from "../../content-notifications.js";
import { notificationMessages } from "../../reuse/notification-messages.js";
import { createLibraryFlow } from "../reuse/flows.js";
import type { LibraryEntry } from "../../types.js";

test("new content and deletion notifications carry localized catalogs through their ctx flow", async () => {
    const envelopes: Array<{
        recipientUsername?: string;
        metadata?: Record<string, unknown>;
    }> = [];
    const runs: string[] = [];
    const errors: unknown[] = [];
    const notify = createContentNotifiers({
        flow: createLibraryFlow((id) => runs.push(id)),
        accounts: {
            list: async () => [
                { username: "learner", enabled: true },
                { username: "disabled", enabled: false },
            ],
        },
        dispatch: async (envelope) => {
            envelopes.push(envelope);
            return { dispatched: ["internal"] };
        },
        log: (_level, _message, metadata) => errors.push(metadata),
    });
    await notify.newContent({ entryCount: 2, language: "ja" });
    const entry = {
        scope: "user",
        scopeId: "learner",
        createdBy: "learner",
        label: "{{ cards }} &amp;lt;",
    } as LibraryEntry;
    await notify.deletedContent([entry], { accountId: "admin", role: "admin" });
    assert.deepEqual(runs, Array(2).fill("study:library:notifyContent"));
    assert.equal(envelopes.length, 2);
    for (const envelope of envelopes) {
        assert.equal(envelope.recipientUsername, "learner");
        const localized = envelope.metadata?.localizedText as Record<
            string,
            { subject: string; body: string }
        >;
        assert.deepEqual(Object.keys(localized).sort(), [
            "de",
            "en",
            "id",
            "ja",
        ]);
        for (const locale of ["de", "id", "ja"]) {
            assert.notEqual(localized[locale].subject, localized.en.subject);
            assert.notEqual(localized[locale].body, localized.en.body);
        }
    }
    const deletion = envelopes[1].metadata?.localizedText as Record<
        string,
        { body: string }
    >;
    assert.ok(deletion.ja.body.includes(entry.label));
    assert.equal(errors.length, 0);
});

test("notification text uses English fallback and leaves substituted card labels opaque", () => {
    const english =
        '<resources><string name="adapter.study.library.notification_deletion_subject">Cards</string><string name="adapter.study.library.notification_deletion_body">{{ cards }} &amp;lt;</string></resources>';
    assert.deepEqual(
        notificationMessages("<resources/>", "deletion", english, {
            cards: "{{ cards }} &amp;lt;",
        }),
        { subject: "Cards", body: "{{ cards }} &amp;lt; &lt;" },
    );
    assert.throws(
        () => notificationMessages("<resources/>", "deletion"),
        /missing_notification_translation/,
    );
});

test("recipient discovery failures do not invalidate committed Library content", async () => {
    const logs: unknown[] = [];
    const notify = createContentNotifiers({
        flow: createLibraryFlow(),
        accounts: {
            list: async () => {
                throw new Error("unavailable");
            },
        },
        dispatch: async () => assert.fail("Unexpected delivery"),
        log: (_level, _message, metadata) => logs.push(metadata),
    });
    await notify.newContent({ entryCount: 1 });
    assert.equal(logs.length, 1);
});
