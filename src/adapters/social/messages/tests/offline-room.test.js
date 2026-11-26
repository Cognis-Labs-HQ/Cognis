import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

test("offline initial selection requires a cached room and thread while the room list stays usable", () => {
    let offline = true;
    const cached = new Set();
    const { canOpenCachedRoom, selectInitialRoomId } = loadTestModule(
        new URL("../ui/offline-room.js", import.meta.url),
        {
            "/static/reuse/offline-state.js": { isOffline: () => offline },
            "/static/reuse/ui-ctx.js": {
                uiCtx: {
                    capabilities: {
                        get: () => ({
                            hasCachedRead: (path) => cached.has(path),
                        }),
                    },
                },
            },
        },
    );
    const rooms = [{ id: "first" }, { id: "second" }];
    cached.add("/api/v1/social/messages/rooms/first");
    assert.equal(canOpenCachedRoom("first"), false);
    assert.equal(selectInitialRoomId(rooms, "first"), null);
    cached.add("/api/v1/social/messages/rooms/first/messages?limit=50");
    assert.equal(selectInitialRoomId(rooms, "second"), "first");
    offline = false;
    assert.equal(selectInitialRoomId(rooms, "second"), "second");
    cached.clear();
    offline = true;
    assert.equal(selectInitialRoomId(rooms, "first"), null);
});
