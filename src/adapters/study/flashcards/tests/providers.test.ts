import assert from "node:assert/strict";
import test from "node:test";
import { providerDecks, starterDeckId } from "../providers.js";
import type { StudyAdapterBootstrapCtx } from "../../../../gateways/study/gateway.js";

function fixture(enabled = true) {
    const descriptor = {
        moduleId: "language",
        languageCode: "ja",
        package: { id: "pack", contentRevision: "one" },
        starterDecks: [
            {
                key: "basic",
                name: { en: "Basics", ja: "基本" },
                schemaId: "schema",
                sourceRecordIds: ["one", "two"],
            },
        ],
    };
    const ctx = {
        capabilities: {
            list: () => ["study:language:ja"],
            get: (key: string) =>
                key === "study:language:ja" ? descriptor : undefined,
        },
        gateway: { isLanguageModuleEnabled: async () => enabled },
    } as unknown as StudyAdapterBootstrapCtx;
    let traced = 0;
    const library = {
        read: async () => null,
        list: async () => [
            { id: "uuid-two", label: "Two", sourceRecordId: "two" },
            { id: "uuid-one", label: "One", sourceRecordId: "one" },
        ],
        trace: async (_actor: unknown, id: string) => {
            traced++;
            return { entry: { id, label: id }, references: [] };
        },
    };
    return { ctx, library, descriptor, traced: () => traced };
}

test("starter decks resolve provider keys in declared order with stable IDs, while browsing avoids loading card details", async () => {
    const scenario = fixture(),
        actor = { accountId: "user", role: "user" };
    const decks = await providerDecks(scenario.ctx, scenario.library, actor);
    assert.deepEqual(decks[0].entryIds, ["uuid-one", "uuid-two"]);
    assert.equal(decks[0].canEdit, false);
    assert.equal(scenario.traced(), 0);
    const details = await providerDecks(
        scenario.ctx,
        scenario.library,
        actor,
        decks[0].id,
    );
    assert.equal(details[0].cards.length, 2);
    assert.equal(scenario.traced(), 2);
    scenario.descriptor.package.contentRevision = "two";
    assert.equal(
        (await providerDecks(scenario.ctx, scenario.library, actor))[0].id,
        decks[0].id,
    );
    assert.notEqual(
        starterDeckId("pack", "basic"),
        starterDeckId("pack", "other"),
    );
});
test("disabled providers and unavailable prerequisite cards do not advertise starter decks", async () => {
    const disabled = fixture(false);
    assert.deepEqual(
        await providerDecks(disabled.ctx, disabled.library, {
            accountId: "user",
            role: "user",
        }),
        [],
    );
    const scenario = fixture();
    scenario.library.list = async () => [];
    assert.deepEqual(
        await providerDecks(scenario.ctx, scenario.library, {
            accountId: "user",
            role: "user",
        }),
        [],
    );
});
