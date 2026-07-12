import test from "node:test";
import assert from "node:assert/strict";
import { buildMailtoShareUrl } from "../quick-share.js";

test("buildMailtoShareUrl encodes subject and body with the share label and URL", () => {
    const href = buildMailtoShareUrl({
        shareUrl: "https://example.com/share/token?meeting=1&guest=2",
        label: "Planning & Review",
    });

    assert.equal(
        href,
        "mailto:?subject=Cognis%20Share%20Link%3A%20Planning%20%26%20Review&body=Here%20is%20your%20Cognis%20share%20link%20for%20Planning%20%26%20Review%3A%0Ahttps%3A%2F%2Fexample.com%2Fshare%2Ftoken%3Fmeeting%3D1%26guest%3D2",
    );
});

test("buildMailtoShareUrl falls back to a generic subject when no label is supplied", () => {
    const href = buildMailtoShareUrl({
        shareUrl: "https://example.com/share/token",
    });

    assert.equal(
        href,
        "mailto:?subject=Cognis%20Share%20Link&body=Here%20is%20your%20Cognis%20share%20link%3A%0Ahttps%3A%2F%2Fexample.com%2Fshare%2Ftoken",
    );
});
