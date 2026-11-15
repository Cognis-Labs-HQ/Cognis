import assert from "node:assert/strict";
import test from "node:test";
import { roomFixture } from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

for (const outcome of [
    "cancel",
    "confirm",
    "Escape",
    "close",
    "backdrop",
    "Enter",
    " ",
]) {
    test(`Leave popup respects ${JSON.stringify(outcome)} with one registered request`, async (context) => {
        const fixture = await roomFixture(context);
        const pending = fixture.openLeave();
        await fixture.settle();
        const overlay = fixture.active().at(-1);
        const cancel = overlay.querySelector('[data-popup-action="cancel"]');
        const confirm = overlay.querySelector('[data-popup-action="confirm"]');
        assert.ok(cancel.classList.contains("btn-neutral"));
        assert.ok(confirm.classList.contains("btn-cancel"));
        if (outcome === "Escape") fixture.key("Escape");
        else if (outcome === "backdrop") overlay.click();
        else if (["Enter", " "].includes(outcome)) {
            cancel.focus();
            assert.equal(fixture.key(outcome).defaultPrevented, false);
            assert.equal(fixture.deletes().length, 0);
            cancel.click();
        } else
            overlay.querySelector(`[data-popup-action="${outcome}"]`).click();
        confirm.click();
        await pending;
        assert.equal(fixture.deletes().length, outcome === "confirm" ? 1 : 0);
        if (outcome === "confirm")
            assert.equal(
                fixture.deletes()[0].path,
                "/api/v1/social/messages/rooms/A/members/fixture-reader",
            );
    });
}

for (const change of [
    "selection",
    "roundtrip",
    "abort",
    "cleanup",
    "account",
    "token",
    "membership",
    "handle",
    "provider",
]) {
    test(`${change} makes the original Leave confirmation inert`, async (context) => {
        const fixture = await roomFixture(context);
        const pending = fixture.openLeave();
        await fixture.settle();
        const confirm = fixture
            .active()
            .at(-1)
            .querySelector('[data-popup-action="confirm"]');
        if (change === "selection" || change === "roundtrip")
            fixture.state.roomState.setSelectedRoomId("B");
        if (change === "roundtrip")
            fixture.state.roomState.setSelectedRoomId("A");
        if (change === "abort") fixture.state.controller.abort();
        if (change === "cleanup") fixture.state.roomState.cleanup();
        if (change === "account")
            fixture.state.storage.set("cognis_account", "replacement");
        if (change === "token")
            fixture.state.storage.set("cognis_access_token", "replacement");
        if (change === "membership")
            fixture.state.roomState.getSelectedRoom().members = [];
        if (change === "handle")
            fixture.state.roomState.getSelectedRoom().members[0].handle =
                "replacement";
        if (change === "provider") fixture.offline.controller.abort();
        confirm.click();
        await pending;
        assert.equal(fixture.deletes().length, 0);
        assert.deepEqual(fixture.state.toasts, []);
    });
}

test("duplicate Leave openings and stale retained controls cannot dispatch twice", async (context) => {
    const fixture = await roomFixture(context);
    const oldButton = fixture.button();
    const pending = fixture.openLeave();
    await fixture.openLeave();
    await fixture.settle();
    assert.equal(fixture.active().length, 1);
    fixture.active()[0].querySelector('[data-popup-action="cancel"]').click();
    await pending;
    await fixture.state.roomState.openRoom("B");
    await fixture.openLeave(oldButton);
    assert.equal(fixture.active().length, 0);
    assert.equal(fixture.deletes().length, 0);
});

for (const outcome of ["success", "http", "uncertain"]) {
    for (const change of ["current", "selection", "account", "abort"]) {
        test(`delayed ${outcome} Leave result belongs only to ${change} owner`, async (context) => {
            const fixture = await roomFixture(context);
            const gate = deferred();
            fixture.transport.intercept = async (_path, options) =>
                options.method === "DELETE" ? gate.promise : null;
            const pending = fixture.openLeave();
            await fixture.settle();
            fixture
                .active()[0]
                .querySelector('[data-popup-action="confirm"]')
                .click();
            await until(() => fixture.deletes().length === 1);
            if (change === "selection")
                fixture.state.roomState.setSelectedRoomId("B");
            if (change === "account")
                fixture.state.storage.set("cognis_account", "replacement");
            if (change === "abort") fixture.state.controller.abort();
            const count = fixture.sent.length;
            if (outcome === "uncertain")
                gate.reject(new Error("synthetic_uncertain"));
            else
                gate.resolve(
                    Response.json(
                        {},
                        { status: outcome === "success" ? 200 : 500 },
                    ),
                );
            await pending;
            assert.equal(fixture.deletes().length, 1);
            if (change !== "current") {
                assert.equal(fixture.sent.length, count);
                assert.deepEqual(fixture.state.toasts, []);
            } else if (outcome !== "success") {
                assert.equal(fixture.state.toasts.length, 1);
                assert.equal(
                    fixture.button().disabled,
                    outcome === "uncertain",
                );
            } else
                assert.equal(fixture.state.roomState.getSelectedRoomId(), "B");
        });
    }
}

test("refresh failure after acknowledged Leave never replays the mutation", async (context) => {
    const fixture = await roomFixture(context);
    fixture.offline.invalidateCache();
    fixture.transport.intercept = async (path, options) => {
        if (options.method === "DELETE") return Response.json({});
        if (path.endsWith("/rooms"))
            throw new Error("synthetic_refresh_failure");
        return null;
    };
    const pending = fixture.openLeave();
    await fixture.settle();
    fixture.active()[0].querySelector('[data-popup-action="confirm"]').click();
    await pending;
    assert.equal(fixture.deletes().length, 1);
    await fixture.openLeave();
    assert.equal(fixture.deletes().length, 1);
    assert.equal(fixture.state.errors[0][1].outcome, "acknowledged");
    assert.deepEqual(fixture.state.toasts, [
        "module.social.messages.leave_succeeded",
        "module.social.messages.leave_refresh_failed",
    ]);
});

