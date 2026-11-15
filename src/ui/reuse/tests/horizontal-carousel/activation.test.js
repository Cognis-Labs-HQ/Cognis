import test from "node:test";
import assert from "node:assert/strict";
import { popupFixture } from "../popup/dom-fixture.js";

function deferred() {
    let resolve;
    const promise = new Promise((finish) => {
        resolve = finish;
    });
    return { promise, resolve };
}

async function fixture(context) {
    const popup = await popupFixture(context);
    const carousel = await popup.importModule("horizontal-carousel.js");
    const root = popup.document.createElement("div");
    root.innerHTML = carousel.renderHorizontalCarousel({
        id: "synthetic-relationship",
        label: "Synthetic relationship",
        allowAdd: false,
        items: [{ value: "original", label: "Original" }],
    });
    popup.document.body.append(root);
    const item = root.querySelector("[data-carousel-value]");
    function bind(options) {
        const controller = new popup.window.AbortController();
        context.after(() => controller.abort());
        carousel.mountHorizontalCarousels(root, {
            signal: controller.signal,
            ...options,
        });
        return controller;
    }
    const snapshot = () => ({
        value: item.dataset.carouselValue,
        label: item.querySelector(":scope > span").textContent,
        selected: item.classList.contains("is-selected"),
        pressed: item.getAttribute("aria-pressed"),
        order: item.querySelector("[data-carousel-order]").textContent,
        count: root.querySelector("[data-carousel-selection]").textContent,
    });
    return { ...popup, carousel, root, item, bind, snapshot };
}

test("aborted asynchronous activation cannot edit retired selection markup", async (context) => {
    const view = await fixture(context);
    const pending = deferred();
    const controller = view.bind({ onActivate: () => pending.promise });
    const before = view.snapshot();
    view.item.click();
    controller.abort();
    pending.resolve({ value: "late", label: "Late" });
    await view.settle();
    assert.deepEqual(view.snapshot(), before);
});

test("aborted asynchronous activation cannot notify its retired owner", async (context) => {
    const view = await fixture(context);
    const pending = deferred();
    const changes = [];
    const controller = view.bind({
        onActivate: () => pending.promise,
        onChange: (detail) => changes.push(detail),
    });
    view.item.click();
    controller.abort();
    pending.resolve();
    await view.settle();
    assert.equal(changes.length, 0);
});

test("retired activation cannot toggle a newer mount selection", async (context) => {
    const view = await fixture(context);
    const pending = deferred();
    const oldChanges = [];
    const newChanges = [];
    const oldController = view.bind({
        onActivate: () => pending.promise,
        onChange: (detail) => oldChanges.push(detail),
    });
    view.item.click();
    oldController.abort();
    view.bind({ onChange: (detail) => newChanges.push(detail) });
    view.item.click();
    assert.equal(newChanges.length, 1);
    const current = view.snapshot();
    assert.equal(current.selected, true);
    pending.resolve();
    await view.settle();
    assert.deepEqual(view.snapshot(), current);
    assert.equal(oldChanges.length, 0);
    assert.equal(newChanges.length, 1);
});

test("synchronous activation that retires its scope cannot commit afterward", async (context) => {
    const view = await fixture(context);
    const changes = [];
    let controller;
    controller = view.bind({
        onActivate: () => {
            controller.abort();
            return { label: "Retired" };
        },
        onChange: (detail) => changes.push(detail),
    });
    const before = view.snapshot();
    view.item.click();
    assert.deepEqual(view.snapshot(), before);
    assert.equal(changes.length, 0);
});

