import test from "node:test";
import assert from "node:assert/strict";
import { composerFixture, settle } from "./fixtures/save-runtime.js";

async function setup(context, options) {
    const fixture = await composerFixture(options);
    context.after(() => fixture.dispose());
    context.after(() => assert.deepEqual(fixture.errors, []));
    return fixture;
}

function enterDraft(fixture) {
    fixture.edit();
    fixture.hide("fixture-a");
    assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
    assert.equal(fixture.snapshot().leaveProtected, true);
}

function click(fixture, selector) {
    const control = fixture.document.querySelector(selector);
    assert.ok(control, selector);
    control.click();
}

function gesture(fixture, target, type, properties = {}) {
    const event = new fixture.window.Event(type, {
        bubbles: true,
        cancelable: true,
    });
    Object.assign(event, {
        button: 0,
        pointerId: 1,
        clientX: 500,
        clientY: 500,
        ...properties,
    });
    target.dispatchEvent(event);
}

for (const nested of [false, true]) {
    for (const control of ["panel", "topbar"]) {
        const owner = `${nested ? "nested" : "main"} ${control}`;
        for (const mode of [
            "400",
            "500",
            "rejected",
            "accepted-response-lost",
            "malformed",
            "false",
            "wrong-shape",
            "queued",
            "202",
            "204",
        ]) {
            test(`${owner}: ${mode} preserves a protected draft with actionable feedback`, async (context) => {
                const fixture = await setup(context, { nested, mode });
                enterDraft(fixture);
                fixture.done(control);
                await settle();
                const state = fixture.snapshot();
                assert.equal(state.writes, 1);
                assert.equal(state.editorPresent, true);
                assert.equal(state.leaveProtected, true);
                assert.deepEqual(state.visible, ["fixture-b"]);
                assert.ok(
                    state.toasts.some(
                        (message) =>
                            message.includes("Done") &&
                            message.includes("Discard"),
                    ),
                );
                assert.equal(
                    fixture.root.querySelector("#composer-edit-toggle")
                        .disabled,
                    false,
                );
                const expectedOutcome = ["400", "500"].includes(mode)
                    ? "rejected"
                    : "unknown";
                assert.ok(
                    fixture.logs.some(
                        ({ metadata }) => metadata?.outcome === expectedOutcome,
                    ),
                );
                assert.deepEqual(
                    fixture.stored().layoutsByGrid["cols-12"].hidden,
                    mode === "accepted-response-lost" ? ["fixture-a"] : [],
                );
                await settle();
                assert.equal(
                    fixture.snapshot().writes,
                    1,
                    "No automatic replay",
                );
                fixture.setMode("success");
                fixture.done(control);
                await settle();
                assert.equal(fixture.snapshot().editorPresent, false);
                assert.equal(fixture.snapshot().leaveProtected, false);
                assert.equal(fixture.snapshot().writes, 2);
                await fixture.remount();
                assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
            });
        }

        for (const key of ["cognis_account", "cognis_access_token"]) {
            test(`${owner}: missing ${key} never accepts an unwritten layout`, async (context) => {
                const fixture = await setup(context, { nested });
                enterDraft(fixture);
                fixture.window.localStorage.removeItem(key);
                fixture.done(control);
                await settle();
                assert.equal(fixture.snapshot().writes, 0);
                assert.equal(fixture.snapshot().editorPresent, true);
                assert.equal(fixture.snapshot().leaveProtected, true);
                assert.match(fixture.toasts.at(-1).message, /account session/);
                click(fixture, ".composer-discard-btn");
                assert.equal(fixture.snapshot().leaveProtected, false);
                assert.deepEqual(fixture.snapshot().visible, [
                    "fixture-a",
                    "fixture-b",
                ]);
            });
        }

        test(`${owner}: pending edits, repeated actions and refresh cannot change the submitted profile`, async (context) => {
            const fixture = await setup(context, { nested, mode: "deferred" });
            enterDraft(fixture);
            const input = fixture.root.querySelector('input[name="fixture-b"]');
            input.value = "retained form";
            const cell = fixture.root.querySelector(
                '.composer-cell[data-composer-element="fixture-b"]',
            );
            gesture(fixture, cell, "pointerdown");
            gesture(fixture, cell, "pointermove");
            fixture.done(control);
            await settle();
            const submitted = structuredClone(fixture.pending[0].body);
            const pending = fixture.snapshot();
            assert.equal(pending.editorPresent, true);
            assert.equal(pending.leaveProtected, true);
            assert.equal(
                fixture.root.querySelector("#composer-edit-toggle").disabled,
                true,
            );
            assert.equal(cell.tabIndex, -1);
            assert.notEqual(cell.inert, true);
            assert.equal(
                cell.querySelector(".composer-close-btn").disabled,
                true,
            );
            assert.match(
                fixture.document.querySelector(".composer-done-btn")
                    .textContent,
                /Saving/,
            );
            const savingControl =
                fixture.document.querySelector(".composer-done-btn");
            assert.notEqual(savingControl.inert, true);
            assert.equal(savingControl.getAttribute("aria-disabled"), "true");
            assert.equal(savingControl.tabIndex, -1);
            assert.equal(
                fixture.root.querySelector('input[name="fixture-b"]'),
                input,
            );
            fixture.done(control);
            fixture.hide("fixture-b");
            click(fixture, ".composer-add-btn");
            click(fixture, ".composer-reset-btn");
            click(fixture, ".composer-discard-btn");
            for (const type of ["pointerdown", "pointermove", "pointerup"])
                gesture(fixture, cell, type);
            for (const shiftKey of [false, true])
                cell.dispatchEvent(
                    new fixture.window.KeyboardEvent("keydown", {
                        key: "ArrowDown",
                        shiftKey,
                        bubbles: true,
                    }),
                );
            const resize = cell.querySelector(".composer-resize-se");
            for (const type of ["pointerdown", "pointermove", "pointerup"])
                gesture(fixture, resize, type);
            fixture.resize(390);
            fixture.composer.refresh([]);
            assert.equal(fixture.snapshot().writes, 1);
            assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
            assert.equal(fixture.snapshot().leaveProtected, true);
            assert.deepEqual(fixture.pending[0].body, submitted);
            fixture.complete();
            await settle();
            assert.equal(fixture.snapshot().editorPresent, false);
            assert.equal(fixture.snapshot().leaveProtected, false);
            assert.equal(fixture.snapshot().writes, 1);
            assert.deepEqual(fixture.stored(), submitted.layout);
            assert.equal(
                fixture.root.querySelector('input[name="fixture-b"]').value,
                "retained form",
            );
            if (!nested)
                assert.equal(
                    fixture.root.querySelector('input[name="fixture-b"]'),
                    input,
                );
        });

        test(`${owner}: teardown ignores late completion and leaves a newer draft protected`, async (context) => {
            const fixture = await setup(context, { nested, mode: "deferred" });
            enterDraft(fixture);
            fixture.done(control);
            await settle();
            await fixture.remount();
            fixture.edit();
            fixture.hide("fixture-b");
            const newer = fixture.snapshot();
            fixture.complete();
            await settle();
            assert.equal(fixture.snapshot().editorPresent, true);
            assert.equal(fixture.snapshot().leaveProtected, true);
            assert.deepEqual(fixture.snapshot().visible, newer.visible);
            assert.equal(fixture.toasts.length, 0);
            click(fixture, ".composer-discard-btn");
            assert.deepEqual(fixture.snapshot().visible, [
                "fixture-a",
                "fixture-b",
            ]);
        });
    }

    test(`${nested ? "nested" : "main"}: rejected Reset does not advance Discard baseline`, async (context) => {
        const fixture = await setup(context, { nested });
        enterDraft(fixture);
        fixture.done();
        await settle();
        fixture.edit();
        fixture.setMode("deferred");
        click(fixture, ".composer-reset-btn");
        assert.equal(fixture.snapshot().leaveProtected, true);
        assert.deepEqual(fixture.snapshot().visible, [
            "fixture-a",
            "fixture-b",
        ]);
        click(fixture, ".composer-reset-btn");
        click(fixture, ".composer-discard-btn");
        assert.equal(fixture.snapshot().writes, 2);
        fixture.complete(0, 500);
        await settle();
        click(fixture, ".composer-discard-btn");
        assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
        assert.equal(fixture.snapshot().leaveProtected, false);
    });

    test(`${nested ? "nested" : "main"}: acknowledged Reset stays editable with the new baseline`, async (context) => {
        const fixture = await setup(context, { nested });
        enterDraft(fixture);
        fixture.done();
        await settle();
        fixture.edit();
        click(fixture, ".composer-reset-btn");
        await settle();
        assert.equal(fixture.snapshot().editorPresent, true);
        assert.equal(fixture.snapshot().leaveProtected, true);
        fixture.hide("fixture-b");
        click(fixture, ".composer-discard-btn");
        assert.deepEqual(fixture.snapshot().visible, [
            "fixture-a",
            "fixture-b",
        ]);
        assert.equal(fixture.snapshot().writes, 2);
    });
}

