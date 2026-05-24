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
    const baseCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.match(
        baseCssSource,
        /\.messages-message-status \.messages-avatar-link[\s\S]*align-items:\s*center;/,
    );
    assert.match(
        baseCssSource,
        /\.messages-message-status \.messages-avatar-link[\s\S]*justify-content:\s*center;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="irc"\] \.messages-message-row[\s\S]*display:\s*flex;[\s\S]*align-items:\s*baseline;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="irc"\] \.messages-message-status[\s\S]*align-self:\s*center;/,
    );
    assert.match(
        baseCssSource,
        /@import url\("\/static\/adapters\/social\/messages\/messages-style-variants\.css"\);/,
    );
});

test("messages speech bubbles remove tails and overlay avatars", () => {
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.doesNotMatch(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message::after/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*box-shadow:/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\] \.messages-message-avatar[\s\S]*display:\s*none;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message-bubble-avatar[\s\S]*display:\s*block;/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message:not\(\.messages-message--own\)[\s\S]*background:\s*var\(--color-surface-elevated\);[\s\S]*border:\s*1px solid var\(--color-border\);/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-message--own[\s\S]*background:\s*var\(--color-accent\);[\s\S]*color:\s*var\(--color-accent-contrast\);/,
    );
});

test("messages reactions and receipts include advanced interaction safeguards", () => {
    const appSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/app.js"),
        "utf8",
    );
    const baseCssSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/messages.css"),
        "utf8",
    );
    const sharedCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-chat-shared.css",
        ),
        "utf8",
    );
    const variantsCssSource = readFileSync(
        resolve(
            ROOT,
            "src/adapters/social/messages/ui/messages-style-variants.css",
        ),
        "utf8",
    );
    assert.match(appSource, /if \(hadPriorReaders\)\s*\{[\s\S]*?return "";/);
    assert.match(appSource, /data-reaction-details="1"/);
    assert.match(
        appSource,
        /threadList\?\.addEventListener\(\s*"focusin",[\s\S]*messages-message-status--read/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-message-wrap \.messages-reaction-picker-row[\s\S]*position:\s*absolute;/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-reactions-available[\s\S]*flex-wrap:\s*nowrap;/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-read-receipt-popup[\s\S]*pointer-events:\s*none;/,
    );
    assert.match(
        baseCssSource,
        /\.messages-message--own \.messages-message-meta[\s\S]*width:\s*100%;/,
    );
    assert.match(
        baseCssSource,
        /\.messages-message-status--read[\s\S]*flex-direction:\s*row;/,
    );
    assert.match(
        sharedCssSource,
        /\.messages-page[\s\S]*--messages-panel-max-height-offset-desktop:\s*176px;[\s\S]*\.messages-page \.main-window--with-toolbar[\s\S]*max-height:\s*calc\(\s*100dvh - var\(--messages-panel-max-height-offset-desktop\)\s*\);[\s\S]*overflow:\s*hidden;/,
    );
    assert.match(
        appSource,
        /function statusBadgeSvgMarkup\([\s\S]*<circle cx="8" cy="8"/,
    );
    assert.match(
        appSource,
        /statusSentSvgMarkup[\s\S]*<path d="M5\.25 8\.1L7\.15 10L10\.75 6\.5"/,
    );
    assert.match(
        variantsCssSource,
        /\.messages-page\[data-message-style="speech_bubbles"\][\s\S]*\.messages-reactions-row[\s\S]*max-width:\s*100%;/,
    );
});
