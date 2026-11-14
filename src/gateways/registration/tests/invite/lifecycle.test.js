import test from "node:test";
import assert from "node:assert/strict";
import { fixture, settle, deferred } from "./fixture.js";

for (const action of ["click", "Enter"]) {
    test(`${action} corrects an invalid recipient and creates once with the trimmed address`, async (context) => {
        const host = await fixture(context);
        await host.open();
        host.edit("not-an-address");
        host.create();
        await settle();
        const input = host.edit("  synthetic+invite@example.test  ");
        assert.equal(input.hasAttribute("aria-invalid"), false);
        assert.equal(input.hasAttribute("aria-describedby"), false);
        assert.equal(
            input.labels[0]
                .querySelector("[data-form-builder-required]")
                .getAttribute("aria-hidden"),
            "true",
        );
        if (action === "click") host.create();
        else host.key("Enter");
        await settle();
        assert.deepEqual(host.creations, [
            { email: "synthetic+invite@example.test", delivery: "email" },
        ]);
        assert.equal(host.active(), null);
        assert.equal(host.toast(), "Invitation sent.");
        assert.equal(host.refreshes(), 1);
    });
}

test("native email syntax permits single-label domains and punctuation without a stricter regex", async (context) => {
    const host = await fixture(context);
    await host.open();
    host.edit("synthetic+tag@intranet");
    host.create();
    await settle();
    assert.equal(host.creations[0].email, "synthetic+tag@intranet");
});

test("repeated triggers, action clicks and Enter share one invitation attempt", async (context) => {
    const pending = deferred();
    const host = await fixture(context, { create: () => pending.promise });
    const overlay = await host.open();
    host.root.querySelector("#invite-email-btn").click();
    await settle();
    assert.equal(
        host.document.querySelectorAll("[data-popup-active]").length,
        1,
    );
    const input = host.edit("synthetic@example.test");
    const button = overlay.querySelector('[data-popup-action="create"]');
    button.click();
    input.value = "replacement@example.test";
    button.click();
    host.key("Enter");
    await settle();
    host.root.querySelector("#invite-email-btn").click();
    await settle();
    assert.deepEqual(host.creations, [
        { email: "synthetic@example.test", delivery: "email" },
    ]);
    assert.equal(host.active(), null);
    pending.resolve(Response.json({ data: {} }));
    await settle();
    await host.open();
    assert.equal(host.active().querySelector("input[type=email]").value, "");
});

for (const dismissal of ["close", "Escape", "backdrop"]) {
    test(`${dismissal} cancels validation and reopens a clean form`, async (context) => {
        const host = await fixture(context);
        const overlay = await host.open();
        const input = host.edit("invalid");
        host.create();
        await settle();
        if (dismissal === "close")
            overlay.querySelector("[data-popup-action=close]").click();
        else if (dismissal === "Escape") host.key("Escape");
        else overlay.click();
        await settle();
        assert.equal(host.active(), null);
        assert.equal(
            host.document.activeElement,
            host.root.querySelector("#invite-email-btn"),
        );
        assert.equal(host.creations.length, 0);
        assert.equal(host.refreshes(), 0);
        const reopened = await host.open();
        assert.notEqual(reopened, overlay);
        const freshInput = reopened.querySelector("input[type=email]");
        assert.equal(freshInput.value, "");
        assert.equal(freshInput.hasAttribute("aria-invalid"), false);
        assert.equal(host.document.activeElement, freshInput);
        input.value = "late@example.test";
        overlay.querySelector("[data-popup-action=create]").click();
        await settle();
        assert.equal(host.creations.length, 0);
    });
}

test("navigation disposes an open email form and stale clicks cannot create", async (context) => {
    const host = await fixture(context);
    const overlay = await host.open();
    host.edit("synthetic@example.test");
    host.lifecycle.abort();
    host.root.replaceChildren();
    host.window.history.pushState({}, "", "/next");
    await settle();
    assert.equal(host.active(), null);
    assert.equal(overlay.isConnected, false);
    overlay.querySelector("[data-popup-action=create]").click();
    host.key("Enter");
    await settle();
    assert.equal(host.creations.length, 0);
    assert.equal(host.refreshes(), 0);
    assert.equal(host.window.location.pathname, "/next");
});

test("disposal while confirmation is pending prevents the creation callback", async (context) => {
    const pending = deferred();
    const host = await fixture(context, { confirm: () => pending.promise });
    await host.open();
    host.edit("synthetic@example.test");
    host.create();
    await settle();
    host.lifecycle.abort();
    pending.resolve();
    await settle();
    assert.equal(host.creations.length, 0);
    assert.equal(host.refreshes(), 0);
});

test("a completed request after disposal cannot toast or refresh a replacement page", async (context) => {
    const pending = deferred();
    const host = await fixture(context, { create: () => pending.promise });
    await host.open();
    host.edit("synthetic@example.test");
    host.create();
    await settle();
    assert.equal(host.creations.length, 1);
    host.lifecycle.abort();
    host.root.innerHTML = "<p>Replacement page</p>";
    pending.resolve(Response.json({ data: {} }));
    await settle();
    assert.equal(host.toast(), undefined);
    assert.equal(host.refreshes(), 0);
    assert.equal(host.root.textContent, "Replacement page");
});