test("current asynchronous activation commits resolved identity once", async (context) => {
    const view = await fixture(context);
    const pending = deferred();
    const changes = [];
    view.bind({
        onActivate: () => pending.promise,
        onChange: (detail) => changes.push(detail),
    });
    view.item.click();
    assert.equal(changes.length, 0);
    assert.equal(view.snapshot().selected, false);
    pending.resolve({ value: "resolved", label: "Resolved" });
    await view.settle();
    assert.deepEqual(view.snapshot(), {
        value: "resolved",
        label: "Resolved",
        selected: true,
        pressed: "true",
        order: "1",
        count: "1",
    });
    assert.equal(changes.length, 1);
    assert.deepEqual(Array.from(changes[0].values), ["resolved"]);
});

test("current synchronous activation toggles selection normally", async (context) => {
    const view = await fixture(context);
    const changes = [];
    view.bind({ onChange: (detail) => changes.push(detail) });
    view.item.click();
    assert.equal(view.snapshot().selected, true);
    view.item.click();
    assert.equal(view.snapshot().selected, false);
    assert.equal(changes.length, 2);
});

test("false asynchronous result preserves selection and emits no change", async (context) => {
    const view = await fixture(context);
    const pending = deferred();
    const changes = [];
    view.bind({
        onActivate: () => pending.promise,
        onChange: (detail) => changes.push(detail),
    });
    const before = view.snapshot();
    view.item.click();
    pending.resolve(false);
    await view.settle();
    assert.deepEqual(view.snapshot(), before);
    assert.equal(changes.length, 0);
});

test("aborting scope prevents later new clicks and cleans preview resources", async (context) => {
    const view = await fixture(context);
    let activations = 0;
    const controller = view.bind({
        onActivate: () => {
            activations += 1;
        },
    });
    controller.abort();
    view.item.click();
    assert.equal(activations, 0);
    assert.equal(view.snapshot().selected, false);
    assert.equal(
        view.document.querySelectorAll(".horizontal-carousel-preview.is-portal")
            .length,
        0,
    );
});

test("synchronous false veto preserves selection before the click returns", async (context) => {
    const view = await fixture(context);
    const changes = [];
    view.bind({
        onActivate: () => false,
        onChange: (detail) => changes.push(detail),
    });
    const before = view.snapshot();
    view.item.click();
    assert.deepEqual(view.snapshot(), before);
    assert.deepEqual(changes, []);
});

test("live synchronous activation resolves identity and notifies before the click returns", async (context) => {
    const view = await fixture(context);
    const changes = [];
    view.bind({
        onActivate: () => ({ value: "resolved", label: "Resolved" }),
        onChange: (detail) => changes.push(detail),
    });
    view.item.click();
    assert.deepEqual(view.snapshot(), {
        value: "resolved",
        label: "Resolved",
        selected: true,
        pressed: "true",
        order: "1",
        count: "1",
    });
    assert.equal(changes.length, 1);
    assert.deepEqual(Array.from(changes[0].values), ["resolved"]);
});

test("live selection preserves click order and aggregates shared ids once", async (context) => {
    const view = await fixture(context);
    view.root.insertAdjacentHTML(
        "beforeend",
        view.carousel.renderHorizontalCarousel({
            id: "synthetic-relationship",
            label: "Second placement",
            allowAdd: false,
            items: [
                { value: "second", label: "Second" },
                { value: "original", label: "Repeated" },
            ],
        }),
    );
    const secondCarousel = view.root.lastElementChild;
    const [second, repeated] = secondCarousel.querySelectorAll(
        "[data-carousel-value]",
    );
    const changes = [];
    const orders = [];
    view.bind({
        onChange: (detail) => changes.push(detail),
        selectionOrder: ({ id, value, localIndex }) => {
            orders.push({ id, value, localIndex });
            return localIndex;
        },
    });
    repeated.click();
    second.click();
    view.item.click();
    assert.deepEqual(
        changes.map(({ values }) => Array.from(values)),
        [["original"], ["original", "second"], ["original", "second"]],
    );
    assert.equal(
        repeated.querySelector("[data-carousel-order]").textContent,
        "1",
    );
    assert.equal(
        second.querySelector("[data-carousel-order]").textContent,
        "2",
    );
    assert.equal(
        secondCarousel.querySelector("[data-carousel-selection]").textContent,
        "2",
    );
    assert.equal(view.snapshot().order, "1");
    assert.ok(
        orders.some(
            ({ id, value, localIndex }) =>
                id === "synthetic-relationship" &&
                value === "second" &&
                localIndex === 2,
        ),
    );
    repeated.click();
    assert.equal(
        second.querySelector("[data-carousel-order]").textContent,
        "1",
    );
    assert.equal(repeated.getAttribute("aria-pressed"), "false");
    assert.deepEqual(Array.from(changes.at(-1).values), ["original", "second"]);
});

