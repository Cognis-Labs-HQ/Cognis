import test from "node:test";
import assert from "node:assert/strict";
import { composerFixture, settle } from "./fixtures/save-runtime.js";

async function setup(context, options) {
    const fixture = await composerFixture(options);
    context.after(() => fixture.dispose());
    context.after(() => assert.deepEqual(fixture.errors, []));
    fixture.edit();
    return fixture;
}

for (const nested of [false, true]) {
    const owner = nested ? "nested" : "main";
    for (const action of ["done", "discard", "reset"]) {
        test(`${owner} ${action}: actual public Composer renders a native non-submit action`, async (context) => {
            const fixture = await setup(context, { nested });
            const control = fixture.document.querySelector(
                `.composer-${action}-btn`,
            );
            assert.ok(control.textContent.trim());
            assert.equal(control.tagName, "BUTTON");
            assert.equal(control.type, "button");
        });
    }
    test(`${owner}: pending actions expose native disabled semantics`, async (context) => {
        const fixture = await setup(context, { nested, mode: "deferred" });
        fixture.hide("fixture-a");
        fixture.done();
        await settle();
        const actions = [
            ...fixture.document.querySelectorAll(".composer-panel-actions > *"),
        ];
        assert.equal(actions.length, 3);
        assert.ok(actions.every((control) => control.matches(":disabled")));
    });
    test(`${owner}: Done click commits the actual draft and retires editor`, async (context) => {
        const fixture = await setup(context, { nested });
        fixture.hide("fixture-a");
        fixture.done();
        await settle();
        assert.equal(fixture.snapshot().writes, 1);
        assert.deepEqual(fixture.stored().layoutsByGrid["cols-12"].hidden, [
            "fixture-a",
        ]);
        assert.equal(fixture.snapshot().editorPresent, false);
        assert.equal(fixture.snapshot().leaveProtected, false);
        assert.ok(
            fixture.flowEvents.some((event) => event.flow === "page:mounted"),
        );
    });
    test(`${owner}: Discard click restores local baseline without a write`, async (context) => {
        const fixture = await setup(context, { nested });
        fixture.hide("fixture-a");
        fixture.document.querySelector(".composer-discard-btn").click();
        await settle();
        assert.equal(fixture.snapshot().writes, 0);
        assert.deepEqual(fixture.snapshot().visible, [
            "fixture-a",
            "fixture-b",
        ]);
        assert.equal(fixture.snapshot().editorPresent, false);
    });
    test(`${owner}: Reset click writes default layout and keeps editor active`, async (context) => {
        const fixture = await setup(context, { nested });
        fixture.hide("fixture-a");
        fixture.document.querySelector(".composer-reset-btn").click();
        await settle();
        assert.equal(fixture.snapshot().writes, 1);
        assert.deepEqual(fixture.stored().layoutsByGrid["cols-12"].hidden, []);
        assert.equal(fixture.snapshot().editorPresent, true);
        assert.deepEqual(fixture.snapshot().visible, [
            "fixture-a",
            "fixture-b",
        ]);
    });
    test(`${owner}: pending click guard prevents duplicate and conflicting actions`, async (context) => {
        const fixture = await setup(context, { nested, mode: "deferred" });
        fixture.hide("fixture-a");
        fixture.done();
        await settle();
        for (const control of fixture.document.querySelectorAll(
            ".composer-panel-actions > *",
        )) {
            assert.equal(control.getAttribute("aria-disabled"), "true");
            assert.equal(control.tabIndex, -1);
            control.click();
        }
        assert.equal(fixture.snapshot().writes, 1);
        assert.equal(fixture.snapshot().editorPresent, true);
        assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
        fixture.complete();
        await settle();
        assert.equal(fixture.snapshot().editorPresent, false);
    });
}

for (const nested of [false, true]) {
    for (const action of ["done", "discard", "reset"]) {
        test(`${nested ? "nested" : "main"} ${action}: activation leaves URL unchanged and does not submit an enclosing form`, async (context) => {
            const fixture = await setup(context, { nested });
            fixture.hide("fixture-a");
            const control = fixture.document.querySelector(
                `.composer-${action}-btn`,
            );
            const panel = control.closest(".composer-panel");
            const form = fixture.document.createElement("form");
            fixture.document.body.append(form);
            form.append(panel);
            let submissions = 0;
            form.addEventListener("submit", (event) => {
                submissions += 1;
                event.preventDefault();
            });
            const before = fixture.window.location.href;
            control.focus();
            assert.equal(fixture.document.activeElement, control);
            control.click();
            await settle();
            assert.equal(fixture.window.location.href, before);
            assert.equal(submissions, 0);
        });
    }
}

for (const nested of [false, true]) {
    for (const operation of ["done", "reset"]) {
        test(`${nested ? "nested" : "main"} ${operation}: rejection restores native controls and permits explicit retry`, async (context) => {
            const fixture = await setup(context, { nested, mode: "deferred" });
            fixture.hide("fixture-a");
            let actions = [
                ...fixture.document.querySelectorAll(
                    ".composer-panel-actions button",
                ),
            ];
            const before = actions.map((control) => ({
                disabled: control.disabled,
                tabIndex: control.getAttribute("tabindex"),
                ariaDisabled: control.getAttribute("aria-disabled"),
                label: control.textContent,
            }));
            fixture.document
                .querySelector(`.composer-${operation}-btn`)
                .click();
            await settle();
            actions = [
                ...fixture.document.querySelectorAll(
                    ".composer-panel-actions button",
                ),
            ];
            assert.equal(actions.length, 3);
            assert.ok(actions.every((control) => control.disabled));
            fixture.complete(0, 500);
            await settle();
            actions.forEach((control, index) => {
                assert.equal(control.disabled, before[index].disabled);
                assert.equal(
                    control.getAttribute("tabindex"),
                    before[index].tabIndex,
                );
                assert.equal(
                    control.getAttribute("aria-disabled"),
                    before[index].ariaDisabled,
                );
                assert.equal(control.textContent, before[index].label);
                control.focus();
                assert.equal(fixture.document.activeElement, control);
            });
            fixture.setMode("success");
            fixture.document
                .querySelector(`.composer-${operation}-btn`)
                .click();
            await settle();
            assert.equal(fixture.snapshot().writes, 2);
            assert.equal(
                fixture.snapshot().editorPresent,
                operation === "reset",
            );
            assert.equal(
                fixture.snapshot().leaveProtected,
                operation === "reset",
            );
        });
    }
}

for (const nested of [false, true]) {
    test(`${nested ? "nested" : "main"}: failed Done preserves preexisting disabled and accessibility state`, async (context) => {
        const fixture = await setup(context, { nested, mode: "deferred" });
        fixture.hide("fixture-a");
        const discard = fixture.document.querySelector(".composer-discard-btn");
        discard.disabled = true;
        discard.setAttribute("aria-disabled", "true");
        discard.setAttribute("tabindex", "-1");
        const reset = fixture.document.querySelector(".composer-reset-btn");
        reset.setAttribute("aria-disabled", "false");
        reset.setAttribute("tabindex", "0");
        fixture.done();
        await settle();
        assert.equal(reset.disabled, true);
        fixture.complete(0, 500);
        await settle();
        assert.equal(discard.disabled, true);
        assert.equal(discard.getAttribute("aria-disabled"), "true");
        assert.equal(discard.getAttribute("tabindex"), "-1");
        assert.equal(reset.disabled, false);
        assert.equal(reset.getAttribute("aria-disabled"), "false");
        assert.equal(reset.getAttribute("tabindex"), "0");
        reset.focus();
        assert.equal(fixture.document.activeElement, reset);
    });
}
