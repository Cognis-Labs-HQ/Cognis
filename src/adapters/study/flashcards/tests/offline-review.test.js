import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { createOfflineClientFixture } from "../../../../tooling/reuse/offline-client-fixture.js";

function loadClient(fixture, preferences = { learningLanguages: [] }) {
    return loadTestModule(
        new URL("../ui/decks-client.js", import.meta.url),
        {
            ...fixture.imports,
            "/static/gateways/study/navigation-client.js": {
                fetchStudyPreferences: async () => preferences,
            },
            "./app/language.js": {
                deckMatchesLanguage: (deck, language) =>
                    deck.language === language,
            },
            "/static/gateways/study/offline-content.js": {
                readStudySnapshot: (load) => load(),
            },
            "/static/reuse/i18n.js": { createI18n: async () => ({}) },
            "./app/markup.js": { loadDeckTemplates: async () => ({}) },
        },
        fixture.globals,
    );
}

test("reviews queue idempotent attempts while offline content edits remain unavailable", async () => {
    const requests = [];
    const fixture = createOfflineClientFixture(async (path, options) => {
        requests.push({ path, body: JSON.parse(options.body) });
        return {
            ok: true,
            json: async () => ({ data: { id: "deck", progress: {} } }),
        };
    });
    const client = loadClient(fixture);
    await client.mountProvider(fixture.ctx);
    fixture.disconnect();
    const attempt = {
        id: "788b4cf9-30e4-424b-87ad-e69f6e319cf7",
        occurredAt: "2026-10-24T00:00:00Z",
    };
    assert.equal(
        (await client.reviewStudyCard("deck", "card", "good", attempt)).queued,
        true,
    );
    await assert.rejects(
        client.saveStudyDeck({ name: "edit" }, "deck"),
        /offline_operation_unavailable/,
    );
    assert.equal(requests.length, 0);
    fixture.reconnect();
    assert.equal((await fixture.outbox.flush()).sent, 1);
    assert.deepEqual(requests[0].body, {
        cardId: "card",
        grade: "good",
        attempt,
    });
    assert.equal((await fixture.outbox.flush()).sent, 0);
    fixture.controller.abort();
});

test("enrolled decks and card details prepare after verified sign-in without opening Flashcards", async (context) => {
    const requests = [];
    const fixture = createOfflineClientFixture(async (path) => {
        requests.push(path);
        return Response.json({
            data: path.endsWith("/decks")
                ? [
                      { id: "ja", language: "ja" },
                      { id: "fr", language: "fr" },
                  ]
                : {
                      id: "ja",
                      language: "ja",
                      cards: [{ entry: { id: "card", label: "学" } }],
                  },
        });
    });
    context.after(() => fixture.controller.abort());
    const client = loadClient(fixture, { learningLanguages: ["ja"] });
    await client.mountProvider(fixture.ctx);
    fixture.ctx.extendFlow(
        "authenticate-session",
        "resolve-session",
        { id: "test:deckEnrollment" },
        () => ({ authenticated: true }),
    );
    await fixture.ctx.runFlow("authenticate-session", {});
    const read = fixture.ctx.capabilities.get("study:decks:offlineRead");
    for (let i = 0; i < 50 && !read.has("/ja"); i++)
        await new Promise((resolve) => setImmediate(resolve));
    assert.equal(read.has("/ja"), true);
    assert.equal(requests.includes("/api/v1/study/decks/fr"), false);
    fixture.disconnect();
    assert.equal(
        (await client.fetchStudyDeck("ja")).cards[0].entry.label,
        "学",
    );
    fixture.changeAccount("other");
    await assert.rejects(
        client.fetchStudyDeck("ja"),
        /offline_read_unavailable/,
    );
});
