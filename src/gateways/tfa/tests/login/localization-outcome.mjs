import assert from "node:assert/strict";
import { deferred, fixture, prompt, settle } from "./fixture.js";

const suffix = process.argv[2];
const mode = process.argv[3];
assert.ok(
    [
        "resend_expired",
        "resend_received",
        "resend_unconfirmed",
        "resend_pending",
    ].includes(suffix),
);
assert.ok(["missing", "fallback"].includes(mode));
const cleanup = [];
const failures = [];
const observeRejection = (error) => failures.push(error);
process.on("unhandledRejection", observeRejection);
try {
    const host = await fixture(
        { after: (action) => cleanup.push(action) },
        { locale: "de" },
    );
    const key = `ui.app.login.tfa.${suffix}`;
    host.state.catalogEdits = { de: { [key]: null } };
    if (mode === "missing") host.state.catalogEdits.en = { [key]: null };
    host.window.dispatchEvent(
        new host.window.Event("cognis:module-lifecycle-changed"),
    );
    await host.reopen(
        prompt(0, { loginAttemptId: "replacement-synthetic-attempt" }),
    );
    const noticesBefore = host.state.notices.length;
    let clickEvents = 0;
    host.resend().addEventListener("click", () => clickEvents++);
    const pending = deferred();
    host.state.respond = () =>
        suffix === "resend_pending"
            ? pending.promise
            : suffix === "resend_received"
              ? Response.json({ data: { challenge: {} } })
              : Response.json(
                    {
                        error: {
                            code:
                                suffix === "resend_expired"
                                    ? "tfa_attempt_expired"
                                    : "tfa_unavailable",
                        },
                    },
                    { status: suffix === "resend_expired" ? 401 : 503 },
                );
    await host.click();
    await settle();
    assert.equal(clickEvents, 1);
    assert.equal(
        host.resendRequests().length,
        suffix === "resend_pending" && mode === "missing" ? 0 : 1,
    );
    if (mode === "missing") {
        assert.equal(
            host.state.notices.length,
            noticesBefore,
            "A missing English key must not become a different toast",
        );
        assert.equal(
            failures.length,
            1,
            "The real click outcome must expose its missing translation failure",
        );
        assert.equal(failures[0].message, `missing_translation:${key}`);
        if (suffix === "resend_pending")
            assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    } else if (suffix === "resend_pending") {
        assert.equal(failures.length, 0);
        assert.equal(host.resend().textContent, "Requesting code…");
        assert.equal(host.resend().getAttribute("aria-busy"), "true");
        assert.equal(host.state.notices.length, noticesBefore);
        pending.resolve(Response.json({ data: { challenge: {} } }));
        await settle();
    } else {
        assert.equal(failures.length, 0);
        assert.equal(host.state.notices.length, noticesBefore + 1);
        assert.match(
            host.state.notices.at(-1).text,
            suffix === "resend_received"
                ? /^The verification method/
                : suffix === "resend_expired"
                  ? /^This sign-in attempt/
                  : /^The resend result/,
        );
    }
    process.stdout.write(
        JSON.stringify({
            suffix,
            mode,
            clickEvents,
            requests: host.resendRequests().length,
            surfacedFailures: failures.length,
        }) + "\n",
    );
} finally {
    for (const action of cleanup.reverse()) await action();
    process.removeListener("unhandledRejection", observeRejection);
}
