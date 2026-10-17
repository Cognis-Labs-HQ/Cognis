import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import {
    observeDrawingCard,
    setDrawingCard,
} from "../../../../gateways/study/ui/reuse/drawing-state.js";

test("the open preview is blurred only while the pad holds its exact character and unsubscribes on close", () => {
    let masked;
    const body = {
        inert: false,
        setAttribute(name, value) {
            this[name] = value;
        },
        removeAttribute(name) {
            delete this[name];
        },
    };
    const overlay = {
        classList: {
            toggle(name, value) {
                assert.equal(name, "is-writing-preview");
                masked = value;
            },
        },
        querySelectorAll: () => [body],
    };
    const environment = vm.createContext({
        uiCtx: { capabilities: { get: () => observeDrawingCard } },
    });
    const source = readFileSync(
        new URL("../ui/app/drawing.js", import.meta.url),
        "utf8",
    )
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replaceAll("export function", "function")
        .replaceAll("export async function", "async function");
    vm.runInContext(source, environment);
    const controller = new AbortController();
    environment.bindDrawingPreview(
        overlay,
        { id: "kanji", label: "学" },
        controller.signal,
    );
    setDrawingCard({ id: "kanji", label: "学" });
    assert.equal(masked, true);
    assert.equal(body.inert, true);
    assert.equal(body["aria-hidden"], "true");
    setDrawingCard({ id: "kanji", label: "学んだ" });
    assert.equal(masked, false);
    assert.equal(body.inert, false);
    setDrawingCard({ id: "kanji", label: "学" });
    setDrawingCard(null);
    assert.equal(masked, false);
    controller.abort();
    setDrawingCard({ id: "kanji", label: "学" });
    assert.equal(masked, false);
    setDrawingCard(null);
});

test("Explore previews keep the deck order, including child cards, when opened through a flashcard link", () => {
    const source = readFileSync(
        new URL("../ui/app/popup-navigation.js", import.meta.url),
        "utf8",
    )
        .replace(/^import[\s\S]*?;\n/gm, "")
        .replaceAll("export function", "function");
    const environment = vm.createContext({});
    vm.runInContext(source, environment);
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
