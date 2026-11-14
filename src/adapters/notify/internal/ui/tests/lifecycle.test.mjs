import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixture, deferred, settle } from "./fixture.mjs";

const writes = (environment) =>
    environment.requests.filter((request) =>
        ["PUT", "DELETE"].includes(request.method),
    );

for (const payload of [
    {},
    { data: {} },
    { data: [null] },
    { data: [{ id: "bad" }] },
]) {
    test(`malformed inbox payload retains confirmed data: ${JSON.stringify(payload)}`, async (context) => {
        const environment = await fixture();
        context.after(environment.close);
        await environment.click("#notification-toggle");
        environment.state.intercept = () => Response.json(payload);
        await environment.poll();
        assert.equal(environment.snapshot().rows, 1);
        assert.equal(environment.snapshot().search, 1);
        assert.equal(environment.snapshot().empty, false);
        assert.ok(environment.notices[0][0].endsWith("error_refresh"));
    });
}

for (const selector of [
    ".notification-mark-all-read",
    ".notification-item",
    ".notification-dismiss",
    ".notification-clear-all",
]) {
    test(`malformed successful mutation is uncertain and is not replayed: ${selector}`, async (context) => {
        const environment = await fixture({
            writes: "malformed",
            popup: () => "confirm",
        });
        context.after(environment.close);
        await environment.click("#notification-toggle");
        await environment.click(selector);
        assert.equal(environment.snapshot().unread, 1);
        assert.equal(environment.snapshot().rows, 1);
        assert.ok(environment.notices[0][0].endsWith("error_change_uncertain"));
        await environment.click(selector);
        assert.equal(writes(environment).length, 1);
        await environment.click("#notification-toggle");
        await environment.click(".notification-retry");
        assert.equal(writes(environment).length, 1);
    });
}

test("rejected mutation uses distinct feedback, read-only Retry restores controls", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    environment.state.intercept = (path, init) =>
        init.method === "DELETE"
            ? Response.json({}, { status: 403 })
            : undefined;
    await environment.click(".notification-dismiss");
    assert.ok(environment.notices[0][0].endsWith("error_change_rejected"));
    assert.equal(
        environment.document.querySelector(".notification-retry").hidden,
        false,
    );
    environment.state.intercept = undefined;
    await environment.click(".notification-retry");
    assert.equal(environment.snapshot().clearDisabled, false);
    assert.equal(writes(environment).length, 1);
});

test("pending writes disable controls and fence an older poll", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    const older = deferred();
    const mutation = deferred();
    let getCount = 0;
    environment.state.intercept = (path, init) => {
        if (init.method === "PUT") return mutation.promise;
        if (++getCount === 1) return older.promise;
    };
    const poll = environment.poll();
    await settle();
    await environment.click(".notification-mark-all-read");
    assert.equal(
        environment.document.querySelector(".notification-dismiss").disabled,
        true,
    );
    await environment.click(".notification-item");
    await environment.click(".notification-mark-all-read");
    assert.equal(writes(environment).length, 1);
    older.resolve(Response.json({ data: [] }));
    await poll;
    assert.equal(environment.snapshot().rows, 1);
    environment.state.rows[0].read = true;
    mutation.resolve(Response.json({ data: { ok: true } }));
    await settle();
    assert.equal(environment.snapshot().unread, 0);
    assert.equal(
        environment.document.querySelector(".notification-dismiss").disabled,
        false,
    );
});

