import test from "node:test";
import assert from "node:assert/strict";
import {
    environment,
    deferred,
    response,
    settle,
} from "./fixtures/administration.js";

const expected = {
    notifications: {
        recipientUsername: "synthetic-user",
        category: "system",
        subject: "Synthetic title",
        body: "Synthetic message",
    },
    broadcasts: {
        title: "Synthetic title",
        message: "Synthetic message",
        displayMode: "bar",
        targetRoles: ["user"],
        startAt: null,
        endAt: null,
        requireAcknowledgement: false,
        redirectUrl: null,
        enabled: true,
    },
};
for (const kind of ["notifications", "broadcasts"]) {
    test(`${kind} repeated binding and activation issue one pending POST and one outcome`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        fixture.fill();
        fixture.section.subComposerOptions.onRender(fixture.root);
        fixture.section.subComposerOptions.onRender(fixture.root);
        const pending = deferred();
        fixture.intercept((request) =>
            request.method === "POST" ? pending.promise : undefined,
        );
        fixture.button().click();
        fixture.button().click();
        fixture.button().dispatchEvent(new fixture.window.Event("click"));
        await settle();
        assert.equal(fixture.writes().length, 1);
        assert.deepEqual(fixture.writes()[0].body, expected[kind]);
        assert.equal(fixture.button().disabled, true);
        assert.equal(fixture.button().getAttribute("aria-busy"), "true");
        pending.resolve(response());
        await settle();
        assert.equal(
            fixture.notices.filter((notice) => notice.variant === "success")
                .length,
            1,
        );
        assert.equal(fixture.button().disabled, false);
        assert.equal(fixture.button().getAttribute("aria-busy"), "false");
        assert.equal(
            fixture.logs.some(([, , detail]) =>
                JSON.stringify(detail).includes("Synthetic title"),
            ),
            false,
        );
    });

    for (const failure of ["http", "network", "malformed"]) {
        test(`${kind} ${failure} rejection keeps the draft and permits explicit retry`, async (context) => {
            const fixture = await environment(kind);
            context.after(fixture.close);
            fixture.fill();
            fixture.intercept((request) => {
                if (request.method !== "POST") return;
                if (failure === "network")
                    throw new TypeError("Synthetic failure");
                if (failure === "malformed")
                    return new Response("{broken", { status: 400 });
                return response(null, 500);
            });
            fixture.button().click();
            await settle();
            assert.equal(fixture.writes().length, 1);
            assert.equal(fixture.section.isDirty(), true);
            assert.equal(
                fixture.field(
                    kind === "notifications"
                        ? "debugSubject"
                        : "broadcastTitle",
                ).value,
                "Synthetic title",
            );
            assert.deepEqual(
                fixture.notices.map((notice) => notice.variant),
                ["error"],
            );
            assert.equal(fixture.button().disabled, false);
            fixture.intercept(undefined);
            fixture.button().click();
            await settle();
            assert.equal(fixture.writes().length, 2);
            assert.deepEqual(
                fixture.notices.map((notice) => notice.variant),
                ["error", "success"],
            );
        });
    }

    test(`${kind} validation does not send and releases busy state`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        fixture.button().click();
        await settle();
        assert.equal(fixture.writes().length, 0);
        assert.deepEqual(
            fixture.notices.map((notice) => notice.variant),
            ["warning"],
        );
        assert.equal(fixture.button().disabled, false);
        fixture.fill();
        fixture.button().click();
        await settle();
        assert.equal(fixture.writes().length, 1);
    });
}

for (const action of ["repeat", "discard", "unmount", "account"]) {
    test(`Broadcast prerequisite pending ${action} cannot publish twice or under revoked intent`, async (context) => {
        const fixture = await environment("broadcasts");
        context.after(fixture.close);
        fixture.fill();
        const pending = deferred();
        fixture.intercept((request) =>
            request.url === "/api/v1/system/security"
                ? pending.promise
                : undefined,
        );
        fixture.button().click();
        await settle();
        assert.equal(fixture.button().disabled, true);
        assert.equal(fixture.writes().length, 0);
        if (action === "repeat")
            fixture.button().dispatchEvent(new fixture.window.Event("click"));
        if (action === "discard") fixture.section.discard();
        if (action === "unmount") fixture.unmount();
        if (action === "account")
            fixture.window.localStorage.setItem(
                "cognis_account",
                "another-admin",
            );
        pending.resolve(response({ trustedDomains: [] }));
        await settle();
        assert.equal(fixture.writes().length, action === "repeat" ? 1 : 0);
        assert.equal(fixture.notices.length, action === "repeat" ? 1 : 0);
    });
}
