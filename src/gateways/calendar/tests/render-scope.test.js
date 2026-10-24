import assert from "node:assert/strict";
import test from "node:test";
import { createRenderScope } from "../ui/app/render-scope.js";

test("re-rendered Calendar controls handle one click and release listeners on navigation", () => {
    const page = new AbortController();
    const nextRender = createRenderScope(page.signal);
    const button = new EventTarget();
    const resizeTarget = new EventTarget();
    let actions = 0;
    let resizes = 0;
    let unrelated = 0;
    button.addEventListener("click", () => unrelated++);
    for (let render = 0; render < 4; render++) {
        const signal = nextRender();
        button.addEventListener("click", () => actions++, { signal });
        resizeTarget.addEventListener("resize", () => resizes++, { signal });
    }
    button.dispatchEvent(new Event("click"));
    resizeTarget.dispatchEvent(new Event("resize"));
    assert.equal(actions, 1);
    assert.equal(resizes, 1);
    assert.equal(unrelated, 1);
    page.abort();
    assert.equal(nextRender().aborted, true);
    button.dispatchEvent(new Event("click"));
    resizeTarget.dispatchEvent(new Event("resize"));
    assert.equal(actions, 1);
    assert.equal(resizes, 1);
    assert.equal(unrelated, 2);
    const remount = createRenderScope(new AbortController().signal);
    button.addEventListener("click", () => actions++, { signal: remount() });
    button.dispatchEvent(new Event("click"));
    assert.equal(actions, 2);
    assert.equal(unrelated, 3);
});
