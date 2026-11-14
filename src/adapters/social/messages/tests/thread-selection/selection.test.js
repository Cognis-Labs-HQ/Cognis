import test from "node:test";
import assert from "node:assert/strict";
import { createRenderer, message, select } from "./fixture.js";
import { deferred, until } from "../async-state/fixture.js";

function assertSelection(snapshot, text = true) {
    for (const name of [
        "anchorNode",
        "anchorOffset",
        "focusNode",
        "focusOffset",
    ])
        assert.equal(snapshot.selection[name], snapshot[name], name);
    if (text) assert.equal(snapshot.selection.toString(), snapshot.text);
}

for (const style of ["default", "speech_bubbles", "irc"]) {
    for (const backward of [false, true]) {
        for (const spanning of [false, true]) {
            test(`${style} ${backward ? "backward" : "forward"} ${spanning ? "adjacent bodies" : "single body"} selection survives live changes`, async (context) => {
                const state = createRenderer();
                context.after(state.dispose);
                state.style = style;
                state.messages.push(message("first", 1), message("second", 2));
                await state.render();
                const body = state.body("first");
                const anchor = body.querySelector("strong").firstChild;
                const focus = spanning
                    ? state.body("second").querySelector("strong").firstChild
                    : anchor;
                const snapshot = select(
                    state.document,
                    anchor,
                    focus,
                    backward,
                );
                assert.equal(snapshot.anchorNode, backward ? focus : anchor);
                assert.equal(snapshot.anchorOffset, backward ? 6 : 2);
                assert.equal(snapshot.focusNode, backward ? anchor : focus);
                assert.equal(snapshot.focusOffset, backward ? 2 : 6);
                state.messages.push(message("new", 3));
                assert.equal((await state.render()).changed, true);
                assert.equal(state.body("first"), body);
                assertSelection(snapshot);
                const target = spanning ? state.messages[2] : state.messages[0];
                target.reactions = [
                    {
                        emoji: "♥",
                        count: 1,
                        reactedBy: [
                            { accountId: "reader", displayName: "Reader" },
                        ],
                    },
                ];
                await state.render();
                assertSelection(snapshot);
                target.readBy = [
                    { accountId: "reader", displayName: "Reader" },
                ];
                await state.render();
                assertSelection(snapshot);
                for (let poll = 0; poll < 3; poll += 1) {
                    assert.equal((await state.render()).changed, false);
                    assertSelection(snapshot);
                }
            });
        }
    }
}

test("queued projection preserves loaded history, server cursors and selected nodes through repeated polls", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages = Array.from({ length: 100 }, (_value, index) =>
        message(`message-${index}`, index),
    );
    await state.render();
    await state.render({ before: message("boundary", 50).createdAt });
    const body = state.body("message-5");
    const snapshot = select(
        state.document,
        body.querySelector("strong").firstChild,
    );
    const path = "/api/v1/social/messages/rooms/room/messages";
    await state.client.messagesFetch(
        `${path}?limit=50&before=${encodeURIComponent(message("boundary").createdAt)}`,
    );
    state.offline.disconnect();
    for (const text of ["First pending", "Second pending"]) {
        await state.client.messagesFetch(path, {
            method: "POST",
            body: JSON.stringify({ ciphertext: text, iv: "synthetic" }),
        });
    }
    const projected = await (
        await state.client.messagesFetch(path + "?limit=50")
    ).json();
    assert.equal(projected.data.length, 52);
    assert.equal(projected.data.filter((record) => record.queued).length, 2);
    const result = await state.render();
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        102,
    );
    assert.equal(state.body("message-5"), body);
    assertSelection(snapshot);
    assert.equal(result.oldestCreatedAt, message("boundary").createdAt);
    assert.equal(result.newestCreatedAt, message("boundary", 99).createdAt);
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn").dataset
            .beforeTime,
        message("boundary").createdAt,
    );
    assert.equal((await state.render()).changed, false);
    await state.render({ before: message("boundary").createdAt });
    assert.equal(
        state.container.querySelectorAll(".messages-message-row").length,
        102,
    );
    assert.equal(
        state.container.querySelector(".messages-load-earlier-btn"),
        null,
    );
    assertSelection(snapshot);
    assert.equal(
        state.container.querySelectorAll(".messages-date-divider").length,
        1,
    );
});

for (const count of [0, 49, 50]) {
    test(`${count} server rows determine fullness independently of queued records`, async (context) => {
        const state = createRenderer();
        context.after(state.dispose);
        state.messages = Array.from({ length: count }, (_value, index) =>
            message(`message-${index}`, index),
        );
        await state.render();
        state.offline.disconnect();
        await state.client.messagesFetch(
            "/api/v1/social/messages/rooms/room/messages",
            {
                method: "POST",
                body: JSON.stringify({
                    ciphertext: "Pending",
                    iv: "synthetic",
                }),
            },
        );
        const result = await state.render();
        assert.equal(
            state.container.querySelectorAll(".messages-message-row").length,
            count + 1,
        );
        assert.equal(
            Boolean(
                state.container.querySelector(".messages-load-earlier-btn"),
            ),
            count === 50,
        );
        assert.equal(
            result.oldestCreatedAt,
            count ? message("boundary").createdAt : null,
        );
        assert.equal(
            result.newestCreatedAt,
            count ? message("boundary", count - 1).createdAt : null,
        );
    });
}

