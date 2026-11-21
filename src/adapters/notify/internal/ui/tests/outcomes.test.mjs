import test from "node:test";
import assert from "node:assert/strict";
import { fixture, deferred, settle } from "./fixture.mjs";

for (const failure of ["http500", "reject", "malformed"]) {
    test(`desired: failed ${failure} refresh retains known inbox`, async (context) => {
        const environment = await fixture();
        context.after(environment.close);
        await environment.click("#notification-toggle");
        const before = environment.snapshot();
        assert.equal(before.rows, 1);
        environment.state.reads = failure;
        await environment.poll();
        const after = environment.snapshot();
        console.log(
            JSON.stringify({ scenario: `refresh ${failure}`, before, after }),
        );
        assert.equal(after.rows, 1);
        assert.equal(after.badge, "1");
        assert.equal(after.search, 1);
        assert.equal(after.empty, false);
        assert.ok(after.errors > 0);
    });
}

test("desired: failed initial load does not claim confirmed empty", async (context) => {
    const environment = await fixture({ reads: "http500" });
    context.after(environment.close);
    await environment.click("#notification-toggle");
    console.log(
        JSON.stringify({
            scenario: "initial failure",
            result: environment.snapshot(),
        }),
    );
    assert.equal(environment.snapshot().empty, false);
    assert.ok(environment.notices.length > 0);
});

for (const [label, selector] of [
    ["mark all", ".notification-mark-all-read"],
    ["mark one", ".notification-item"],
    ["dismiss", ".notification-dismiss"],
]) {
    test(`desired: HTTP 500 ${label} does not apply success state`, async (context) => {
        const environment = await fixture({ writes: "http500" });
        context.after(environment.close);
        await environment.click("#notification-toggle");
        await environment.click(selector);
        const result = environment.snapshot();
        console.log(
            JSON.stringify({
                scenario: `HTTP500 ${label}`,
                result,
                syntheticStore: environment.state.rows,
            }),
        );
        assert.equal(result.rows, 1);
        assert.equal(result.unread, 1);
        assert.equal(result.badge, "1");
        assert.ok(result.errors > 0);
    });
}

test("desired: acknowledged read survives failed reconciliation", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    environment.state.rows.push({
        ...environment.state.rows[0],
        id: "second-synthetic-notice",
    });
    await environment.click("#notification-toggle");
    environment.state.reads = "http500";
    await environment.click(".notification-item");
    assert.equal(environment.state.rows[0].read, true);
    const result = environment.snapshot();
    console.log(
        JSON.stringify({
            scenario: "accepted mark-one, failed refresh",
            result,
        }),
    );
    assert.equal(result.unread, 1);
    assert.equal(result.badge, "1");
    assert.ok(
        result.errors > 0,
        "Refresh failure needs distinct feedback without replaying accepted write",
    );
});

test("control: unknown write outcome is not automatically replayed", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    environment.state.intercept = (path, init) => {
        if (init.method === "DELETE") {
            environment.state.rows = [];
            throw new TypeError("synthetic reply lost after commit");
        }
    };
    await environment.click(".notification-dismiss");
    assert.equal(environment.snapshot().rows, 1);
    assert.equal(environment.state.rows.length, 0);
    assert.equal(environment.notices.length, 1);
    assert.equal(
        environment.requests.filter((request) => request.method === "DELETE")
            .length,
        1,
    );
    await environment.poll();
    assert.equal(environment.snapshot().rows, 0);
    assert.equal(
        environment.requests.filter((request) => request.method === "DELETE")
            .length,
        1,
    );
});

test("desired: same-id read-state refresh reconciles visible rows", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    environment.state.rows = environment.state.rows.map((row) => ({
        ...row,
        read: true,
    }));
    await environment.poll();
    const result = environment.snapshot();
    console.log(JSON.stringify({ scenario: "same-id read refresh", result }));
    assert.equal(result.badge, "0");
    assert.equal(result.unread, 0);
});

test("desired: older panel request cannot overwrite a newer opening", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    const oldRead = deferred();
    let interceptNext = true;
    environment.state.intercept = (path, init) => {
        if (
            path === "/api/v1/notify/inbox" &&
            (init.method ?? "GET") === "GET" &&
            interceptNext
        ) {
            interceptNext = false;
            return oldRead.promise;
        }
    };
    await environment.click("#notification-toggle");
    await environment.click("#notification-toggle");
    environment.state.rows = [];
    await environment.click("#notification-toggle");
    assert.equal(environment.snapshot().rows, 0);
    oldRead.resolve(
        Response.json({
            data: [
                {
                    id: "stale",
                    subject: "Stale",
                    body: "",
                    createdAt: 1000,
                    read: false,
                },
            ],
        }),
    );
    await settle();
    console.log(
        JSON.stringify({
            scenario: "stale open completion",
            result: environment.snapshot(),
        }),
    );
    assert.equal(environment.snapshot().rows, 0);
});

for (const [label, selector] of [
    ["mark all", ".notification-mark-all-read"],
    ["mark one", ".notification-item"],
    ["dismiss", ".notification-dismiss"],
]) {
    test(`control: transport rejection ${label} keeps synthetic record and reports failure`, async (context) => {
        const environment = await fixture({ writes: "reject" });
        context.after(environment.close);
        await environment.click("#notification-toggle");
        await environment.click(selector);
        assert.equal(environment.snapshot().rows, 1);
        assert.equal(environment.snapshot().unread, 1);
        assert.equal(environment.state.rows[0].read, false);
        assert.equal(environment.notices.length, 1);
    });
}

test("control: successful empty and recovery remain distinguishable from known data", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    const saved = environment.state.rows;
    environment.state.rows = [];
    await environment.poll();
    assert.equal(environment.snapshot().empty, true);
    assert.equal(environment.snapshot().badge, "0");
    environment.state.rows = saved;
    await environment.poll();
    assert.equal(environment.snapshot().rows, 1);
    assert.equal(environment.snapshot().empty, false);
    assert.equal(environment.snapshot().search, 1);
});

test("control: accepted dismiss removes row and synthetic record", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    await environment.click(".notification-dismiss");
    assert.equal(environment.snapshot().rows, 0);
    assert.equal(environment.state.rows.length, 0);
    assert.equal(environment.snapshot().badge, "0");
    assert.equal(environment.notices.length, 0);
});
