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
        `mailto:?subject=${encodeURIComponent("Cognis Share Link: Planning & Review")}&body=${encodeURIComponent(
            "🔗 Here is your Cognis share link for Planning & Review:\nhttps://example.com/share/token?meeting=1&guest=2\n\nCognis automated notification. Please do not reply to this message.",
        )}`,
    );
});

test("buildMailtoShareUrl falls back to a generic subject when no label is supplied", () => {
    const href = buildMailtoShareUrl({
        shareUrl: "https://example.com/share/token",
    });

    assert.equal(
        href,
        `mailto:?subject=${encodeURIComponent("Cognis Share Link")}&body=${encodeURIComponent(
            "🔗 Here is your Cognis share link:\nhttps://example.com/share/token\n\nCognis automated notification. Please do not reply to this message.",
        )}`,
    );
});
