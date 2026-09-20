import test from "node:test";
import assert from "node:assert/strict";
import { shouldShowInviteMenuEntry } from "../ui/invite-menu-visibility.js";

test("registration Invite entry includes owners but excludes administrators", () => {
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
            isFounder: true,
            gatewayEnabled: true,
            inviteEnabled: true,
        }),
        false,
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
