import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowInviteMenuEntry } from "../ui/invite-menu-visibility.js";

test("registration Invite entry includes authorized administrators and owners", () => {
    assert.equal(
        shouldShowInviteMenuEntry({
            role: "owner",
            isFounder: true,
            gatewayEnabled: true,
            inviteEnabled: true,
        }),
        true,
    );
    assert.equal(
        shouldShowInviteMenuEntry({
            role: "admin",
            isFounder: false,
            canInvite: true,
            gatewayEnabled: true,
            inviteEnabled: true,
        }),
        true,
    );
    assert.equal(
        shouldShowInviteMenuEntry({
            role: "user",
            isFounder: true,
            gatewayEnabled: true,
            inviteEnabled: true,
        }),
        true,
    );
});

test("administrator Invite entry follows the server invitation policy", () => {
    for (const canInvite of [false, undefined]) {
        assert.equal(
            shouldShowInviteMenuEntry({
                role: "admin",
                isFounder: false,
                gatewayEnabled: true,
                inviteEnabled: true,
                canInvite,
            }),
            false,
        );
    }
});
