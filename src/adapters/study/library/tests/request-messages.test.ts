import assert from "node:assert/strict";
import test from "node:test";
import { requestMessages } from "../request-messages.js";

const catalog = (subject: string, body: string) => `<resources>
<string name="adapter.study.library.notification_pending_subject">${subject}</string>
<string name="adapter.study.library.notification_pending_body">${body}</string>
</resources>`;

test("request messages decode each XML entity once without interpreting the decoded output", () => {
    const xml = catalog(
        "&amp;lt;script&amp;gt;",
        "&amp;quot; &lt; &gt; &quot; &apos; &amp; &amp;amp;lt;",
    );
    assert.deepEqual(requestMessages(xml, "pending"), {
        subject: "&lt;script&gt;",
        body: `&quot; < > " ' & &amp;lt;`,
    });
});

test("request messages use nonempty English fallback and fail explicitly when it is absent", () => {
    assert.deepEqual(
        requestMessages(
            catalog("", " "),
            "pending",
            catalog("Subject", "Body"),
        ),
        { subject: "Subject", body: "Body" },
    );
    assert.throws(
        () => requestMessages(catalog("", ""), "pending"),
        /missing_request_translation/,
    );
    assert.throws(
        () => requestMessages(catalog("Subject", "Body"), "approved"),
        /missing_request_translation/,
    );
});