for (const change of [
    "token",
    "account",
    "page",
    "close",
    "removed-row",
    "provider",
    "logout",
]) {
    test(`pending mutation cannot affect a changed ${change} lifetime`, async (context) => {
        const environment = await fixture();
        context.after(environment.close);
        await environment.click("#notification-toggle");
        const pending = deferred();
        environment.state.intercept = (path, init) =>
            init.method === "PUT" ? pending.promise : undefined;
        await environment.click(".notification-item");
        const errorsBefore = environment.notices.length;
        if (change === "token")
            environment.window.localStorage.setItem(
                "cognis_access_token",
                "new-synthetic-token",
            );
        if (change === "account")
            environment.window.localStorage.setItem(
                "cognis_account",
                "other-fixture-account",
            );
        if (change === "page")
            await environment.uiCtx.runFlow("page:mounted", {});
        if (change === "close") await environment.click("#notification-toggle");
        if (change === "removed-row")
            environment.document.querySelector(".notification-item").remove();
        if (change === "provider") environment.providerController.abort();
        if (change === "logout") await environment.uiCtx.runFlow("logout", {});
        pending.resolve(Response.json({ data: { ok: true } }));
        await settle();
        assert.equal(environment.notices.length, errorsBefore);
        assert.equal(
            environment.requests.filter(
                (request) => request.method === "NAVIGATE",
            ).length,
            0,
        );
        if (["token", "account"].includes(change))
            assert.equal(environment.search.get("notifications")().length, 0);
        if (["provider", "logout"].includes(change)) {
            assert.equal(
                environment.document.querySelector("#notification-toggle"),
                null,
            );
            assert.equal(environment.search.size, 0);
            assert.equal(
                [...environment.timers.values()].filter(
                    (timer) =>
                        timer.interval ||
                        ["tick", "expireToast"].includes(timer.callback.name),
                ).length,
                0,
            );
        }
    });
}

test("same-id content, order and read state update both list and search", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    environment.state.rows.push({
        ...environment.state.rows[0],
        id: "second-notice",
        subject: "Second",
    });
    await environment.click("#notification-toggle");
    environment.state.rows = environment.state.rows.toReversed().map((row) => ({
        ...row,
        read: true,
        subject: row.subject + " revised",
    }));
    await environment.poll();
    assert.equal(
        environment.document.querySelector(".notification-item").dataset.id,
        "second-notice",
    );
    assert.equal(
        environment.document.querySelector(".notification-item-subject")
            .textContent,
        "Second revised",
    );
    assert.equal(
        environment.search.get("notifications")()[0].items[0].label,
        "Second revised",
    );
    assert.equal(environment.snapshot().unread, 0);
});

test("clear confirmation is single-flight and cannot write after reopening", async (context) => {
    const confirmation = deferred();
    const environment = await fixture({ popup: () => confirmation.promise });
    context.after(environment.close);
    await environment.click("#notification-toggle");
    await environment.click(".notification-clear-all");
    await environment.poll();
    await environment.click(".notification-clear-all");
    assert.equal(environment.state.popupCalls, 1);
    await environment.click("#notification-toggle");
    await environment.click("#notification-toggle");
    confirmation.resolve("confirm");
    await settle();
    assert.equal(writes(environment).length, 0);
});

test("bulk write reconciles newer arrivals without inventing read status", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    const pending = deferred();
    environment.state.intercept = (path, init) =>
        init.method === "PUT" ? pending.promise : undefined;
    await environment.click(".notification-mark-all-read");
    environment.state.rows = [
        { ...environment.state.rows[0], id: "new-arrival" },
        { ...environment.state.rows[0], read: true },
    ];
    pending.resolve(Response.json({ data: { ok: true } }));
    await settle();
    assert.equal(environment.snapshot().rows, 2);
    assert.equal(environment.snapshot().badge, "1");
    assert.equal(environment.snapshot().unread, 1);
});

test("expired provider cannot publish a pending decrypted arrival", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    const key = deferred();
    environment.capabilities.set(
        "social:messages:loadChatRoomKey",
        () => key.promise,
    );
    environment.state.rows.unshift({
        ...environment.state.rows[0],
        id: "message-arrival",
        category: "messages",
        actionUrl: "/messages/fixture-room",
    });
    await environment.poll();
    environment.providerController.abort();
    key.resolve(null);
    await settle();
    assert.equal(environment.document.querySelector(".arrival-toast"), null);
    assert.equal(
        [...environment.timers.values()].filter(
            (timer) =>
                timer.interval ||
                ["tick", "expireToast"].includes(timer.callback.name),
        ).length,
        0,
    );
});

