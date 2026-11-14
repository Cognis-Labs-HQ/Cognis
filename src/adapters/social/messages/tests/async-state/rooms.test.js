import assert from "node:assert/strict";
import test from "node:test";
import { createRoomFixture, deferred, until } from "./fixture.js";

for (const boundary of ["detail", "actions", "key", "thread", "decode"]) {
    test(`latest room selection owns completion after delayed ${boundary}`, async () => {
        const state = createRoomFixture();
        const gate = deferred();
        let reached = false;
        const block = async () => {
            reached = true;
            await gate.promise;
        };
        state.intercept = async (url) => {
            if (boundary === "detail" && url.endsWith("/rooms/A"))
                await block();
            if (boundary === "thread" && url.includes("/rooms/A/messages"))
                await block();
        };
        state.actions = async (room) => {
            if (boundary === "actions" && room.id === "A") await block();
            return [];
        };
        state.key = async (id) => {
            if (boundary === "key" && id === "A") await block();
            return {};
        };
        state.decrypt = async (_key, message) => {
            if (boundary === "decode" && message.id === "message-A")
                await block();
            return message.ciphertext;
        };
        await state.roomState.loadInitialRooms();
        const first = state.roomState.openRoom("A");
        await until(() => reached);
        await state.roomState.openRoom("B");
        const header = state.elements["messages-thread-header-slot"].innerHTML;
        gate.resolve();
        await first;
        assert.equal(state.roomState.getSelectedRoomId(), "B");
        assert.equal(
            state.elements["messages-thread-header-slot"].innerHTML,
            header,
        );
        assert.match(
            state.elements["messages-thread-list"].innerHTML,
            /content-B/,
        );
        assert.doesNotMatch(
            state.elements["messages-thread-list"].innerHTML,
            /content-A/,
        );
        assert.ok(
            state.opened.every(({ room, selected }) => room === selected),
        );
        const reads = state.requests.filter(({ url }) => url.endsWith("/read"));
        assert.deepEqual(
            reads.map(({ url }) => url),
            ["/api/v1/social/messages/rooms/B/read"],
        );
        const count = state.requests.length;
        await state.roomState.refreshActiveConversation();
        assert.ok(state.requests.length > count);
        state.roomState.cleanup();
    });
}

for (const failure of ["http", "transport"]) {
    test(`failed ${failure} read retains unread and permits an immediate retry`, async () => {
        const state = createRoomFixture();
        await state.roomState.loadInitialRooms();
        state.roomState.setSelectedRoomId("A");
        state.intercept = async (url) => {
            if (!url.endsWith("/read")) return;
            if (failure === "transport") throw new Error("synthetic_transport");
            return Response.json({}, { status: 500 });
        };
        await state.roomState.markSelectedRoomRead();
        state.roomState.setSelectedRoomId("B");
        state.roomState.renderRoomsListIntoDom({ force: true });
        assert.equal(state.roomState.getRooms()[0].unread, 2);
        assert.match(
            state.elements["messages-rooms-list"].innerHTML,
            /messages-unread-badge/,
        );
        assert.equal(state.rooms[0].unread, 2);
        state.intercept = async () => null;
        state.roomState.setSelectedRoomId("A");
        await state.roomState.markSelectedRoomRead();
        assert.equal(state.roomState.getRooms()[0].unread, 0);
        assert.equal(state.rooms[0].unread, 0);
        assert.equal(
            state.requests.filter(({ url }) => url.endsWith("/read")).length,
            2,
        );
        state.roomState.cleanup();
    });
}

test("A to B to A and repeated clicks keep only the last opening", async () => {
    const state = createRoomFixture();
    const gate = deferred();
    let first = true;
    let reached = false;
    state.intercept = async (url) => {
        if (url.endsWith("/rooms/A") && first) {
            first = false;
            reached = true;
            await gate.promise;
        }
    };
    await state.roomState.loadInitialRooms();
    const older = state.roomState.openRoom("A");
    assert.equal(state.roomState.openRoom("A"), older);
    await until(() => reached);
    await state.roomState.openRoom("B");
    await state.roomState.openRoom("A");
    gate.resolve();
    await older;
    assert.match(state.elements["messages-thread-list"].innerHTML, /content-A/);
    assert.deepEqual(
        state.opened.map(({ room }) => room),
        ["B", "A"],
    );
    state.roomState.cleanup();
});

for (const change of ["cleanup", "abort", "account", "session"]) {
    test(`${change} invalidates delayed completion without touching a replacement view`, async () => {
        const state = createRoomFixture();
        const gate = deferred();
        let reached = false;
        state.intercept = async (url) => {
            if (url.includes("/rooms/A/messages")) {
                reached = true;
                await gate.promise;
            }
        };
        await state.roomState.loadInitialRooms();
        const pending = state.roomState.openRoom("A");
        await until(() => reached);
        if (change === "cleanup") state.roomState.cleanup();
        if (change === "abort") state.controller.abort();
        if (change === "account")
            state.storage.set("cognis_account", "replacement");
        if (change === "session")
            state.storage.set("cognis_access_token", "synthetic-session");
        state.elements["messages-thread-list"].innerHTML = "replacement-view";
        gate.resolve();
        await pending;
        assert.equal(
            state.elements["messages-thread-list"].innerHTML,
            "replacement-view",
        );
        assert.equal(
            state.requests.filter(({ url }) => url.endsWith("/read")).length,
            0,
        );
        state.roomState.cleanup();
    });
}

