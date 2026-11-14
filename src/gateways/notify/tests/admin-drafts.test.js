import test from "node:test";
import assert from "node:assert/strict";
import {
    environment,
    settle,
    deferred,
    response,
} from "./fixtures/administration.js";

for (const kind of ["notifications", "broadcasts"]) {
    test(`${kind} retain the entire draft through repeated render, unmount, and discard`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        const values =
            kind === "notifications"
                ? [
                      ["debugUser", "second-user"],
                      ["debugCategory", "study"],
                      ["debugSubject", " <Synthetic> "],
                      ["debugBody", "Line one\n{private_text}"],
                  ]
                : [
                      ["broadcastTitle", " <Synthetic> "],
                      ["broadcastMessage", "Line one\n{private_text}"],
                      ["broadcastMode", "popup"],
                      ["broadcastStartAt", "2026-12-01T10:00"],
                      ["broadcastEndAt", "2026-12-02T10:00"],
                      ["broadcastRedirectUrl", "https://trusted.invalid/path"],
                      ["broadcastRoles", true, "teacher"],
                      ["broadcastRoles", true, "user"],
                      ["broadcastRequireAck", true],
                      ["broadcastEnabled", false],
                  ];
        assert.equal(fixture.section.isDirty(), false);
        for (const entry of values) fixture.edit(...entry);
        assert.equal(fixture.section.isDirty(), true);
        assert.deepEqual(fixture.dirty.at(-1), { id: kind, value: true });
        for (let index = 0; index < 3; index++) {
            fixture.render();
            for (const [name, value, choice] of values)
                assert.equal(
                    typeof value === "boolean"
                        ? fixture.field(name, choice).checked
                        : fixture.field(name).value,
                    value,
                );
            fixture.unmount();
            fixture.render();
        }
        fixture.section.discard();
        fixture.render();
        assert.equal(fixture.section.isDirty(), false);
        assert.deepEqual(fixture.dirty.at(-1), { id: kind, value: false });
        assert.equal(
            fixture.field(
                kind === "notifications" ? "debugSubject" : "broadcastTitle",
            ).value,
            "",
        );
        if (kind === "broadcasts") {
            assert.equal(fixture.field("broadcastEnabled").checked, true);
            assert.equal(fixture.field("broadcastMode").value, "bar");
            assert.equal(
                fixture.field("broadcastRoles", "user").checked,
                false,
            );
        }
        assert.equal(fixture.writes().length, 0);
        assert.equal(
            fixture.window.localStorage.length,
            1,
            "drafts never enter persistent storage",
        );
    });

    test(`${kind} success clears the submitted draft but preserves newer edits`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        fixture.fill();
        fixture.button().click();
        await settle();
        assert.equal(fixture.section.isDirty(), false);
        const title =
            kind === "notifications" ? "debugSubject" : "broadcastTitle";
        assert.equal(fixture.field(title).value, "");
        fixture.fill();
        const pending = deferred();
        fixture.intercept((request) =>
            request.method === "POST" ? pending.promise : undefined,
        );
        fixture.button().click();
        await settle();
        fixture.edit(title, "Newer unsent content");
        pending.resolve(response());
        await settle();
        assert.equal(fixture.field(title).value, "Newer unsent content");
        assert.equal(fixture.section.isDirty(), true);
        assert.equal(fixture.writes().length, 2);
        assert.equal(
            fixture.writes()[1].body[
                kind === "notifications" ? "subject" : "title"
            ],
            "Synthetic title",
        );
    });

    test(`${kind} old-account and unmounted completions cannot change the active draft`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        fixture.fill();
        const pending = deferred();
        fixture.intercept((request) =>
            request.method === "POST" ? pending.promise : undefined,
        );
        const oldButton = fixture.button();
        oldButton.click();
        await settle();
        fixture.unmount();
        fixture.render();
        fixture.edit(
            kind === "notifications" ? "debugSubject" : "broadcastTitle",
            "New lifetime",
        );
        oldButton.dispatchEvent(new fixture.window.Event("click"));
        pending.resolve(response());
        await settle();
        assert.equal(fixture.notices.length, 0);
        assert.equal(fixture.writes().length, 1);
        assert.equal(
            fixture.field(
                kind === "notifications" ? "debugSubject" : "broadcastTitle",
            ).value,
            "New lifetime",
        );
        assert.equal(fixture.button().disabled, false);
        fixture.window.localStorage.setItem("cognis_account", "another-admin");
        fixture.button().click();
        await settle();
        assert.equal(fixture.writes().length, 1);
        fixture.render();
        assert.equal(fixture.root.textContent, "");
    });
}