for (const locale of ["en", "de", "id", "ja"]) {
    test(`${locale}: save errors use the localized catalog`, async (context) => {
        const fixture = await setup(context, { locale, mode: "500" });
        enterDraft(fixture);
        fixture.done();
        await settle();
        assert.equal(
            fixture.toasts.at(-1).message,
            fixture.i18n.t("ui.reuse.layout_save_rejected"),
        );
    });
}

for (const nested of [false, true]) {
    test(`${nested ? "nested" : "main"}: saving a narrow profile preserves existing desktop layout`, async (context) => {
        const desktop = {
            placements: [{ id: "fixture-a", col: 8, row: 2, w: 2, h: 2 }],
            hidden: ["fixture-b"],
        };
        const mobile = {
            placements: [
                { id: "fixture-a", col: 0, row: 0, w: 2, h: 2 },
                { id: "fixture-b", col: 2, row: 0, w: 2, h: 2 },
            ],
            hidden: [],
        };
        const fixture = await setup(context, {
            nested,
            width: 390,
            initialProfiles: {
                layoutsByGrid: { "cols-12": desktop, "cols-4": mobile },
            },
        });
        assert.equal(fixture.snapshot().writes, 0);
        enterDraft(fixture);
        fixture.done();
        await settle();
        assert.deepEqual(fixture.stored().layoutsByGrid["cols-12"], desktop);
        assert.deepEqual(fixture.stored().layoutsByGrid["cols-4"].hidden, [
            "fixture-a",
        ]);
        fixture.resize(1080);
        assert.equal(fixture.snapshot().writes, 1);
        assert.deepEqual(fixture.snapshot().visible, ["fixture-a"]);
    });

    for (const readMode of ["success", "500", "malformed", "invalid-layout"]) {
        test(`${nested ? "nested" : "main"}: ${readMode} read keeps default-hidden rendering non-writing`, async (context) => {
            const fixture = await setup(context, {
                nested,
                readMode,
                defaultHidden: true,
                initialProfiles: { layoutsByGrid: {} },
            });
            assert.deepEqual(fixture.snapshot().visible, ["fixture-a"]);
            assert.equal(fixture.snapshot().writes, 0);
            fixture.resize(390);
            assert.deepEqual(fixture.snapshot().visible, ["fixture-a"]);
            assert.equal(fixture.snapshot().writes, 0);
        });
    }
}

