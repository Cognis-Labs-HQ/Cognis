import test from "node:test";
import assert from "node:assert/strict";
import { normalizeFocusManifest } from "../focus-control.js";

const surface = (id, kind = "route") => ({
    id,
    pageId: "page.one",
    labelKey: `${id}.label`,
    descriptionKey: `${id}.description`,
    loader: {
        kind,
        routeId: `${id}.route`,
        ...(kind === "module-route" ? { moduleId: "drawing" } : {}),
    },
    modes: ["overlay", "fullscreen"],
    synchronized: true,
    initialState: { resourceId: "stable-id" },
});

test("normalizes unrelated page, element, and external module surfaces", () => {
    const result = normalizeFocusManifest(
        {
            focusControl: {
                surfaces: [
                    surface("page-surface"),
                    surface("module-surface", "module-route"),
                ],
            },
        },
        [{ focusControl: surface("chat-pane") }],
    );
    assert.deepEqual(
        result.map(({ id }) => id),
        ["page-surface", "module-surface", "chat-pane"],
    );
});

test("rejects executable state, HTML state, invalid modes, and undeclared loader kinds", () => {
    assert.equal(
        normalizeFocusManifest({
            focusControl: { ...surface("x"), initialState: { callback() {} } },
        }).length,
        0,
    );
    assert.equal(
        normalizeFocusManifest({
            focusControl: {
                ...surface("x"),
                initialState: "<script>bad</script>",
            },
        }).length,
        0,
    );
    assert.equal(
        normalizeFocusManifest({
            focusControl: { ...surface("x"), modes: ["popup"] },
        }).length,
        0,
    );
    assert.equal(
        normalizeFocusManifest({
            focusControl: {
                ...surface("x"),
                loader: { kind: "callback", routeId: "x.route" },
            },
        }).length,
        0,
    );
});

test("accepts picture-in-picture presentation for persistent meeting panes", () => {
    assert.equal(
        normalizeFocusManifest({
            focusControl: { ...surface("meeting"), modes: ["pip"] },
        }).length,
        1,
    );
});

test("accepts a surface that omits optional initial state", () => {
    const withoutInitialState = surface("defaults");
    delete withoutInitialState.initialState;
    assert.equal(
        normalizeFocusManifest({ focusControl: withoutInitialState }).length,
        1,
    );
});
