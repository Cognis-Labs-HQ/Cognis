import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("messages new-conversation search uses messaging lookup endpoint", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    assert.match(source, /endpoint:\s*"\/api\/v1\/messages\/users\/lookup"/);
});

test("messages member count control opens local member summary without jitsi calls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    assert.match(source, /id="messages-member-summary-btn"/);
    assert.doesNotMatch(
        source,
        /loadMeetingChatSummary[\s\S]*\/api\/v1\/modules\/jitsi-meet\/meetings\/chat-room-summary/,
    );
    assert.match(
        source,
        /openPopup\([\s\S]*module\.social\.messages\.member_summary_title/,
    );
});

test("messages IRC layout keeps read receipts inline and centered", () => {
    const cssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
    assert.match(
        cssSource,
        /\.messages-message-status \.messages-avatar-link[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/,
    );
    assert.match(
        cssSource,
        /\.messages-page\[data-message-style="irc"\] \.messages-message-row[\s\S]*display:\s*flex;[\s\S]*align-items:\s*baseline;/,
    );
    assert.match(
        cssSource,
        /\.messages-page\[data-message-style="irc"\] \.messages-message-status[\s\S]*align-self:\s*center;/,
    );
});

test("messages speech bubbles render with clear tails", () => {
    const cssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
    assert.match(
        cssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\] \.messages-message::after/,
    );
    assert.match(
        cssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*box-shadow:/,
    );
    assert.match(
        cssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\] \.messages-message--own::after/,
    );
});
