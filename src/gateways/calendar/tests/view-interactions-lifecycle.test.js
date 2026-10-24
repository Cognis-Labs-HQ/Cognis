import assert from "node:assert/strict";
import test from "node:test";
import { bindViewInteractions } from "../ui/app/bind-view-interactions.js";

test("Calendar event selection rebinds after navigation without duplicate listeners", (context) => {
    const previousElement = globalThis.Element;
    const previousHTMLElement = globalThis.HTMLElement;
    class Element extends EventTarget {
        dataset = {};
        closest() {
            return this;
        }
        getAttribute(name) {
            return name === "data-calendar-id" ? "calendar" : "event";
        }
    }
    globalThis.Element = Element;
    globalThis.HTMLElement = Element;
    context.after(() => {
        globalThis.Element = previousElement;
        globalThis.HTMLElement = previousHTMLElement;
    });
    const root = new Element();
    const opened = [];
    let unrelated = 0;
    root.addEventListener("click", () => unrelated++);
    const bind = (signal) =>
        bindViewInteractions({
            root,
            signal,
            handlePendingResponseClick: () => false,
            setSelectedCalendarId: () => {},
            openEventPopup: (...args) => opened.push(args),
        });
    const first = new AbortController();
    bind(first.signal);
    bind(first.signal);
    root.dispatchEvent(new Event("click"));
    assert.equal(opened.length, 1);
    first.abort();
    root.dispatchEvent(new Event("click"));
    assert.equal(opened.length, 1);
    const second = new AbortController();
    bind(second.signal);
    bind(second.signal);
    root.dispatchEvent(new Event("click"));
    assert.deepEqual(opened, [
        ["calendar", "event"],
        ["calendar", "event"],
    ]);
    assert.equal(unrelated, 3);
    second.abort();
});
