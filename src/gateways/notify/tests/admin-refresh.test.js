import test from "node:test";
import assert from "node:assert/strict";
import {
    environment,
    broadcasts,
    deferred,
    response,
    settle,
} from "./fixtures/administration.js";

for (const failure of ["http", "network", "malformed", "invalid-json"]) {
    test(`Broadcast accepted create survives ${failure} list refresh without retrying the write`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        const selected = fixture.root.querySelector(
            '.notif-broadcast-row[data-broadcast-id="A"]',
        );
        selected.click();
        await settle();
        const table = fixture.root.querySelector(".notif-broadcast-table-body");
        const originalContent = table.innerHTML;
        fixture.intercept((request) => {
            if (
                request.method !== "GET" ||
                request.url !== "/api/v1/notify/broadcasts"
            )
                return;
            if (failure === "network")
                throw new TypeError("Synthetic refresh failure");
            if (failure === "invalid-json") return new Response("{broken");
            return failure === "http"
                ? response([], 500)
                : response({ invalid: true });
        });
        fixture.fill();
        fixture.button().click();
        await settle();
        assert.equal(fixture.writes().length, 1);
        assert.equal(fixture.writes()[0].url, "/api/v1/notify/broadcasts");
        assert.equal(
            fixture.requests.filter(
                (request) =>
                    request.method === "GET" &&
                    request.url === "/api/v1/notify/broadcasts",
            ).length,
            2,
        );
        assert.equal(table.innerHTML, originalContent);
        assert.equal(selected.getAttribute("aria-expanded"), "true");
        assert.equal(
            fixture.root.querySelector(".notif-broadcast-ack-row").dataset
                .parentId,
            "A",
        );
        assert.deepEqual(fixture.notices, [
            {
                message: fixture.i18n.t(
                    "gateway.notify.admin.broadcast_created",
                ),
                variant: "success",
            },
            {
                message: fixture.i18n.t(
                    "gateway.notify.admin.broadcast_refresh_failed",
                ),
                variant: "error",
            },
        ]);
        assert.equal(fixture.section.isDirty(), false);
        assert.equal(fixture.field("broadcastTitle").value, "");
        assert.equal(fixture.button().disabled, false);
        await settle();
        assert.equal(fixture.writes().length, 1);
        fixture.edit("broadcastTitle", "Keep my next draft");
        const refreshedRows = ["http", "network"].includes(failure)
            ? [{ ...broadcasts[1], title: "Authoritative refreshed broadcast" }]
            : [];
        fixture.intercept((request) =>
            request.method === "GET" &&
            request.url === "/api/v1/notify/broadcasts"
                ? response(refreshedRows)
                : undefined,
        );
        const previousRequestCount = fixture.requests.length;
        fixture.root.querySelector(".notif-broadcast-refresh").click();
        await settle();
        assert.deepEqual(
            fixture.requests
                .slice(previousRequestCount)
                .map(({ method, url }) => ({ method, url })),
            [{ method: "GET", url: "/api/v1/notify/broadcasts" }],
        );
        assert.equal(fixture.writes().length, 1);
        assert.equal(
            table.querySelectorAll(".notif-broadcast-row").length,
            refreshedRows.length,
        );
        if (refreshedRows.length)
            assert.match(
                table.textContent,
                /Authoritative refreshed broadcast/,
            );
        else
            assert.equal(
                table.querySelector(".notif-broadcast-empty-cell").textContent,
                fixture.i18n.t("gateway.notify.admin.broadcast_none"),
            );
        assert.equal(table.querySelector(".notif-broadcast-ack-row"), null);
        assert.equal(
            fixture.field("broadcastTitle").value,
            "Keep my next draft",
        );
        assert.equal(fixture.section.isDirty(), true);
        assert.equal(fixture.notices.length, 2);
    });
}

