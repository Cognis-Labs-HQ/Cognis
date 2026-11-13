import assert from "node:assert/strict";
import test from "node:test";
import { notificationMessages } from "../../reuse/notification-messages.js";

const catalog = (subject: string, body: string) => `<resources>
<string name="adapter.study.library.notification_pending_subject">${subject}</string>
<string name="adapter.study.library.notification_pending_body">${body}</string>
</resources>`;

test("request messages decode each XML entity once without interpreting the decoded output", () => {
    const xml = catalog(
        "&amp;lt;script&amp;gt;",
        "&amp;quot; &lt; &gt; &quot; &apos; &amp; &amp;amp;lt;",
    );
    assert.deepEqual(notificationMessages(xml, "pending"), {
        subject: "&lt;script&gt;",
        body: `&quot; < > " ' & &amp;lt;`,
    });
});

test("request messages use nonempty English fallback and fail explicitly when it is absent", () => {
    assert.deepEqual(
        notificationMessages(
            catalog("", " "),
            "pending",
            catalog("Subject", "Body"),
        ),
        { subject: "Subject", body: "Body" },
    );
    assert.throws(
        () => notificationMessages(catalog("", ""), "pending"),
        /missing_notification_translation/,
    );
    assert.throws(
        () => notificationMessages(catalog("Subject", "Body"), "approved"),
        /missing_notification_translation/,
    );
});
