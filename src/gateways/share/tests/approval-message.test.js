import test from "node:test";
import assert from "node:assert/strict";
import { formatApprovalMessage } from "../ui/approval-message.js";

test("approval popup message includes the requested action and target", () => {
    assert.equal(
        formatApprovalMessage(
            '%requester% has requested to %action% for "%target%".',
            {
                requesterDisplayName: "Alice",
                action: "add a participant",
                target: "Weekly meeting",
            },
        ),
        'Alice has requested to add a participant for "Weekly meeting".',
    );
});

test("approval popup message uses localized defaults", () => {
    assert.equal(
        formatApprovalMessage(
            '%requester% has requested to %action% for "%target%".',
            { requesterDisplayName: "Alice", resourceType: "meeting" },
            { action: "create a share link", target: "meeting" },
        ),
        'Alice has requested to create a share link for "meeting".',
    );
});

test("approval popup message escapes contextual HTML", () => {
    assert.equal(
        formatApprovalMessage("%requester%: %action% %target%", {
            requesterDisplayName: '<img src=x onerror="alert(1)">',
            action: "share & invite",
            target: "'Weekly' <meeting>",
        }),
        "&lt;img src=x onerror=&quot;alert(1)&quot;&gt;: " +
            "share &amp; invite &#039;Weekly&#039; &lt;meeting&gt;",
    );
});
