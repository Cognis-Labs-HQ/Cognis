import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {
    observeDrawingCard,
    setDrawingCard,
} from "../../../../../gateways/study/ui/reuse/drawing-state.js";

test("the open preview is blurred only while the pad holds its exact character and unsubscribes on close", () => {
    let masked;
    const popupApi = {
        setContentConcealed(value) {
            masked = value;
        },
    };
    const environment = vm.createContext({
        uiCtx: { capabilities: { get: () => observeDrawingCard } },
    });
    Object.assign(
        environment,
        loadTestModule(
            new URL("../../ui/app/drawing.js", import.meta.url),
            {
                "./reuse/readings.js": environment,
                "/static/reuse/ui-ctx.js": environment,
                "/static/reuse/popup.js": environment,
                "/static/gateways/study/reuse/drawing-pattern.js": environment,
            },
            environment,
        ),
    );
    const controller = new AbortController();
    environment.bindDrawingPreview(
        popupApi,
        { id: "kanji", label: "学" },
        controller.signal,
    );
    setDrawingCard({ id: "kanji", label: "学" });
    assert.equal(masked, true);
    setDrawingCard({ id: "kanji", label: "学んだ" });
    assert.equal(masked, false);
    setDrawingCard({ id: "kanji", label: "学" });
    setDrawingCard(null);
    assert.equal(masked, false);
    controller.abort();
    setDrawingCard({ id: "kanji", label: "学" });
    assert.equal(masked, false);
    setDrawingCard(null);
});

test("Explore previews keep the deck order, including child cards, when opened through a flashcard link", () => {
    const environment = vm.createContext({});
    Object.assign(
        environment,
        loadTestModule(
            new URL("../../ui/app/popup-navigation.js", import.meta.url),
            {
                "./presentation.js": environment,
                "./cards.js": environment,
                "./variant-placement.js": environment,
            },
            environment,
        ),
    );
    const entries = [
        { id: "other", layer: "kanji" },
        { id: "one", layer: "kana" },
        { id: "two", layer: "kana", hidden: true },
        { id: "three", layer: "kanji" },
    ];
    const { active, index } = environment.popupEntryNavigationState(
        entries,
        entries[2],
        {},
        {},
        ["one", "two", "three"],
    );
    assert.deepEqual(
        Array.from(active, ({ id }) => id),
        ["one", "two", "three"],
    );
    assert.equal(index, 1);
    assert.equal(
        environment.resolvePopupNavigation({
            result: "previous",
            active,
            index,
        }).entry.id,
        "one",
    );
    assert.equal(
        environment.resolvePopupNavigation({ result: "next", active, index })
            .entry.id,
        "three",
    );
});