test("public persistence returns exactly its serialized snapshot despite caller mutations", async (context) => {
    const fixture = await setup(context, {});
    const { createLayoutPersistence } = await fixture.importModule(
        "src/ui/reuse/page-composer/layout-persistence.js",
    );
    let complete;
    let serialized;
    const persistence = createLayoutPersistence({
        apiFetch: async (path, options) => {
            assert.match(path, /preferences\/snapshot-layout$/);
            serialized = JSON.parse(options.body).layout;
            return new Promise((resolve) => {
                complete = resolve;
            });
        },
    });
    const other = { placements: [], hidden: ["desktop"] };
    const draft = { placements: [], hidden: ["submitted"] };
    const profiles = { layoutsByGrid: { "cols-12": other } };
    const saving = persistence.saveLayoutByKey(
        "snapshot-layout",
        profiles,
        4,
        draft,
    );
    draft.hidden.push("not-submitted");
    other.hidden.push("also-not-submitted");
    complete(Response.json({ data: { saved: true } }));
    const accepted = JSON.parse(JSON.stringify(await saving));
    assert.deepEqual(accepted, serialized);
    assert.deepEqual(accepted.layoutsByGrid["cols-4"].hidden, ["submitted"]);
    assert.deepEqual(accepted.layoutsByGrid["cols-12"].hidden, ["desktop"]);
});

