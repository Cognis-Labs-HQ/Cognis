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