for (const code of [
    "duplicate_invitation",
    "email_domain_not_allowed",
    "invite_failed",
]) {
    test(`server ${code} remains authoritative for a syntactically valid email`, async (context) => {
        const host = await fixture(context, {
            create: () => Response.json({ error: { code } }, { status: 400 }),
        });
        await host.open();
        host.edit("synthetic@example.test");
        host.create();
        await settle();
        assert.equal(host.creations.length, 1);
        assert.equal(host.active(), null);
        assert.equal(
            host.toast(),
            code === "email_domain_not_allowed"
                ? "This email domain is not permitted. Please use an address from an allowed domain."
                : "Failed to send invitation.",
        );
        assert.equal(host.refreshes(), 1);
        await host.open();
        assert.equal(
            host.active().querySelector("input[type=email]").value,
            "",
        );
    });
}

test("transport failures show a localized error and release the next attempt", async (context) => {
    const host = await fixture(context, {
        create: () => {
            throw new Error("synthetic_failure");
        },
    });
    await host.open();
    host.edit("synthetic@example.test");
    host.create();
    await settle();
    assert.equal(host.creations.length, 1);
    assert.equal(host.toast(), "Failed to send invitation.");
    assert.ok(
        host.logs.some(
            (entry) =>
                entry.level === "error" &&
                entry.args[1]?.operation === "createInvitationEmail",
        ),
    );
    assert.equal(
        JSON.stringify(host.logs).includes("synthetic@example.test"),
        false,
    );
    await host.open();
});

test("disposal during popup preparation leaves no active overlay or invitation", async (context) => {
    const host = await fixture(context);
    host.root.querySelector("#invite-email-btn").click();
    host.lifecycle.abort();
    await settle();
    assert.equal(host.active(), null);
    assert.equal(host.creations.length, 0);
    assert.equal(host.refreshes(), 0);
});

test("a late failure body after disposal cannot report into a replacement page", async (context) => {
    const payload = deferred();
    const host = await fixture(context, {
        create: () => ({ ok: false, json: () => payload.promise }),
    });
    await host.open();
    host.edit("synthetic@example.test");
    host.create();
    await settle();
    host.lifecycle.abort();
    payload.resolve({ error: { code: "email_domain_not_allowed" } });
    await settle();
    assert.equal(host.toast(), undefined);
    assert.equal(host.refreshes(), 0);
});

test("disposing and remounting binds only the new page invitation controls", async (context) => {
    const host = await fixture(context);
    const overlay = await host.open();
    host.edit("synthetic@example.test");
    host.lifecycle.abort();
    await settle();
    const nextLifecycle = new host.window.AbortController();
    context.after(() => nextLifecycle.abort());
    await host.page.mount(host.root, { signal: nextLifecycle.signal });
    await host.open();
    overlay.querySelector("[data-popup-action=create]").click();
    host.edit("new@example.test");
    host.create();
    await settle();
    assert.deepEqual(host.creations, [
        { email: "new@example.test", delivery: "email" },
    ]);
});

test("reopened invitation labels and errors belong to the new form while the closing popup remains", async (context) => {
    const host = await fixture(context);
    const closingOverlay = await host.open();
    const closingInput = host.edit("invalid");
    host.create();
    await settle();
    const closingError = host.document.getElementById(
        closingInput.getAttribute("aria-describedby"),
    );
    closingOverlay.querySelector("[data-popup-action=close]").click();
    await settle();
    const overlay = await host.open();
    assert.equal(closingOverlay.isConnected, true);
    const input = host.edit("");
    const label = overlay.querySelector("label");
    assert.equal(label.control, input);
    assert.notEqual(
        overlay.querySelector("form").id,
        closingOverlay.querySelector("form").id,
    );
    host.create();
    await settle();
    const description = host.document.getElementById(
        input.getAttribute("aria-describedby"),
    );
    assert.equal(overlay.contains(description), true);
    assert.notEqual(description, closingError);
    assert.equal(
        description.textContent,
        "Enter the invitation recipient’s email address.",
    );
    assert.equal(
        closingError.textContent,
        "Enter a valid email address for the invitation recipient.",
    );
    assert.equal(
        host.document.querySelectorAll(`[id="${input.id}"]`).length,
        1,
    );
    assert.equal(host.document.activeElement, input);
    assert.equal(host.creations.length, 0);
});

test("provider error payloads cannot masquerade as missing translations or supply UI text", async (context) => {
    const privateDetail =
        "synthetic provider diagnostic: private-recipient@example.test";
    const host = await fixture(context, {
        create: () =>
            Response.json(
                {
                    error: {
                        code: "missing_translation",
                        message: privateDetail,
                    },
                },
                { status: 400 },
            ),
    });
    await host.open();
    host.edit("synthetic@example.test");
    host.create();
    await settle();
    assert.equal(host.creations.length, 1);
    assert.equal(host.toast(), "Failed to send invitation.");
    assert.deepEqual(host.takeActionErrors(), []);
    assert.equal(host.document.body.textContent.includes(privateDetail), false);
    assert.equal(JSON.stringify(host.logs).includes(privateDetail), false);
});
