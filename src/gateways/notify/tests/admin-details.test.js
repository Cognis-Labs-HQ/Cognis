import test from "node:test";
import assert from "node:assert/strict";
import {
    environment,
    deferred,
    response,
    settle,
} from "./fixtures/administration.js";

const row = (fixture, id) =>
    fixture.root.querySelector(
        `.notif-broadcast-row[data-broadcast-id="${id}"]`,
    );
const details = (fixture) =>
    [...fixture.root.querySelectorAll(".notif-broadcast-ack-row")].map(
        (element) => element.dataset.parentId,
    );
const stateRequests = (fixture) =>
    fixture.requests.filter((request) => request.url.endsWith("/states"));

for (const activation of ["click", "Enter", " "]) {
    test(`Broadcast details expand and collapse with ${JSON.stringify(activation)}`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        const target = row(fixture, "A");
        for (const expanded of [true, false]) {
            if (activation === "click") target.click();
            else
                target.dispatchEvent(
                    new fixture.window.KeyboardEvent("keydown", {
                        key: activation,
                        bubbles: true,
                        cancelable: true,
                    }),
                );
            await settle();
            assert.equal(
                target.getAttribute("aria-expanded"),
                String(expanded),
            );
            assert.equal(
                target.classList.contains("notif-broadcast-row--expanded"),
                expanded,
            );
            assert.equal(
                target.getAttribute("aria-label"),
                fixture.i18n.t(
                    `gateway.notify.admin.broadcast_${expanded ? "collapse" : "expand"}_details`,
                ),
            );
            assert.deepEqual(details(fixture), expanded ? ["A"] : []);
        }
        assert.equal(stateRequests(fixture).length, 1);
        assert.equal(fixture.notices.length, 0);
    });
}

test("Broadcast collapse before read settlement stays collapsed and explicit re-expansion reuses cached data", async (context) => {
    const fixture = await environment("broadcasts");
    context.after(fixture.close);
    const pending = deferred();
    fixture.intercept((request) =>
        request.url.endsWith("/states") ? pending.promise : undefined,
    );
    row(fixture, "A").click();
    assert.equal(row(fixture, "A").getAttribute("aria-busy"), "true");
    row(fixture, "A").click();
    pending.resolve(response([]));
    await settle();
    assert.equal(row(fixture, "A").getAttribute("aria-expanded"), "false");
    assert.deepEqual(details(fixture), []);
    row(fixture, "A").click();
    await settle();
    assert.deepEqual(details(fixture), ["A"]);
    assert.equal(stateRequests(fixture).length, 1);
});

for (const staleOutcome of ["success", "rejection"]) {
    test(`Broadcast B remains selected when older A completes with ${staleOutcome}`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        const first = deferred();
        const second = deferred();
        fixture.intercept((request) => {
            if (request.url.endsWith("/A/states")) return first.promise;
            if (request.url.endsWith("/B/states")) return second.promise;
        });
        row(fixture, "A").click();
        row(fixture, "B").click();
        second.resolve(response([]));
        await settle();
        assert.deepEqual(details(fixture), ["B"]);
        if (staleOutcome === "success") first.resolve(response([]));
        else first.reject(new TypeError("Synthetic stale read failure"));
        await settle();
        assert.deepEqual(details(fixture), ["B"]);
        assert.equal(row(fixture, "A").getAttribute("aria-expanded"), "false");
        assert.equal(row(fixture, "B").getAttribute("aria-expanded"), "true");
        assert.equal(fixture.notices.length, 0);
    });
}

test("Broadcast A to B to A coalesces the pending A read and paints only current intent", async (context) => {
    const fixture = await environment("broadcasts");
    context.after(fixture.close);
    const first = deferred();
    const second = deferred();
    fixture.intercept((request) => {
        if (request.url.endsWith("/A/states")) return first.promise;
        if (request.url.endsWith("/B/states")) return second.promise;
    });
    row(fixture, "A").click();
    row(fixture, "B").click();
    row(fixture, "A").click();
    assert.equal(stateRequests(fixture).length, 2);
    first.resolve(response([]));
    second.resolve(response([]));
    await settle();
    assert.deepEqual(details(fixture), ["A"]);
    assert.equal(row(fixture, "B").getAttribute("aria-expanded"), "false");
    assert.equal(fixture.notices.length, 0);
});

for (const failure of ["http", "network", "malformed"]) {
    test(`Broadcast current ${failure} detail failure settles and next expansion retries`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        fixture.intercept((request) => {
            if (!request.url.endsWith("/states")) return;
            if (failure === "network")
                throw new TypeError("Synthetic read failure");
            return failure === "http"
                ? response([], 500)
                : response({ invalid: true });
        });
        row(fixture, "A").click();
        await settle();
        assert.equal(row(fixture, "A").getAttribute("aria-expanded"), "false");
        assert.notEqual(row(fixture, "A").getAttribute("aria-busy"), "true");
        assert.deepEqual(details(fixture), []);
        assert.deepEqual(fixture.notices, [
            {
                message: fixture.i18n.t(
                    "gateway.notify.admin.broadcast_details_failed",
                ),
                variant: "error",
            },
        ]);
        fixture.intercept(undefined);
        row(fixture, "A").click();
        await settle();
        assert.equal(stateRequests(fixture).length, 2);
        assert.deepEqual(details(fixture), ["A"]);
    });
}

for (const action of ["rebind", "unmount", "account"]) {
    for (const outcome of ["success", "rejection"]) {
        test(`Broadcast ${action} ignores old detail ${outcome}`, async (context) => {
            const fixture = await environment("broadcasts");
            context.after(fixture.close);
            const pending = deferred();
            fixture.intercept((request) =>
                request.url.endsWith("/A/states") ? pending.promise : undefined,
            );
            row(fixture, "A").click();
            if (action === "rebind") {
                fixture.render();
                row(fixture, "B").click();
                await settle();
            }
            if (action === "unmount") fixture.unmount();
            if (action === "account")
                fixture.window.localStorage.setItem(
                    "cognis_account",
                    "another-admin",
                );
            if (outcome === "success") pending.resolve(response([]));
            else
                pending.reject(
                    new TypeError("Synthetic cancelled read failure"),
                );
            await settle();
            assert.equal(stateRequests(fixture)[0].signal.aborted, true);
            assert.deepEqual(
                details(fixture),
                action === "rebind" ? ["B"] : [],
            );
            assert.equal(fixture.notices.length, 0);
        });
    }
}

test("Broadcast toggle keyboard events do not activate the parent detail row", async (context) => {
    const fixture = await environment("broadcasts");
    context.after(fixture.close);
    const target = row(fixture, "A").querySelector("button");
    for (const key of ["Enter", " "]) {
        const event = new fixture.window.KeyboardEvent("keydown", {
            key,
            bubbles: true,
            cancelable: true,
        });
        target.dispatchEvent(event);
        assert.equal(event.defaultPrevented, false);
    }
    await settle();
    assert.equal(stateRequests(fixture).length, 0);
    assert.equal(row(fixture, "A").getAttribute("aria-expanded"), "false");
});