test("correlation cleanup does not replay an uncertain deletion", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    environment.state.rows[0].metadata = {
        correlationId: "fixture-correlation",
        continuous: true,
        expiresAt: Date.now() + 10000,
    };
    environment.state.intercept = (path, init) => {
        if (init.method === "DELETE") {
            environment.state.rows = [];
            throw new TypeError("lost receipt");
        }
    };
    environment.window.dispatchEvent(
        new environment.window.CustomEvent("cognis:notification-resolved", {
            detail: { correlationId: "fixture-correlation" },
        }),
    );
    await settle();
    assert.equal(writes(environment).length, 1);
    assert.ok(environment.notices[0][0].endsWith("error_change_uncertain"));
    await environment.poll();
    assert.equal(writes(environment).length, 1);
    assert.equal(environment.search.get("notifications")().length, 0);
});

test("public read and mutation flows execute their registered stages", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    await environment.click(".notification-dismiss");
    assert.ok(environment.flowCalls.includes("notify:internal:readInbox"));
    assert.ok(environment.flowCalls.includes("notify:internal:mutateInbox"));
    assert.equal(environment.state.rows.length, 0);
    assert.ok(
        environment.sourceFiles.some((path) => path.endsWith("/api-client.js")),
    );
    assert.ok(
        environment.sourceFiles.some((path) =>
            path.endsWith("/transient-surfaces.js"),
        ),
    );
});

test("confirmed empty Clear remains inert even if a stale control is enabled", async (context) => {
    const environment = await fixture({ rows: [] });
    context.after(environment.close);
    await environment.click("#notification-toggle");
    assert.equal(environment.snapshot().clearDisabled, true);
    environment.document.querySelector(".notification-clear-all").disabled =
        false;
    await environment.click(".notification-clear-all");
    assert.equal(environment.state.popupCalls ?? 0, 0);
    assert.equal(writes(environment).length, 0);
});

test("arrival events preserve continuous and current-page popup policies", async (context) => {
    const environment = await fixture({ rows: [] });
    context.after(environment.close);
    const arrivals = [];
    environment.window.addEventListener(
        "cognis:notification-arrival",
        (event) => arrivals.push(event.detail.notification.id),
    );
    const row = {
        id: "page",
        subject: "Fixture",
        body: "",
        read: false,
        createdAt: 1,
        category: "dashboard",
        actionUrl: "/dashboard",
    };
    environment.state.rows = [
        row,
        {
            ...row,
            id: "persistent",
            metadata: { continuous: true, expiresAt: Date.now() + 5000 },
        },
    ];
    await environment.poll();
    assert.deepEqual(arrivals, ["page", "persistent"]);
    assert.equal(
        environment.document.querySelectorAll(".arrival-toast").length,
        1,
    );
    assert.equal(
        environment.document.querySelector(".arrival-toast--persistent") !==
            null,
        true,
    );
    await environment.click("#notification-toggle");
    assert.equal(environment.snapshot().rows, 1);
    assert.equal(environment.snapshot().badge, "1");
});

test("notification navigation can be handled by a component-neutral event", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    let actionUrl;
    environment.window.addEventListener(
        "cognis:notification-action",
        (event) => {
            actionUrl = event.detail.actionUrl;
            event.preventDefault();
        },
    );
    await environment.click("#notification-toggle");
    await environment.click(".notification-item");
    assert.equal(actionUrl, "https://synthetic.invalid/synthetic-destination");
    assert.equal(
        environment.requests.filter((request) => request.method === "NAVIGATE")
            .length,
        0,
    );
});

test("tutorial transient lifetime closes panel and rejects pending opening", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    const pending = deferred();
    environment.state.intercept = () => pending.promise;
    await environment.click("#notification-toggle");
    const controller = new environment.window.AbortController();
    const panel = environment.document.querySelector(".notification-panel");
    assert.equal(
        environment.capabilities
            .get("ui:transientSurfaces")
            .attachLifetime(panel, controller.signal),
        true,
    );
    controller.abort();
    assert.equal(panel.hidden, true);
    pending.resolve(Response.json({ data: [] }));
    await settle();
    assert.equal(environment.snapshot().rows, 1);
    assert.equal(panel.hidden, true);
});