test("changed or removed selected text follows native range mutation and absent selection stays absent", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages.push(message("first", 1), message("earlier"));
    await state.render();
    const original = state.body("first").querySelector("strong").firstChild;
    const snapshot = select(state.document, original);
    state.messages[0].ciphertext = "Replacement message";
    await state.render();
    assert.equal(original.isConnected, false);
    assert.equal(state.body("first").textContent, "Replacement message");
    assert.equal(snapshot.selection.toString().includes("selected"), false);
    state.messages.shift();
    await state.render();
    assert.equal(state.body("first"), null);
    assert.equal(snapshot.selection.toString().includes("Replacement"), false);
    snapshot.selection.removeAllRanges();
    state.messages.push(message("new", 3));
    await state.render();
    assert.equal(snapshot.selection.rangeCount, 0);
});

test("keyboard focus, hydrated avatars and interaction payloads survive targeted updates", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages.push(message("first"));
    await state.render();
    const avatar = state.container.querySelector('a[href^="/profile/"]');
    const more = state.container.querySelector("[data-reaction-more]");
    more.focus();
    state.messages[0].reactions = [
        {
            emoji: "♥",
            count: 1,
            reactedBy: [{ accountId: "reader", displayName: "Reader" }],
        },
    ];
    await state.render();
    assert.equal(state.document.activeElement, more);
    assert.equal(state.container.querySelector('a[href^="/profile/"]'), avatar);
    assert.equal(avatar.dataset.hydrated, "true");
    const chip = state.container.querySelector(".messages-reaction-chip");
    chip.focus();
    const snapshot = select(
        state.document,
        state.body("first").querySelector("strong").firstChild,
    );
    state.messages[0].reactions[0].count = 2;
    state.messages[0].reactions[0].reactedBy[0].displayName = "Updated reader";
    await state.render();
    assert.equal(state.document.activeElement, chip);
    assert.equal(chip.querySelector("span").textContent, "2");
    state.showReactionHoverPopup(chip);
    assert.match(state.popups.at(-1)[1], /Updated reader/);
    state.messages[0].readBy = [
        {
            accountId: "reader",
            displayName: "Reader",
            readAt: "2026-11-14T12:00:00.000Z",
        },
    ];
    await state.render();
    const status = state.container.querySelector("[data-readers]");
    state.showReadReceiptHoverPopup(
        status,
        state.parseEncodedPayload(status.dataset.readers),
        { t: String },
    );
    assert.match(state.popups.at(-1)[1], /12:00/);
    state.messages[0].readBy[0].readAt = "2026-11-14T12:01:00.000Z";
    assert.equal((await state.render()).changed, false);
    assertSelection(snapshot);
});

test("pending-request updates preserve bodies and new view ownership resets them", async (context) => {
    const state = createRenderer();
    context.after(state.dispose);
    state.messages.push(message("first"));
    await state.render();
    let body = state.body("first");
    state.pendingRequest = {
        id: "request",
        direction: "incoming",
        canRespond: true,
    };
    assert.equal((await state.render()).pendingRequest.id, "request");
    assert.equal(state.body("first"), body);
    for (const change of [{ account: "replacement" }, { room: "other" }, {}]) {
        await state.render(change);
        assert.notEqual(state.body("first"), body);
        body = state.body("first");
    }
    state.key = {};
    await state.render();
    assert.notEqual(state.body("first"), body);
    body = state.body("first");
    state.container.replaceChildren();
    await state.render();
    assert.notEqual(state.body("first"), body);
});

for (const delayed of ["history", "live"]) {
    test(`history and live overlap retain both pages when ${delayed} completes last`, async (context) => {
        const state = createRenderer();
        context.after(state.dispose);
        state.messages = Array.from({ length: 100 }, (_value, index) =>
            message(`message-${index}`, index),
        );
        await state.render();
        state.messages.push(message("message-100", 100));
        const gate = deferred();
        let reached = false;
        state.decrypt = async (_key, record) => {
            if (
                record.id ===
                (delayed === "history" ? "message-0" : "message-100")
            ) {
                reached = true;
                await gate.promise;
            }
            return record.ciphertext;
        };
        const load = (kind) =>
            state.render(
                kind === "history"
                    ? { before: message("boundary", 50).createdAt }
                    : {},
            );
        const pending = load(delayed);
        await until(() => reached);
        await load(delayed === "history" ? "live" : "history");
        const selected = state.body(
            delayed === "history" ? "message-100" : "message-5",
        );
        const snapshot = select(
            state.document,
            selected.querySelector("strong").firstChild,
        );
        gate.resolve();
        await pending;
        assert.equal(
            state.container.querySelectorAll(".messages-message-row").length,
            101,
        );
        assertSelection(snapshot);
    });
}

for (const change of ["room", "account"]) {
    test(`pending history cannot merge into a replacement ${change}`, async (context) => {
        const state = createRenderer();
        context.after(state.dispose);
        state.messages = [message("first", 1), message("earlier")];
        await state.render();
        const gate = deferred();
        let reached = false;
        let current = true;
        state.decrypt = async (_key, record) => {
            if (record.id === "earlier") {
                reached = true;
                await gate.promise;
            }
            return record.ciphertext;
        };
        const pending = state.render({
            before: message("boundary", 1).createdAt,
            isCurrent: () => current,
        });
        await until(() => reached);
        current = false;
        state.messages = [message("replacement")];
        await state.render({ [change]: "replacement" });
        const body = state.body("replacement");
        const snapshot = select(
            state.document,
            body.querySelector("strong").firstChild,
        );
        gate.resolve();
        assert.equal((await pending).obsolete, true);
        assert.equal(state.body("replacement"), body);
        assert.equal(state.body("earlier"), null);
        assertSelection(snapshot);
    });
}
