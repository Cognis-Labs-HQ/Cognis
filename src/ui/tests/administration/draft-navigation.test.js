import test from "node:test";
import assert from "node:assert/strict";
import { environment } from "./fixtures/save.js";

async function draftEnvironment() {
    const fields = { title: "", message: "" };
    let dirty = false;
    let discarded = 0;
    let publishDirty;
    const fixture = await environment({
        createContribution({ onDirtyChange }) {
            publishDirty = () => onDirtyChange("draft", dirty);
            return {
                id: "draft",
                label: "Draft",
                subComposerOptions: { elements: [] },
                isDirty: () => dirty,
                discard() {
                    fields.title = "";
                    fields.message = "";
                    dirty = false;
                    discarded++;
                    publishDirty();
                },
            };
        },
    });
    return {
        ...fixture,
        fields,
        editSecurity: fixture.edit,
        isDirty: () => dirty,
        discards: () => discarded,
        edit() {
            fields.title = "Pending announcement";
            fields.message = "Do not send from Settings Save";
            dirty = true;
            publishDirty();
        },
        navigate: () => fixture.composerOptions.onBeforeSubPageSwitch(),
    };
}

test("Administration Stay retains an unsent contribution and guards the next navigation", async () => {
    const fixture = await draftEnvironment();
    fixture.edit();
    const pending = { ...fixture.fields };
    fixture.decideNavigation("stay");

    assert.equal(await fixture.navigate(), false);
    assert.deepEqual(fixture.fields, pending);
    assert.equal(fixture.isDirty(), true);
    assert.equal(fixture.slot.hidden, false);
    assert.equal(fixture.discards(), 0);
    assert.equal(await fixture.navigate(), false);
    const popups = fixture.events.filter((event) => event.kind === "popup");
    assert.equal(popups.length, 2);
    assert.deepEqual(
        Array.from(popups[0].options.actions, (action) => action.id),
        ["discard", "stay"],
    );
});

test("Administration Discard clears an unsent contribution and allows later navigation without another prompt", async () => {
    const fixture = await draftEnvironment();
    fixture.edit();
    fixture.decideNavigation("discard");

    assert.equal(await fixture.navigate(), true);
    assert.deepEqual(fixture.fields, { title: "", message: "" });
    assert.equal(fixture.isDirty(), false);
    assert.equal(fixture.slot.hidden, true);
    assert.equal(fixture.discards(), 1);
    assert.equal(await fixture.navigate(), true);
    assert.equal(
        fixture.events.filter((event) => event.kind === "popup").length,
        1,
    );
    assert.equal(fixture.discards(), 1);
});

test("shared Settings Save preserves an unsent contribution while saving Security only once", async () => {
    const fixture = await draftEnvironment();
    fixture.edit();
    const pending = { ...fixture.fields };
    await fixture.save();
    assert.equal(
        fixture.requests.every((request) => request.method === "GET"),
        true,
    );
    assert.equal(fixture.slot.hidden, false);
    assert.equal(fixture.isDirty(), true);

    await fixture.openSecurity();
    await fixture.editSecurity("policy-min-length", 24);
    await fixture.save();
    await fixture.save();
    assert.deepEqual(
        fixture
            .writes()
            .map(({ url, body }) => ({ url, minLength: body.minLength })),
        [{ url: "/api/v1/auth/password-policy", minLength: 24 }],
    );
    assert.equal(
        fixture.requests.some((request) => request.method === "POST"),
        false,
    );
    assert.deepEqual(fixture.fields, pending);
    assert.equal(fixture.isDirty(), true);
    assert.equal(fixture.slot.hidden, false);
    assert.equal(fixture.discards(), 0);
    assert.equal(
        fixture.events.some((event) => event.variant === "success"),
        false,
    );
    fixture.decideNavigation("stay");
    assert.equal(await fixture.navigate(), false);
    await fixture.discard();
    assert.equal(fixture.slot.hidden, true);
    assert.equal(fixture.isDirty(), false);
    assert.deepEqual(fixture.fields, { title: "", message: "" });
});

test("Administration forwards contribution cleanup and page lifetime to the composer", async () => {
    const onUnmount = () => {};
    const fixture = await environment({
        createContribution: () => ({
            id: "draft",
            label: "Draft",
            subComposerOptions: { elements: [], onUnmount },
        }),
    });
    const contribution = fixture.composerOptions.elements.find(
        (element) => element.id === "draft",
    );
    assert.equal(contribution.subComposerOptions.onUnmount, onUnmount);
    assert.equal(fixture.composerOptions.signal.aborted, false);
    fixture.abort();
    assert.equal(fixture.composerOptions.signal.aborted, true);
});