test("a delayed refresh and earlier-history renderer cannot overwrite a newer selection", async () => {
    const state = createRoomFixture();
    await state.roomState.loadInitialRooms();
    await state.roomState.openRoom("A");
    const gate = deferred();
    let reached = false;
    state.intercept = async (url) => {
        if (url.includes("/rooms/A/messages")) {
            reached = true;
            await gate.promise;
        }
    };
    const earlier = state.renderThread(
        "A",
        {},
        state.elements["messages-thread-list"],
        { t: String },
        "reader",
        "earlier",
        { isCurrent: state.roomState.captureRoom() },
    );
    const refresh = state.roomState.refreshActiveConversation();
    assert.equal(state.roomState.refreshActiveConversation(), refresh);
    await until(() => reached);
    await state.roomState.openRoom("B");
    gate.resolve();
    await Promise.all([refresh, earlier]);
    assert.match(state.elements["messages-thread-list"].innerHTML, /content-B/);
    assert.doesNotMatch(
        state.elements["messages-thread-list"].innerHTML,
        /content-A/,
    );
    state.roomState.cleanup();
});

test("a read acknowledgement remains bound to the original room and coalesces repeated calls", async () => {
    const state = createRoomFixture();
    await state.roomState.loadInitialRooms();
    const gate = deferred();
    let reached = false;
    state.intercept = async (url) => {
        if (url.endsWith("/rooms/A/read")) {
            reached = true;
            await gate.promise;
        }
    };
    state.roomState.setSelectedRoomId("A");
    const reading = state.roomState.markSelectedRoomRead();
    assert.equal(state.roomState.markSelectedRoomRead(), reading);
    await until(() => reached);
    state.roomState.setSelectedRoomId("B");
    gate.resolve();
    await reading;
    assert.equal(
        state.roomState.getRooms().find(({ id }) => id === "A").unread,
        0,
    );
    assert.equal(
        state.roomState.getRooms().find(({ id }) => id === "B").unread,
        2,
    );
    state.roomState.setSelectedRoomId("A");
    await state.roomState.markSelectedRoomRead();
    state.roomState.setSelectedRoomId(null);
    await state.roomState.markSelectedRoomRead({ force: true });
    assert.equal(
        state.requests.filter(({ url }) => url.endsWith("/read")).length,
        1,
    );
    state.roomState.cleanup();
});

test("acknowledging older content does not clear newer unread messages loaded during the request", async () => {
    const state = createRoomFixture();
    await state.roomState.loadInitialRooms();
    const gate = deferred();
    let reached = false;
    state.intercept = async (url) => {
        if (url.endsWith("/read")) {
            reached = true;
            await gate.promise;
            return Response.json({});
        }
    };
    state.roomState.setSelectedRoomId("A");
    const reading = state.roomState.markSelectedRoomRead();
    await until(() => reached);
    state.rooms[0].unread = 3;
    state.rooms[0].lastMessage = {
        createdAt: "2026-11-14T01:00:00.000Z",
        ciphertext: "new",
    };
    await state.roomState.reloadRoomsList();
    gate.resolve();
    await reading;
    assert.equal(state.roomState.getRooms()[0].unread, 3);
    state.roomState.cleanup();
});

test("repeated failed acknowledgements report an outage once and retain every retry", async () => {
    const state = createRoomFixture();
    await state.roomState.loadInitialRooms();
    state.roomState.setSelectedRoomId("A");
    state.intercept = async (url) =>
        url.endsWith("/read") ? Response.json({}, { status: 500 }) : null;
    await state.roomState.markSelectedRoomRead();
    await state.roomState.markSelectedRoomRead();
    assert.deepEqual(state.toasts, ["module.social.messages.read_failed"]);
    assert.equal(
        state.requests.filter(({ url }) => url.endsWith("/read")).length,
        2,
    );
    state.roomState.cleanup();
});

test("a stale typing response does not replace the new room indicator", async () => {
    const state = createRoomFixture();
    await state.roomState.loadInitialRooms();
    state.roomState.setSelectedRoomId("A");
    const gate = deferred();
    let reached = false;
    state.intercept = async (url) => {
        if (url.endsWith("/rooms/A/typing")) {
            reached = true;
            await gate.promise;
            return Response.json({ data: [{ displayName: "A typer" }] });
        }
    };
    const typing = state.roomState.refreshTypingIndicator();
    await until(() => reached);
    state.roomState.setSelectedRoomId("B");
    state.elements["messages-typing-status"].innerHTML = "B typing";
    gate.resolve();
    await typing;
    assert.equal(
        state.elements["messages-typing-status"].innerHTML,
        "B typing",
    );
    state.roomState.cleanup();
});

for (const boundary of ["reaction", "key", "thread"]) {
    test(`reaction refresh cannot replace the selected room after delayed ${boundary}`, async () => {
        const state = createRoomFixture();
        await state.roomState.loadInitialRooms();
        await state.roomState.openRoom("A");
        const gate = deferred();
        let reached = false;
        const block = async () => {
            reached = true;
            await gate.promise;
        };
        state.key = async (id) => {
            if (boundary === "key" && id === "A") await block();
            return {};
        };
        state.intercept = async (url) => {
            if (url.endsWith("/reactions")) {
                if (boundary === "reaction") await block();
                return Response.json({});
            }
            if (boundary === "thread" && url.includes("/rooms/A/messages"))
                await block();
        };
        const reaction = state.roomState.toggleReaction(
            "message-A",
            "synthetic-emoji",
        );
        await until(() => reached);
        await state.roomState.openRoom("B");
        gate.resolve();
        await reaction;
        assert.equal(state.roomState.getSelectedRoomId(), "B");
        assert.match(
            state.elements["messages-thread-list"].innerHTML,
            /content-B/,
        );
        assert.doesNotMatch(
            state.elements["messages-thread-list"].innerHTML,
            /content-A/,
        );
        state.roomState.cleanup();
    });
}
