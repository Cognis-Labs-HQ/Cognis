import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const providerSource = readFileSync(
    new URL("../ui/provider.js", import.meta.url),
    "utf8",
);
const callStyles = readFileSync(
    new URL("../ui/call.css", import.meta.url),
    "utf8",
);
const toneSource = readFileSync(
    new URL("../ui/tone-player.js", import.meta.url),
    "utf8",
);

test("Call UI rings before provider handoff and replaces conversation content", () => {
    assert.ok(
        providerSource.indexOf("createStage(call") <
            providerSource.indexOf("waitForAnswer(call"),
    );
    assert.match(providerSource, /phase: "connect"/);
    assert.match(providerSource, /call-stage-hangup btn-cancel/);
    assert.match(providerSource, /hangup\.svg/);
    assert.match(providerSource, /social:callUi/);
    assert.match(callStyles, /messages-thread--call-active/);
    assert.match(callStyles, /:not\(#messages-thread-header-slot\)/);
});

test("Call toolbar keeps its arrow separate from mounted meeting content", () => {
    assert.match(providerSource, /call-stage-toolbar/);
    assert.match(providerSource, /call-stage-component/);
    assert.match(providerSource, /call-stage-back-icon/);
    assert.match(providerSource, /ui:makeFloatingWindow/);
});

test("Call UI reports cancellation outcomes and room priority state", () => {
    assert.match(providerSource, /adapter\.social\.call\.cancelled/);
    assert.match(providerSource, /adapter\.social\.call\.declined/);
    assert.match(providerSource, /adapter\.social\.call\.no_answer/);
    assert.match(providerSource, /cognis:room-call-state/);
    assert.match(providerSource, /cognis:call-decline-requested/);
    assert.match(providerSource, /current\.endedBy === currentAccountId\(\)/);
});

test("Call UI plays distinct inbound and outbound ringing tones", () => {
    assert.match(providerSource, /startRingingTone\("outbound"\)/);
    assert.match(providerSource, /startRingingTone\("inbound"\)/);
    assert.match(toneSource, /createOscillator/);
    assert.match(toneSource, /TONE_INTERVAL_MILLISECONDS/);
});