test("mobile backdrop stays hidden until the panel opens", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    const backdrop = environment.document.querySelector(
        ".notification-mobile-backdrop",
    );
    assert.equal(backdrop.hidden, true);
    await environment.click("#notification-toggle");
    assert.equal(backdrop.hidden, false);
    await environment.click(".notification-mobile-backdrop");
    assert.equal(backdrop.hidden, true);
    const css = readFileSync(
        new URL("../notifications.css", import.meta.url),
        "utf8",
    );
    assert.match(css, /\.notification-mobile-backdrop\[hidden\]\s*\{/);
    assert.match(css, /\.notification-mobile-backdrop:not\(\[hidden\]\)\s*\{/);
});

test("notification bell waits for its stylesheet before mounting", async (context) => {
    const environment = await fixture({ deferStyles: true });
    context.after(environment.close);
    assert.ok(environment.document.querySelector("#notification-toggle"));
});

for (const lifecycle of ["account", "provider"]) {
    test(`pending room key cannot start a message request after ${lifecycle} change`, async (context) => {
        const environment = await fixture();
        context.after(environment.close);
        const key = deferred();
        environment.capabilities.set(
            "social:messages:loadChatRoomKey",
            () => key.promise,
        );
        environment.state.rows.unshift({
            ...environment.state.rows[0],
            id: "message-arrival",
            category: "messages",
            actionUrl: "/messages/fixture-room",
        });
        await environment.poll();
        if (lifecycle === "account")
            environment.window.localStorage.setItem(
                "cognis_access_token",
                "new-fixture-token",
            );
        else environment.providerController.abort();
        key.resolve({ type: "synthetic-key" });
        await settle();
        assert.equal(
            environment.requests.filter((request) =>
                request.path.startsWith("/api/v1/social/"),
            ).length,
            0,
        );
        assert.equal(
            environment.document.querySelector(".arrival-toast"),
            null,
        );
    });
}

test("removed arrival cannot navigate through a retained stale control", async (context) => {
    const environment = await fixture({ rows: [] });
    context.after(environment.close);
    environment.state.rows = [
        {
            id: "arrival",
            subject: "Notice",
            body: "",
            createdAt: 1,
            read: false,
            actionUrl: "/other-page",
        },
    ];
    await environment.poll();
    const toast = environment.document.querySelector(".arrival-toast");
    environment.state.rows = [];
    await environment.poll();
    toast.click();
    await settle();
    assert.equal(toast.isConnected, false);
    assert.equal(
        environment.requests.filter((request) => request.method === "NAVIGATE")
            .length,
        0,
    );
});

test("same-id arrival edits replace action authority without another arrival event", async (context) => {
    const environment = await fixture({ rows: [] });
    context.after(environment.close);
    const commands = [];
    const arrivals = [];
    environment.window.addEventListener(
        "cognis:notification-command",
        (event) => commands.push(event.detail.actionId),
    );
    environment.window.addEventListener(
        "cognis:notification-arrival",
        (event) => arrivals.push(event.detail.notification.id),
    );
    environment.state.rows = [
        {
            id: "arrival",
            subject: "Notice",
            body: "",
            createdAt: 1,
            read: false,
            metadata: {
                continuous: true,
                expiresAt: Date.now() + 5000,
                actions: [{ id: "old", label: "Old" }],
            },
        },
    ];
    await environment.poll();
    const old = environment.document.querySelector(
        "[data-notification-action]",
    );
    environment.state.rows[0].metadata.actions = [{ id: "new", label: "New" }];
    await environment.poll();
    old.click();
    await environment.click("[data-notification-action]");
    assert.deepEqual(commands, ["new"]);
    assert.deepEqual(arrivals, ["arrival"]);
});

test("removed arrival cannot appear after its pending key finishes", async (context) => {
    const environment = await fixture({ rows: [] });
    context.after(environment.close);
    const key = deferred();
    environment.capabilities.set(
        "social:messages:loadChatRoomKey",
        () => key.promise,
    );
    environment.state.rows = [
        {
            id: "arrival",
            subject: "Notice",
            body: "",
            createdAt: 1,
            read: false,
            category: "messages",
            actionUrl: "/messages/fixture-room",
        },
    ];
    await environment.poll();
    environment.state.rows = [];
    await environment.poll();
    key.resolve(null);
    await settle();
    assert.equal(environment.document.querySelector(".arrival-toast"), null);
});

test("background polling does not restart the closed panel ticker", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    await environment.click("#notification-toggle");
    assert.ok([...environment.timers.values()].some((timer) => timer.interval));
    await environment.click("#notification-toggle");
    await environment.poll();
    assert.equal(
        [...environment.timers.values()].some((timer) => timer.interval),
        false,
    );
});