test("Broadcast successful refresh commits new rows and invalidates pending old details", async (context) => {
    const fixture = await environment("broadcasts");
    context.after(fixture.close);
    const pending = deferred();
    const replacement = { ...broadcasts[0], title: "Updated broadcast A" };
    fixture.intercept((request) => {
        if (request.url.endsWith("/A/states")) return pending.promise;
        if (
            request.method === "GET" &&
            request.url === "/api/v1/notify/broadcasts"
        )
            return response([replacement]);
    });
    fixture.root
        .querySelector('.notif-broadcast-row[data-broadcast-id="A"]')
        .click();
    fixture.fill();
    fixture.button().click();
    await settle();
    const table = fixture.root.querySelector(".notif-broadcast-table-body");
    assert.equal(table.querySelectorAll(".notif-broadcast-row").length, 1);
    assert.match(table.textContent, /Updated broadcast A/);
    assert.equal(
        table
            .querySelector(".notif-broadcast-row")
            .getAttribute("aria-expanded"),
        "false",
    );
    pending.resolve(
        response([{ accountId: "synthetic-user", acknowledgedAt: 123 }]),
    );
    await settle();
    assert.equal(table.querySelector(".notif-broadcast-ack-row"), null);
    fixture.intercept((request) =>
        request.url.endsWith("/A/states") ? response([]) : undefined,
    );
    table.querySelector(".notif-broadcast-row").click();
    await settle();
    assert.equal(
        fixture.requests.filter((request) => request.url.endsWith("/A/states"))
            .length,
        2,
    );
    assert.equal(
        table.querySelector(".notif-broadcast-ack-row").dataset.parentId,
        "A",
    );
    assert.equal(fixture.writes().length, 1);
    assert.deepEqual(
        fixture.notices.map((notice) => notice.variant),
        ["success"],
    );
});

for (const failure of ["http", "network"]) {
    test(`Broadcast toggle ${failure} failure settles busy controls and permits explicit retry`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        fixture.intercept((request) => {
            if (request.method !== "POST") return;
            if (failure === "network")
                throw new TypeError("Synthetic toggle failure");
            return response([], 500);
        });
        fixture.root.querySelector(".notif-broadcast-toggle").click();
        await settle();
        assert.equal(fixture.writes().length, 1);
        assert.deepEqual(fixture.notices, [
            {
                message: fixture.i18n.t(
                    "gateway.notify.admin.broadcast_toggle_failed",
                ),
                variant: "error",
            },
        ]);
        for (const button of fixture.root.querySelectorAll(
            ".notif-broadcast-create, .notif-broadcast-toggle",
        )) {
            assert.equal(button.disabled, false);
            assert.equal(button.getAttribute("aria-busy"), "false");
        }
        fixture.intercept(undefined);
        fixture.root.querySelector(".notif-broadcast-toggle").click();
        await settle();
        assert.equal(fixture.writes().length, 2);
        assert.equal(fixture.notices.length, 1);
    });
}

for (const pendingStage of ["write", "refresh"]) {
    test(`Broadcast rerender during pending ${pendingStage} commits accepted create to current panel`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        const pending = deferred();
        const replacement = {
            ...broadcasts[0],
            title: "Accepted new broadcast",
        };
        fixture.intercept((request) => {
            if (request.method === "POST" && pendingStage === "write")
                return pending.promise;
            if (
                request.method === "GET" &&
                request.url === "/api/v1/notify/broadcasts"
            ) {
                return pendingStage === "refresh"
                    ? pending.promise
                    : response([replacement]);
            }
        });
        fixture.fill();
        fixture.button().click();
        await settle();
        const pendingRequest = fixture.requests.at(-1);
        fixture.render();
        assert.equal(pendingRequest.signal.aborted, false);
        assert.equal(
            fixture.root.querySelector(".notif-broadcast-refresh").disabled,
            true,
        );
        assert.equal(fixture.button().disabled, true);
        fixture.button().dispatchEvent(new fixture.window.Event("click"));
        pending.resolve(
            response(pendingStage === "write" ? [] : [replacement]),
        );
        await settle();
        assert.equal(fixture.writes().length, 1);
        assert.equal(fixture.field("broadcastTitle").value, "");
        assert.equal(fixture.section.isDirty(), false);
        assert.equal(fixture.button().disabled, false);
        assert.equal(
            fixture.root.querySelectorAll(".notif-broadcast-row").length,
            1,
        );
        assert.match(
            fixture.root.querySelector(".notif-broadcast-table-body")
                .textContent,
            /Accepted new broadcast/,
        );
        assert.deepEqual(fixture.notices, [
            {
                message: fixture.i18n.t(
                    "gateway.notify.admin.broadcast_created",
                ),
                variant: "success",
            },
        ]);
    });
}
