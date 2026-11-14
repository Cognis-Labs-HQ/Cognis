import assert from "node:assert/strict";
import test from "node:test";
import { mountUsers } from "./fixtures/mount.js";

test("opaque session identity disables self mutations before forbidden requests", async () => {
    const state = await mountUsers({ accountId: "u_opaque" });
    assert.match(state.markup, /class="users-toggle-btn[^>]+disabled/);
    assert.match(state.markup, /class="users-delete-btn[^>]+disabled/);
    await state.clicked();
    assert.equal(
        state.menus[0].find(({ id }) => id === "password").disabled,
        true,
    );
    assert.equal(state.menus[0][0].disabled, true);
});

test("acknowledged changes remain successful when the subsequent Users refresh fails", async () => {
    for (const failure of ["transport", "http"]) {
        const state = await mountUsers({
            readUsers: (count) => {
                if (count === 1)
                    return Response.json({
                        data: [
                            {
                                accountId: "u_opaque",
                                username: "person",
                                enabled: true,
                                role: "user",
                            },
                        ],
                    });
                if (failure === "transport") throw new Error("connection_lost");
                return new Response(null, { status: 503 });
            },
        });
        await state.handlers.get("role:change")();
        assert.deepEqual(state.notices, [
            { message: "ui.app.users.role_updated", variant: "success" },
            { message: "ui.app.users.refresh_failed", variant: "warning" },
        ]);
        assert.equal(state.refreshes(), 0);
    }
});

test("account disclosure failure shows the Users-owned translated error without a rejection", async () => {
    const state = await mountUsers({
        readDetails: async () => {
            throw new Error("metadata_unavailable");
        },
    });
    await state.handlers.get("details:toggle")();
    assert.deepEqual(state.notices, [
        { message: "ui.app.users.details_failed", variant: "error" },
    ]);
});