for (const failure of ["http", "missing", "shape", "record"]) {
    test(`acknowledged Leave preserves known rooms after ${failure} reconciliation failure`, async (context) => {
        const fixture = await roomFixture(context);
        fixture.transport.intercept = async (path, options) => {
            if (options.method === "DELETE") return Response.json({});
            if (!path.endsWith("/rooms")) return null;
            if (failure === "http") return Response.json({}, { status: 500 });
            if (failure === "missing") return Response.json({});
            if (failure === "shape") return Response.json({ data: {} });
            return Response.json({ data: [{}] });
        };
        const pending = fixture.openLeave();
        await fixture.settle();
        fixture
            .active()[0]
            .querySelector('[data-popup-action="confirm"]')
            .click();
        await pending;
        assert.equal(fixture.deletes().length, 1);
        assert.deepEqual(
            Array.from(fixture.state.roomState.getRooms(), (room) => room.id),
            ["A", "B"],
        );
        assert.equal(fixture.state.roomState.getSelectedRoomId(), "A");
        assert.equal(
            fixture.state.toasts.at(-1),
            "module.social.messages.leave_refresh_failed",
        );
    });
}

test("selection during request preparation aborts before Leave reaches transport", async (context) => {
    const fixture = await roomFixture(context);
    const gate = deferred();
    let preparing = false;
    fixture.offline.ctx.extendFlow(
        "social:messages:request",
        "before",
        { id: "synthetic-delay" },
        async (stage) => {
            if (stage.input.options.method === "DELETE") {
                preparing = true;
                await gate.promise;
            }
        },
    );
    const pending = fixture.openLeave();
    await fixture.settle();
    fixture.active()[0].querySelector('[data-popup-action="confirm"]').click();
    await until(() => preparing);
    fixture.state.roomState.setSelectedRoomId("B");
    gate.resolve();
    await pending;
    assert.equal(fixture.deletes().length, 0);
    assert.deepEqual(fixture.state.toasts, []);
});

for (const change of ["selection", "abort"]) {
    test(`${change} during acknowledged Leave refresh never starts obsolete key resolution`, async (context) => {
        const fixture = await roomFixture(context);
        const gate = deferred();
        let refreshing = false;
        let keyReads = 0;
        fixture.state.key = async () => {
            keyReads += 1;
            return {};
        };
        fixture.transport.intercept = async (path, options) => {
            if (options.method === "DELETE") return Response.json({});
            if (!path.endsWith("/rooms")) return null;
            refreshing = true;
            return gate.promise;
        };
        const pending = fixture.openLeave();
        await fixture.settle();
        fixture
            .active()[0]
            .querySelector('[data-popup-action="confirm"]')
            .click();
        await until(() => refreshing);
        const notices = fixture.state.toasts.length;
        if (change === "selection")
            fixture.state.roomState.setSelectedRoomId("B");
        else fixture.state.controller.abort();
        gate.resolve(
            Response.json({
                data: [
                    {
                        ...fixture.state.rooms[1],
                        lastMessage: {
                            ciphertext: "Synthetic encrypted content",
                            createdAt: "2026-11-14T00:00:00.000Z",
                        },
                    },
                ],
            }),
        );
        await pending;
        assert.equal(keyReads, 0);
        assert.equal(fixture.state.toasts.length, notices);
        assert.equal(fixture.deletes().length, 1);
    });
}

for (const change of ["membership", "handle", "provider", "roundtrip"]) {
    test(`Leave rechecks ${change} at its registered transport boundary`, async (context) => {
        const fixture = await roomFixture(context);
        const gate = deferred();
        let preparing = false;
        fixture.offline.ctx.extendFlow(
            "social:messages:request",
            "before",
            { id: "synthetic-owner-delay" },
            async (stage) => {
                if (stage.input.options.method === "DELETE") {
                    preparing = true;
                    await gate.promise;
                }
            },
        );
        const pending = fixture.openLeave();
        await fixture.settle();
        fixture
            .active()[0]
            .querySelector('[data-popup-action="confirm"]')
            .click();
        await until(() => preparing);
        if (change === "membership")
            fixture.state.roomState.getSelectedRoom().members = [];
        if (change === "handle")
            fixture.state.roomState.getSelectedRoom().members[0].handle =
                "changed";
        if (change === "provider") {
            const request = fixture.offline.ctx.capabilities.get(
                "social:messagesRequest",
            );
            fixture.offline.ctx.capabilities.remove(
                "social:messagesRequest",
                request,
            );
            fixture.offline.ctx.capabilities.contribute(
                "social:messagesRequest",
                () => assert.fail("Unexpected replacement request"),
            );
        }
        if (change === "roundtrip") {
            fixture.state.roomState.setSelectedRoomId("B");
            fixture.state.roomState.setSelectedRoomId("A");
        }
        gate.resolve();
        await pending;
        assert.equal(fixture.deletes().length, 0);
        assert.deepEqual(fixture.state.toasts, []);
        assert.equal(fixture.state.errors.at(-1)[1].outcome, "notDispatched");
        if (change === "roundtrip") {
            await fixture.state.roomState.openRoom("A");
            const fresh = fixture.openLeave();
            await fixture.settle();
            assert.equal(fixture.active().length, 1);
            fixture
                .active()[0]
                .querySelector('[data-popup-action="confirm"]')
                .click();
            await fresh;
            assert.equal(fixture.deletes().length, 1);
        }
    });
}