for (const kind of ["notifications", "broadcasts"]) {
    for (const editAgain of [false, true]) {
        test(`${kind} same-owner redraw settles its accepted POST with newer edits ${editAgain}`, async (context) => {
            const fixture = await environment(kind);
            context.after(fixture.close);
            fixture.fill();
            const pending = deferred();
            fixture.intercept((request) =>
                request.method === "POST" ? pending.promise : undefined,
            );
            fixture.button().click();
            await settle();
            const request = fixture.writes()[0];
            fixture.render();
            fixture.section.subComposerOptions.onRender(fixture.root);
            assert.equal(request.signal.aborted, false);
            assert.equal(fixture.button().disabled, true);
            if (editAgain)
                fixture.edit(
                    kind === "notifications"
                        ? "debugSubject"
                        : "broadcastTitle",
                    "Newer draft",
                );
            pending.resolve(response());
            await settle();
            assert.equal(
                fixture.notices.filter((notice) => notice.variant === "success")
                    .length,
                1,
            );
            assert.equal(fixture.writes().length, 1);
            assert.equal(fixture.section.isDirty(), editAgain);
            assert.equal(
                fixture.field(
                    kind === "notifications"
                        ? "debugSubject"
                        : "broadcastTitle",
                ).value,
                editAgain ? "Newer draft" : "",
            );
            assert.equal(fixture.button().disabled, false);
        });
    }
}

for (const kind of ["notifications", "broadcasts"]) {
    for (const key of ["cognis_account", "cognis_access_token"]) {
        test(`${kind} clears mounted account data on ${key} storage replacement`, async (context) => {
            const fixture = await environment(kind);
            context.after(fixture.close);
            fixture.fill();
            const oldButton = fixture.button();
            fixture.window.localStorage.setItem(key, "replacement");
            fixture.window.dispatchEvent(
                new fixture.window.StorageEvent("storage", {
                    key,
                    newValue: "replacement",
                }),
            );
            assert.equal(fixture.root.textContent.trim(), "");
            assert.equal(fixture.button(), null);
            assert.equal(fixture.section.isDirty(), false);
            assert.deepEqual(fixture.dirty.at(-1), { id: kind, value: false });
            oldButton.click();
            await settle();
            assert.equal(fixture.writes().length, 0);
            fixture.render();
            assert.equal(fixture.root.textContent, "");
        });
    }

    test(`${kind} unchanged storage events preserve drafts and old binding cleanup cannot clear a replacement`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        fixture.fill();
        const title =
            kind === "notifications" ? "debugSubject" : "broadcastTitle";
        fixture.window.dispatchEvent(
            new fixture.window.StorageEvent("storage", {
                key: "cognis_account",
                newValue: "misleading-event-value",
            }),
        );
        assert.equal(fixture.field(title).value, "Synthetic title");
        fixture.render();
        fixture.edit(title, "Rebound draft");
        fixture.window.dispatchEvent(
            new fixture.window.StorageEvent("storage", { key: "unrelated" }),
        );
        assert.equal(fixture.field(title).value, "Rebound draft");
        fixture.unmount();
        fixture.root.innerHTML = "<p>Replacement page</p>";
        fixture.window.localStorage.setItem("cognis_account", "replacement");
        fixture.window.dispatchEvent(
            new fixture.window.StorageEvent("storage", { key: null }),
        );
        assert.equal(fixture.root.textContent, "Replacement page");
        assert.equal(fixture.writes().length, 0);
    });

    test(`${kind} account replacement after POST suppresses stale completion and clears mounted data`, async (context) => {
        const fixture = await environment(kind);
        context.after(fixture.close);
        fixture.fill();
        const pending = deferred();
        fixture.intercept((request) =>
            request.method === "POST" ? pending.promise : undefined,
        );
        fixture.button().click();
        await settle();
        const request = fixture.writes()[0];
        fixture.window.localStorage.setItem("cognis_account", "replacement");
        fixture.window.dispatchEvent(
            new fixture.window.StorageEvent("storage", {
                key: "cognis_account",
            }),
        );
        assert.equal(request.signal.aborted, true);
        pending.resolve(response());
        await settle();
        assert.equal(fixture.root.textContent.trim(), "");
        assert.equal(fixture.notices.length, 0);
        assert.equal(fixture.writes().length, 1);
    });
}