test("live add callback can append an item without activating or selecting it", async (context) => {
    const view = await fixture(context);
    view.root.innerHTML = view.carousel.renderHorizontalCarousel({
        id: "add-control",
        label: "Items",
        items: [],
        addLabel: "Create item",
    });
    const additions = [];
    const changes = [];
    const activations = [];
    view.bind({
        onAdd: ({ id, carousel }) => {
            additions.push(id);
            view.carousel.appendHorizontalCarouselItem(carousel, {
                value: "added",
                label: "Added",
            });
        },
        onActivate: (detail) => {
            activations.push(detail);
        },
        onChange: (detail) => changes.push(detail),
    });
    view.root.querySelector("[data-carousel-add]").click();
    const added = view.root.querySelector("[data-carousel-value=added]");
    assert.deepEqual(additions, ["add-control"]);
    assert.ok(added);
    assert.equal(added.getAttribute("aria-pressed"), "false");
    assert.equal(activations.length, 0);
    assert.equal(changes.length, 0);
    added.click();
    assert.equal(activations.length, 1);
    assert.deepEqual(Array.from(changes[0].values), ["added"]);
});

test("aborting an actually opened preview removes its owned portal", async (context) => {
    const view = await fixture(context);
    const controller = view.bind();
    view.item.focus();
    const portal = view.document.querySelector(
        ".horizontal-carousel-preview.is-portal",
    );
    assert.ok(portal?.isConnected);
    assert.equal(portal.hidden, false);
    assert.match(portal.textContent, /Original/);
    controller.abort();
    assert.equal(portal.isConnected, false);
});

test("a pre-aborted mount leaves retained markup and callbacks untouched", async (context) => {
    const view = await fixture(context);
    const controller = new view.window.AbortController();
    controller.abort();
    view.item.classList.add("is-selected");
    const before = view.snapshot();
    const calls = [];
    view.carousel.mountHorizontalCarousels(view.root, {
        signal: controller.signal,
        selectionOrder: () => {
            calls.push("order");
            return 99;
        },
        onActivate: () => calls.push("activate"),
        onChange: () => calls.push("change"),
    });
    view.item.click();
    assert.deepEqual(view.snapshot(), before);
    assert.deepEqual(calls, []);
});

test("retirement from selection ordering stops old writes and notifications", async (context) => {
    const view = await fixture(context);
    const changes = [];
    let controller;
    let current;
    controller = view.bind({
        selectionOrder: () => {
            controller.abort();
            view.bind({ selectionOrder: () => 42 });
            current = view.snapshot();
            return 99;
        },
        onChange: (detail) => changes.push(detail),
    });
    view.item.click();
    assert.equal(current.order, "42");
    assert.deepEqual(view.snapshot(), current);
    assert.deepEqual(changes, []);
});

test("retirement from change callback preserves the newer mount ordering", async (context) => {
    const view = await fixture(context);
    let controller;
    let current;
    let changes = 0;
    controller = view.bind({
        selectionOrder: () => 11,
        onChange: () => {
            changes += 1;
            controller.abort();
            view.bind({ selectionOrder: () => 42 });
            current = view.snapshot();
        },
    });
    view.item.click();
    assert.equal(current.order, "42");
    assert.deepEqual(view.snapshot(), current);
    assert.equal(changes, 1);
});
