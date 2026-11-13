import assert from "node:assert/strict";
import test from "node:test";
import { mountUsers } from "./fixtures/mount.js";

for (const external of [true, false]) {
    test(`Users menus resolve ${external ? "SSO" : "local"} policy flags through immutable account IDs`, async () => {
        const state = await mountUsers({ external });
        const { markup, menus, user, button } = state;

        assert.match(markup, /data-username="u_opaque"/);
        assert.match(markup, />public-name</);
        await state.clicked();
        const items = menus[0];
        assert.equal(items[0].id, external ? "unset-founder" : "set-founder");
        assert.equal(
            items.find(({ id }) => id === "password").disabled,
            external,
        );
        assert.equal(
            items.some(({ id }) => id === "tfa-reset"),
            external,
        );
        button.dataset.username = user.username;
        await state.clicked();
        assert.equal(menus.length, 1);
    });
}
