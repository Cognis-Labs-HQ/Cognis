import assert from "node:assert/strict";
import test from "node:test";
import { popupFixture } from "./dom-fixture.js";

function delegate(fixture, popup, callbacks = {}) {
    const controller = new fixture.window.AbortController();
    const surface = fixture.document.createElement("button");
    surface.textContent = "Synthetic delegated control";
    fixture.document.body.append(surface);
    let revoked = 0;
    const records = [];
    fixture.capabilities.set("ui:log", (level, message, metadata) =>
        records.push({ level, metadata }),
    );
    const release = fixture.ctx.capabilities
        .get("ui:popupFocus")
        .delegate(popup.overlay, {
            signal: controller.signal,
            surfaces: [surface],
            contains: (element) => element === surface,
            focus: () => surface.focus(),
            onRevoke: () => {
                revoked++;
                surface.remove();
            },
            ...callbacks,
        });
    return { surface, controller, release, records, revoked: () => revoked };
}

async function settled(fixture, popup) {
    const result = await Promise.race([
        popup.result,
        new Promise((resolve) =>
            fixture.window.setTimeout(() => resolve("unsettled"), 100),
        ),
    ]);
    assert.notEqual(
        result,
        "unsettled",
        "dismissal must settle its public result",
    );
    assert.equal(popup.overlay.hasAttribute("data-popup-active"), false);
    assert.equal(popup.overlay.inert, true);
    popup.overlay.dispatchEvent(new fixture.window.Event("transitionend"));
    assert.equal(popup.overlay.isConnected, false);
}

test("throwing revocation cannot interrupt popup dismissal, removal, result settlement or focus return", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open();
    const scope = delegate(fixture, popup, {
        onRevoke: () => {
            throw new Error("Synthetic cleanup failure");
        },
    });
    scope.surface.focus();
    await popup.dismiss();
    await settled(fixture, popup);
    assert.equal(fixture.document.activeElement, fixture.invoker);
    assert.ok(
        scope.records.some(
            ({ level, metadata }) =>
                level === "error" && metadata.operation === "revokePopupFocus",
        ),
    );
    scope.controller.abort();
    scope.release();
    const next = fixture.document.querySelector("a");
    next.focus();
    assert.equal(fixture.document.activeElement, next);
});

for (const callback of ["contains", "focus"]) {
    test(`throwing delegated ${callback} revokes its scope and restores ordinary focus containment`, async (context) => {
        const fixture = await popupFixture(context);
        const popup = await fixture.open();
        const scope = delegate(fixture, popup, {
            [callback]: () => {
                throw new Error("Synthetic callback failure");
            },
        });
        fixture.invoker.focus();
        assert.ok(popup.overlay.contains(fixture.document.activeElement));
        assert.equal(scope.revoked(), 1);
        assert.ok(scope.records.some(({ level }) => level === "error"));
        const buttons = popup.overlay.querySelectorAll("button");
        buttons[buttons.length - 1].focus();
        assert.equal(fixture.key("Tab").defaultPrevented, true);
        assert.equal(fixture.document.activeElement, buttons[0]);
        await popup.dismiss();
        await settled(fixture, popup);
    });
}

test("throwing parent focus restoration cannot strand a dismissed child or its result", async (context) => {
    const fixture = await popupFixture(context);
    const parent = await fixture.open();
    let failed = false;
    let surface;
    const scope = delegate(fixture, parent, {
        contains: (element) => !failed && element === surface,
        focus: () => {
            if (failed) throw new Error("Synthetic restoration failure");
            surface.focus();
        },
    });
    surface = scope.surface;
    surface.focus();
    const child = await fixture.open();
    failed = true;
    await child.dismiss();
    await settled(fixture, child);
    assert.ok(parent.overlay.contains(fixture.document.activeElement));
    assert.equal(scope.revoked(), 1);
    await parent.dismiss();
    await settled(fixture, parent);
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

test("misdirected focus callback is revoked without a recursive focus loop", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open();
    let attempts = 0;
    const scope = delegate(fixture, popup, {
        focus: () => {
            attempts++;
            fixture.document.querySelector("a").focus();
        },
    });
    fixture.invoker.focus();
    assert.equal(attempts, 1);
    assert.equal(scope.revoked(), 1);
    assert.ok(popup.overlay.contains(fixture.document.activeElement));
    await popup.dismiss();
    await settled(fixture, popup);
});

test("logging failure cannot interrupt delegated callback recovery or popup dismissal", async (context) => {
    const fixture = await popupFixture(context);
    const popup = await fixture.open();
    const scope = delegate(fixture, popup, {
        onRevoke: () => {
            throw new Error("Synthetic cleanup failure");
        },
    });
    fixture.capabilities.set("ui:log", () => {
        throw new Error("Synthetic logger failure");
    });
    await popup.dismiss();
    await settled(fixture, popup);
    scope.controller.abort();
    assert.equal(fixture.document.activeElement, fixture.invoker);
});

for (const value of [1, "allowed", {}]) {
    test(`non-boolean ${typeof value} predicate results cannot grant background focus`, async (context) => {
        const fixture = await popupFixture(context);
        const popup = await fixture.open();
        const scope = delegate(fixture, popup, { contains: () => value });
        fixture.invoker.focus();
        assert.ok(popup.overlay.contains(fixture.document.activeElement));
        assert.equal(scope.revoked(), 1);
        await popup.dismiss();
        await settled(fixture, popup);
    });
}

for (const callback of ["contains", "focus", "onRevoke"]) {
    test(`asynchronous ${callback} is rejected without leaking focus or an unhandled rejection`, async (context) => {
        const fixture = await popupFixture(context);
        const popup = await fixture.open();
        const scope = delegate(fixture, popup, {
            [callback]: () =>
                Promise.reject(new Error("Synthetic async failure")),
        });
        if (callback !== "onRevoke") {
            fixture.invoker.focus();
            assert.ok(popup.overlay.contains(fixture.document.activeElement));
        }
        await popup.dismiss();
        await settled(fixture, popup);
        await fixture.settle();
        assert.ok(
            scope.records.some(
                ({ level, metadata }) =>
                    level === "error" && metadata.errorName === "TypeError",
            ),
        );
        assert.equal(fixture.document.activeElement, fixture.invoker);
    });
}