test("a nested editor exclusively owns the shared topbar even when its parent allows customization", async (context) => {
    const fixture = await setup(context, {
        nested: true,
        outerCustomization: true,
    });
    enterDraft(fixture);
    fixture.done("topbar");
    await settle();
    assert.equal(fixture.snapshot().writes, 1);
    assert.equal(fixture.snapshot().editorPresent, false);
    assert.equal(fixture.snapshot().leaveProtected, false);
});

for (const status of [200, 500]) {
    test(`an inactive nested ${status} completion cannot replace another editor or clear its guard`, async (context) => {
        const fixture = await setup(context, {
            nested: true,
            navigation: true,
            mode: "deferred",
        });
        enterDraft(fixture);
        fixture.done();
        await settle();
        click(fixture, '[data-composer-scroll="other-section"]');
        await settle();
        fixture.edit();
        fixture.hide("fixture-b");
        const title = fixture.root.querySelector("#composer-edit-toggle").title;
        fixture.complete(0, status);
        await settle();
        assert.equal(fixture.snapshot().leaveProtected, true);
        assert.equal(
            fixture.root.querySelector("#composer-edit-toggle").title,
            title,
        );
        assert.equal(
            fixture.document.querySelector(
                "#composer-elements-panel-other-layout",
            ) !== null,
            true,
        );
        assert.equal(fixture.toasts.length, 0);
        click(fixture, ".composer-discard-btn");
        assert.equal(fixture.snapshot().leaveProtected, status !== 200);
        click(fixture, '[data-composer-scroll="fixture-section"]');
        await settle();
        assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
        assert.equal(fixture.snapshot().editorPresent, status !== 200);
        assert.equal(fixture.toasts.length, status === 200 ? 0 : 1);
    });
}

for (const nested of [false, true]) {
    test(`${nested ? "nested" : "main"}: a preparation callback failure releases pending controls without submitting`, async (context) => {
        let failRender = false;
        const fixture = await setup(context, {
            nested,
            onRender: () => {
                if (failRender) {
                    failRender = false;
                    throw new Error("Synthetic render failure");
                }
            },
        });
        enterDraft(fixture);
        failRender = true;
        click(fixture, ".composer-reset-btn");
        await settle();
        assert.equal(fixture.snapshot().writes, 0);
        assert.equal(fixture.snapshot().editorPresent, true);
        assert.equal(fixture.snapshot().leaveProtected, true);
        assert.equal(
            fixture.root.querySelector("#composer-edit-toggle").disabled,
            false,
        );
        assert.ok(
            fixture.logs.some(
                ({ metadata }) => metadata?.outcome === "preparation",
            ),
        );
        assert.match(fixture.toasts.at(-1).message, /Done.*Discard/);
        fixture.done();
        await settle();
        assert.equal(fixture.snapshot().writes, 1);
        assert.equal(fixture.snapshot().leaveProtected, false);
    });
}

test("pending layout save leaves a live widget input usable without replacing it", async (context) => {
    const fixture = await setup(context, { mode: "deferred" });
    enterDraft(fixture);
    const input = fixture.root.querySelector('input[name="fixture-b"]');
    let clicks = 0;
    let inputs = 0;
    input.addEventListener("click", () => {
        clicks += 1;
    });
    input.addEventListener("input", () => {
        inputs += 1;
    });
    fixture.done();
    await settle();
    input.focus();
    assert.equal(fixture.document.activeElement, input);
    assert.equal(input.closest("[inert]"), null);
    input.click();
    const key = new fixture.window.KeyboardEvent("keydown", {
        key: "a",
        bubbles: true,
        cancelable: true,
    });
    assert.equal(input.dispatchEvent(key), true);
    input.value = "typed while saving";
    input.dispatchEvent(new fixture.window.Event("input", { bubbles: true }));
    assert.equal(clicks, 1);
    assert.equal(inputs, 1);
    assert.equal(fixture.root.querySelector('input[name="fixture-b"]'), input);
    fixture.hide("fixture-b");
    assert.deepEqual(fixture.snapshot().visible, ["fixture-b"]);
    fixture.complete();
    await settle();
    assert.equal(fixture.root.querySelector('input[name="fixture-b"]'), input);
    assert.equal(input.value, "typed while saving");
});
