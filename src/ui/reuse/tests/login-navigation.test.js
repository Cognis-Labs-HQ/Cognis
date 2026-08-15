import test from "node:test";
import assert from "node:assert/strict";
import {
    getLoginReturnPath,
    withLoginReturnPath,
} from "../login-navigation.js";

test("withLoginReturnPath preserves the complete current relative URL", () => {
    const location = {
        origin: "https://cognis.test",
        pathname: "/settings",
        search: "?section=security",
        hash: "#password",
    };
    assert.equal(
        withLoginReturnPath("/login?reason=session_expired", location),
        "/login?reason=session_expired&next=%2Fsettings%3Fsection%3Dsecurity%23password",
    );
});

test("getLoginReturnPath accepts local paths and rejects unsafe destinations", () => {
    const location = (next) => ({
        origin: "https://cognis.test",
        href: `https://cognis.test/login?next=${encodeURIComponent(next)}`,
    });

    assert.equal(
        getLoginReturnPath(location("/profile/alice?tab=activity#recent")),
        "/profile/alice?tab=activity#recent",
    );
    assert.equal(getLoginReturnPath(location("https://attacker.test")), null);
    assert.equal(getLoginReturnPath(location("//attacker.test/path")), null);
    assert.equal(getLoginReturnPath(location("/login")), null);
});
