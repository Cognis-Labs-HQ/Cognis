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
    assert.match(providerSource, /social-call-stage__hangup btn-cancel/);
    assert.match(providerSource, /hangup\.svg/);
    assert.match(providerSource, /social:callUi/);
    assert.match(callStyles, /messages-thread--call-active/);
    assert.match(callStyles, /:not\(#messages-thread-header-slot\)/);
});

test("Call toolbar keeps its arrow separate from mounted meeting content", () => {
    assert.match(providerSource, /social-call-stage__toolbar/);
    assert.match(providerSource, /social-call-stage__component/);
    assert.match(providerSource, /social-call-stage__back-icon/);
    assert.match(providerSource, /ui:makeFloatingWindow/);
    assert.match(providerSource, /if \(callStage\.isFloating\(\)\) return/);
    assert.match(providerSource, /backButton\.hidden = true/);
    assert.match(providerSource, /callButton\.disabled = true/);
    assert.match(providerSource, /cognis:call-moved-to-pip/);
    assert.match(providerSource, /action\.context\?\.allowNavigation === true/);
    assert.match(providerSource, /portal: allowNavigation/);
    assert.match(providerSource, /topLayer: true/);
    assert.match(providerSource, /social-call-stage--floating/);
    assert.match(providerSource, /closeButton:/);
    assert.match(providerSource, /markDocked/);
    assert.match(providerSource, /updateCall\(call\.id, "leave"\)/);
    assert.match(providerSource, /allowNavigation,/);
    assert.match(providerSource, /minWidth: action\.minSize\?\.width/);
    assert.match(providerSource, /minHeight: action\.minSize\?\.height/);
    assert.match(providerSource, /setNavigationAllowed\?\.\(true\)/);
    assert.match(providerSource, /setNavigationAllowed\?\.\(false\)/);
    assert.match(providerSource, /new MutationObserver/);
    assert.match(providerSource, /removeStageOnDiscard: true/);
    assert.ok(
        providerSource.indexOf("new MutationObserver") <
            providerSource.indexOf(
                'backButton.addEventListener(\n        "click"',
            ),
    );
});

test("Call PiP dimensions belong to the floating window", () => {
    assert.match(callStyles, /\.social-call-stage--floating/);
    assert.match(
        callStyles,
        /\.social-call-stage__component\.floating-window[\s\S]*width: min\(32vw, 24rem\)[\s\S]*height: min\(32vh, 15rem\)/,
    );
    assert.match(callStyles, /> \.component-page-window[\s\S]*height: 100%/);
    assert.match(callStyles, /overflow: hidden/);
    assert.match(callStyles, /grid-template-rows: minmax\(0, 1fr\)/);
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

test("Call UI exposes room-event answer and decline actions", () => {
    assert.match(providerSource, /async function answerCall/);
    assert.match(providerSource, /async function declineCall/);
    assert.match(providerSource, /answerCall,/);
    assert.match(providerSource, /declineCall,/);
});

test("Call UI resolves and rejoins the current room call", () => {
    assert.match(providerSource, /getRoomCall\(roomId\)/);
    assert.match(providerSource, /state: call\?\.status \?\? "available"/);
    assert.match(providerSource, /call\.status === "active"/);
    assert.match(providerSource, /call\.callerAccountId !== currentAccountId/);
});

test("Call UI carries user activation through delayed provider mounting", () => {
    assert.match(providerSource, /component-pages:createSpawnPermit/);
    assert.match(providerSource, /activationPermit/);
    assert.match(providerSource, /answerSpawnPermits/);
});