for (const pendingWrite of [false, true]) {
    test(`distinct correlation resolutions survive concurrent events with pending write ${pendingWrite}`, async (context) => {
        const environment = await fixture();
        context.after(environment.close);
        environment.state.rows = ["first", "second"].map((id, index) => ({
            ...environment.state.rows[0],
            id,
            metadata: {
                correlationId: `correlation-${index}`,
                continuous: true,
                expiresAt: Date.now() + 10000,
            },
        }));
        await environment.click("#notification-toggle");
        const mutation = deferred();
        if (pendingWrite) {
            environment.state.intercept = (path, init) =>
                init.method === "PUT" ? mutation.promise : undefined;
            await environment.click(".notification-mark-all-read");
        }
        for (const id of ["correlation-0", "correlation-1", "correlation-0"]) {
            environment.window.dispatchEvent(
                new environment.window.CustomEvent(
                    "cognis:notification-resolved",
                    { detail: { correlationId: id } },
                ),
            );
        }
        if (pendingWrite)
            mutation.resolve(Response.json({ data: { ok: true } }));
        await settle();
        await settle();
        assert.equal(
            environment.requests.filter(
                (request) => request.method === "DELETE",
            ).length,
            2,
        );
        assert.equal(environment.state.rows.length, 0);
    });
}

test("repeated producer resolution does not replay an unconfirmed deletion", async (context) => {
    const environment = await fixture({ writes: "reject" });
    context.after(environment.close);
    environment.state.rows[0].metadata = { correlationId: "same-resolution" };
    const resolve = () =>
        environment.window.dispatchEvent(
            new environment.window.CustomEvent("cognis:notification-resolved", {
                detail: { correlationId: "same-resolution" },
            }),
        );
    resolve();
    await settle();
    assert.equal(
        environment.requests.filter((request) => request.method === "DELETE")
            .length,
        1,
    );
    resolve();
    await settle();
    assert.equal(
        environment.requests.filter((request) => request.method === "DELETE")
            .length,
        1,
    );
});

test("queued resolution rechecks current correlation after each accepted deletion", async (context) => {
    const environment = await fixture();
    context.after(environment.close);
    environment.state.rows = ["first", "second"].map((id) => ({
        ...environment.state.rows[0],
        id,
        metadata: { correlationId: "original-correlation" },
    }));
    await environment.poll();
    const deletion = deferred();
    environment.state.intercept = (path, init) =>
        init.method === "DELETE" && path.endsWith("/first")
            ? deletion.promise
            : undefined;
    environment.window.dispatchEvent(
        new environment.window.CustomEvent("cognis:notification-resolved", {
            detail: { correlationId: "original-correlation" },
        }),
    );
    await settle();
    environment.state.rows = [
        {
            ...environment.state.rows[1],
            metadata: { correlationId: "new-correlation" },
        },
    ];
    deletion.resolve(Response.json({ data: { ok: true } }));
    await settle();
    await settle();
    assert.equal(
        environment.requests.filter((request) => request.method === "DELETE")
            .length,
        1,
    );
    assert.equal(environment.state.rows[0].id, "second");
});

test("removed arrival cannot report a late preview failure", async (context) => {
    const environment = await fixture({ rows: [] });
    context.after(environment.close);
    const key = deferred();
    environment.capabilities.set(
        "social:messages:loadChatRoomKey",
        () => key.promise,
    );
    environment.state.rows = [
        {
            id: "arrival",
            subject: "Notice",
            body: "",
            createdAt: 1,
            read: false,
            category: "messages",
            actionUrl: "/messages/fixture-room",
        },
    ];
    await environment.poll();
    environment.state.rows = [];
    await environment.poll();
    key.resolve(Promise.reject(new TypeError("Synthetic key unavailable")));
    await settle();
    assert.equal(environment.notices.length, 0);
});
