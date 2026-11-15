import test from "node:test";
import assert from "node:assert/strict";
import { fixture, reader, record, settle, deferred } from "./fixture.js";

for (const style of ["default", "speech_bubbles", "irc"])
    test(`${style} receipts preserve canonical public Profile content and independent detail activation`, async (context) => {
        const state = await fixture(context);
        for (const theme of ["light", "dark"]) {
            state.document.body.dataset.theme = theme;
            state.document.documentElement.dataset.messageStyle = style;
            state.root.dataset.messageStyle = style;
            await state.render();
            const avatar = state.root.querySelector(".messages-status-avatar");
            assert.equal(avatar.getAttribute("href"), "/profile/le-firehawk");
            assert.equal(avatar.getAttribute("aria-label"), reader.displayName);
            assert.equal(state.popup(), null);
            avatar.dispatchEvent(
                new state.window.MouseEvent("mouseover", { bubbles: true }),
            );
            assert.equal(state.popup(), null);
            const popup = await state.open();
            assert.equal(popup.getAttribute("role"), "dialog");
            assert.equal(
                popup.getAttribute("aria-label"),
                state.i18n
                    .t("module.social.messages.receipt_seen_by_count")
                    .replace("{count}", "1"),
            );
            assert.equal(popup.getAttribute("aria-modal"), null);
            assert.equal(
                state.trigger().getAttribute("aria-controls"),
                popup.id,
            );
            assert.equal(state.trigger().getAttribute("aria-expanded"), "true");
            assert.equal(
                state.document.activeElement,
                popup.querySelector("button"),
            );
            for (const [host, size, width, fontSize] of [
                [avatar, "tiny", "1.22rem", "0.5rem"],
                [
                    popup.querySelector(".messages-receipt-popup-avatar"),
                    "compact",
                    "1.65rem",
                    "0.6rem",
                ],
            ]) {
                const content = host.querySelector(".profile-avatar-content");
                assert.equal(content.dataset.profileAvatarSize, size);
                assert.equal(content.textContent, "TF");
                assert.equal(
                    content.firstElementChild.style.getPropertyValue(
                        "--initials-bg",
                    ),
                    state.avatars.getPresentation(reader).color,
                );
                assert.equal(
                    state.window.getComputedStyle(content).width,
                    width,
                );
                assert.equal(
                    state.window.getComputedStyle(content).fontSize,
                    fontSize,
                );
                assert.equal(
                    host.querySelector(".availability-indicator"),
                    null,
                );
            }
            assert.equal(
                state.window.getComputedStyle(popup).pointerEvents,
                "auto",
            );
            state.trigger().dispatchEvent(
                new state.window.MouseEvent("mouseout", {
                    bubbles: true,
                    relatedTarget: popup,
                }),
            );
            popup.querySelector("a").focus();
            await settle();
            assert.equal(popup.isConnected, true);
            popup.querySelector("button").click();
            assert.equal(state.popup(), null);
            assert.equal(state.document.activeElement, state.trigger());
        }
    });

test("both receipt paths preserve handles, account-only fallback, safe labels, timestamps and latest-reader deduplication", async (context) => {
    const state = await fixture(context);
    const readers = [
        reader,
        {
            ...reader,
            accountId: "handle-only",
            displayName: "",
            handle: "reader-two",
        },
        { ...reader, accountId: "account-only", displayName: "", handle: "" },
        {
            ...reader,
            accountId: "escaped",
            displayName: '<b>Unsafe & "Name"',
            handle: '@a/b"<c>',
        },
    ];
    await state.render(readers, [
        {
            ...record,
            id: "earlier",
            readBy: readers,
            createdAt: "2026-11-15T11:00:00Z",
        },
        {
            ...record,
            readBy: [...readers, { ...reader, accountId: "synthetic-self" }],
        },
    ]);
    assert.equal(
        state.root.querySelector(
            '[data-message-id="earlier"] .messages-message-status',
        ),
        null,
    );
    assert.equal(
        state.root.querySelectorAll(".messages-status-avatar").length,
        4,
    );
    const popup = await state.open();
    assert.equal(popup.querySelectorAll("li").length, 4);
    for (const selector of [
        ".messages-status-avatar",
        ".messages-receipt-popup-avatar",
    ]) {
        const avatars = state.document.querySelectorAll(selector);
        assert.equal(avatars[2].tagName, "SPAN");
        assert.equal(avatars[2].getAttribute("aria-label"), "account-only");
        assert.equal(
            avatars[3].getAttribute("href"),
            "/profile/a%2Fb%22%3Cc%3E",
        );
        assert.equal(
            avatars[3].getAttribute("aria-label"),
            readers[3].displayName,
        );
    }
    assert.equal(
        popup.querySelector(".messages-receipt-popup-reader-time").textContent,
        "2026-11-15 13:00",
    );
    assert.equal(state.root.querySelector("b"), null);
    assert.equal(popup.querySelector("b"), null);
});

test("Escape honors child cancellation independent of listener order and repeated toggle uses native buttons", async (context) => {
    const state = await fixture(context);
    await state.render();
    assert.equal(state.trigger().tagName, "BUTTON");
    assert.equal(state.trigger().type, "button");
    await state.open();
    const child = (event) => {
        if (event.key === "Escape") event.preventDefault();
    };
    state.document.addEventListener("keydown", child);
    state.document.activeElement.dispatchEvent(
        new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        }),
    );
    await settle();
    assert.ok(state.popup());
    state.document.removeEventListener("keydown", child);
    state.document.activeElement.dispatchEvent(
        new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        }),
    );
    await settle();
    assert.equal(state.popup(), null);
    assert.equal(state.document.activeElement, state.trigger());
    for (let index = 0; index < 3; index++) {
        state.trigger().click();
        state.trigger().click();
        await settle();
        assert.equal(state.popup(), null);
        await state.open();
        state.trigger().click();
        assert.equal(state.popup(), null);
    }
});

test("pending opening is fenced by toggle, room, account, rerender, abort and provider removal", async (context) => {
    const state = await fixture(context);
    for (const invalidate of [
        () => state.trigger().click(),
        () => state.setRoom("new-room"),
        () => state.root.replaceChildren(),
        () =>
            state.root.dispatchEvent(
                new Event("cognis:messages-thread-replacing"),
            ),
    ]) {
        state.setRoom("synthetic-room");
        await state.render();
        const gate = deferred();
        state.uiCtx.extendFlow(
            "messages:openReadReceipts",
            "validate",
            { id: "fixture:delay", order: 1 },
            () => gate.promise,
        );
        state.trigger().click();
        await settle();
        invalidate();
        gate.resolve();
        await settle();
        assert.equal(state.popup(), null);
        state.uiCtx.removeFlowHook(
            "messages:openReadReceipts",
            "validate",
            "fixture:delay",
        );
    }
    await state.render();
    await state.open();
    localStorage.setItem("cognis_account", "different-account");
    await state.uiCtx.runFlow("authenticate-session", {});
    assert.equal(state.popup(), null);
    assert.notEqual(state.document.activeElement, state.trigger());
    localStorage.setItem("cognis_account", "synthetic-self");
    state.rebind();
    await state.render();
    await state.open();
    await state.lifecycle.reconcile(state.profileEntries);
    assert.equal(state.popup(), null);
    assert.equal(
        state.uiCtx.capabilities.get("social:messageReceipts"),
        undefined,
    );
    await state.lifecycle.reconcile([
        ...state.profileEntries,
        ...state.messageEntries,
    ]);
    state.rebind();
    await state.render();
    await state.open();
    state.lifetime.abort();
    assert.equal(state.popup(), null);
});

test("image hydration, error, rename, missing image and delayed detached work remain Profile-owned", async (context) => {
    const state = await fixture(context);
    await state.render([{ ...reader, avatarKey: "receipt-image" }]);
    await state.open();
    await state.avatars.hydrate(state.document.body);
    const images = [
        ...state.document.querySelectorAll(
            ".messages-status-avatar img, .messages-receipt-popup-avatar img",
        ),
    ];
    assert.equal(images.length, 2);
    for (const image of images)
        assert.equal(image.dataset.avatarColorSeed, reader.displayName);
    images[0].dispatchEvent(new Event("error"));
    for (const avatar of state.document.querySelectorAll(
        ".messages-status-avatar, .messages-receipt-popup-avatar",
    )) {
        assert.equal(avatar.textContent, "TF");
        assert.equal(
            avatar.querySelector("[data-avatar-key]").dataset.avatarColorSeed,
            reader.displayName,
        );
    }
    await state.render([
        {
            ...reader,
            displayName: "Renamed Reader",
            avatarKey: "receipt-image",
        },
    ]);
    await state.open();
    await state.avatars.hydrate(state.document.body);
    for (const image of state.document.querySelectorAll(
        ".messages-status-avatar img, .messages-receipt-popup-avatar img",
    ))
        assert.equal(image.dataset.avatarColorSeed, "Renamed Reader");
    state.images = state.state.images;
    state.images.set("missing", new Response(null, { status: 404 }));
    await state.render([{ ...reader, avatarKey: "missing" }]);
    await state.open();
    await settle();
    assert.equal(
        state.document.querySelectorAll(
            ".messages-status-avatar img, .messages-receipt-popup-avatar img",
        ).length,
        0,
    );
    const gate = deferred();
    state.images.set("pending", () => gate.promise);
    await state.render([{ ...reader, avatarKey: "pending" }]);
    const popup = await state.open();
    state.panel.close();
    gate.resolve(
        new Response(new Uint8Array([1, 2, 3]), {
            headers: { "content-type": "image/png" },
        }),
    );
    await settle();
    assert.equal(popup.querySelector("img"), null);
    assert.equal(state.popup(), null);
});

test("actual public Profile previews handle compact and detail links, including reactivated listener order", async (context) => {
    const state = await fixture(context);
    for (const reactivate of [false, true]) {
        if (reactivate) {
            await state.lifecycle.reconcile(state.messageEntries);
            await state.lifecycle.reconcile([
                ...state.messageEntries,
                ...state.profileEntries,
            ]);
        }
        await state.render();
        const avatar = state.root.querySelector(".messages-status-avatar");
        const before = state.state.requests.length;
        avatar.dispatchEvent(
            new state.window.MouseEvent("mouseover", { bubbles: true }),
        );
        await new Promise((resolve) => setTimeout(resolve, 450));
        assert.ok(
            state.state.requests
                .slice(before)
                .some((path) => path.includes("/users/le-firehawk/profile")),
        );
        assert.equal(state.popup(), null);
        const compactEscape = new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        });
        state.document.dispatchEvent(compactEscape);
        assert.equal(compactEscape.defaultPrevented, true);
        await state.open();
        const link = state.popup().querySelector("a");
        link.focus();
        await new Promise((resolve) => setTimeout(resolve, 450));
        const detailEscape = new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        });
        link.dispatchEvent(detailEscape);
        await settle();
        assert.equal(detailEscape.defaultPrevented, true);
        assert.ok(state.popup());
        state.document.dispatchEvent(
            new state.window.KeyboardEvent("keydown", {
                key: "Escape",
                bubbles: true,
                cancelable: true,
            }),
        );
        await settle();
        assert.equal(state.popup(), null);
        assert.equal(state.document.activeElement, state.trigger());
    }
});

test("many readers and CSS order preserve small graphics inside separate targets and viewport-bounded panels", async (context) => {
    const state = await fixture(context);
    await state.render(
        Array.from({ length: 35 }, (_value, index) => ({
            ...reader,
            accountId: `reader-${index}`,
        })),
    );
    for (const style of ["default", "speech_bubbles", "irc"]) {
        state.root.dataset.messageStyle = style;
        for (const owner of ["messages", "profile"]) {
            for (const sheet of state.document.querySelectorAll(
                `style[data-owner="${owner}"]`,
            ))
                state.document.head.appendChild(sheet);
            const popup = await state.open();
            assert.equal(
                state.root.querySelectorAll(".messages-status-avatar").length,
                35,
            );
            const status = state.window.getComputedStyle(
                state.root.querySelector(".messages-message-status--read"),
            );
            assert.equal(status.flexWrap, "wrap");
            assert.equal(status.flexShrink, "1");
            const avatar = state.root.querySelector(".messages-status-avatar");
            assert.equal(
                state.window.getComputedStyle(avatar).minWidth,
                "44px",
            );
            assert.equal(
                state.window.getComputedStyle(avatar).minHeight,
                "44px",
            );
            assert.equal(state.window.getComputedStyle(avatar).marginRight, "");
            assert.equal(
                state.window.getComputedStyle(
                    avatar.querySelector(".profile-avatar-content"),
                ).width,
                "1.22rem",
            );
            assert.equal(
                state.window.getComputedStyle(popup).maxHeight,
                "calc(100dvh - 1rem)",
            );
            assert.equal(state.window.getComputedStyle(popup).overflow, "auto");
            assert.equal(popup.querySelectorAll("[tabindex]").length, 0);
            state.panel.close();
        }
    }
});

test("replaced triggers, scroll, navigation and Profile removal close without restoring obsolete focus", async (context) => {
    const state = await fixture(context);
    for (const change of [
        () => state.trigger().replaceWith(state.trigger().cloneNode(true)),
        () => {
            state.trigger().dataset.readers = "[]";
        },
        () => state.root.dispatchEvent(new Event("scroll")),
        () => state.window.dispatchEvent(new Event("popstate")),
        () => state.render([{ ...reader, displayName: "Changed" }]),
    ]) {
        await state.render();
        await state.open();
        await change();
        await settle();
        assert.equal(state.popup(), null);
        assert.notEqual(state.document.activeElement, state.trigger());
    }
    await state.open();
    await state.lifecycle.reconcile(state.messageEntries);
    assert.equal(state.popup(), null);
    await assert.rejects(
        state.render(),
        /Profile avatar capability unavailable/,
    );
    await state.lifecycle.reconcile([
        ...state.messageEntries,
        ...state.profileEntries,
    ]);
    await state.render();
    await state.open();
    assert.ok(state.popup());
    const outside = state.document.querySelector("#outside");
    outside.focus();
    state.root.remove();
    await settle();
    assert.equal(state.popup(), null);
    assert.equal(state.document.activeElement, outside);
});

test("pending provider removal and page abort cannot resurrect an opening or move later focus", async (context) => {
    const state = await fixture(context);
    for (const mode of ["provider", "page"]) {
        await state.render();
        const gate = deferred();
        state.uiCtx.extendFlow(
            "messages:openReadReceipts",
            "validate",
            { id: "fixture:delay", order: 1 },
            () => gate.promise,
        );
        state.trigger().click();
        await settle();
        if (mode === "provider")
            await state.lifecycle.reconcile(state.profileEntries);
        else state.lifetime.abort();
        const outside = state.document.querySelector("#outside");
        outside.focus();
        gate.resolve();
        await settle();
        assert.equal(state.popup(), null);
        assert.equal(state.document.activeElement, outside);
        if (mode === "provider") {
            await state.lifecycle.reconcile([
                ...state.profileEntries,
                ...state.messageEntries,
            ]);
            state.rebind();
        }
    }
});

test("old Profile content contracts fail closed and restored matching assets render receipts", async (context) => {
    const state = await fixture(context);
    const oldProvider = {
        ...state.avatars,
        contentSizes: ["small", "medium", "large"],
    };
    state.uiCtx.capabilities.remove("ui:profileAvatarRenderer", state.avatars);
    state.uiCtx.capabilities.contribute(
        "ui:profileAvatarRenderer",
        oldProvider,
    );
    await assert.rejects(
        state.render(),
        /profile_avatar_receipt_sizes_unavailable/,
    );
    assert.equal(state.popup(), null);
    state.uiCtx.capabilities.remove("ui:profileAvatarRenderer", oldProvider);
    state.uiCtx.capabilities.contribute(
        "ui:profileAvatarRenderer",
        state.avatars,
    );
    await state.render();
    await state.open();
    assert.equal(
        state.popup().querySelector("[data-profile-avatar-size]").dataset
            .profileAvatarSize,
        "compact",
    );
});

test("Escape after a silent account replacement dismisses stale content without stealing focus", async (context) => {
    const state = await fixture(context);
    await state.render();
    await state.open();
    const outside = state.document.querySelector("#outside");
    outside.focus();
    localStorage.setItem("cognis_account", "replacement");
    state.document.dispatchEvent(
        new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
        }),
    );
    await settle();
    assert.equal(state.popup(), null);
    assert.equal(state.document.activeElement, outside);
});

test("an older deferred flow cannot close or refocus a newer panel", async (context) => {
    const state = await fixture(context);
    await state.render();
    const gate = deferred();
    let visits = 0;
    state.uiCtx.extendFlow(
        "messages:openReadReceipts",
        "validate",
        { id: "fixture:older", order: 1 },
        () => {
            if (++visits === 1) return gate.promise;
        },
    );
    state.trigger().click();
    await settle();
    state.trigger().click();
    const current = await state.open();
    const link = current.querySelector("a");
    link.focus();
    gate.resolve();
    await settle();
    assert.equal(state.popup(), current);
    assert.equal(state.document.activeElement, link);
});

test("current flow failures dismiss the panel and report a safe localized error", async (context) => {
    const state = await fixture(context);
    await state.render();
    state.uiCtx.extendFlow(
        "messages:openReadReceipts",
        "present",
        { id: "fixture:failure", order: 1 },
        () => {
            throw new Error("synthetic_failure");
        },
    );
    await state.open();
    assert.equal(state.popup(), null);
    assert.equal(state.trigger().getAttribute("aria-expanded"), "false");
    assert.ok(
        state.logs.some(
            ([level, _message, metadata]) =>
                level === "error" &&
                metadata.operation === "openReadReceipts" &&
                metadata.errorName === "Error",
        ),
    );
    assert.ok(
        state.document.body.textContent.includes(
            state.i18n.t("ui.reuse.error"),
        ),
    );
    assert.equal(
        state.document.body.textContent.includes("synthetic_failure"),
        false,
    );
});

test("actual read-only presentation remains noninteractive with no receipt or image reads", async (context) => {
    const state = await fixture(context);
    const provider = state.uiCtx.capabilities.get("social:messagePresentation");
    const before = state.state.requests.length;
    const markup = await provider.render({
        records: [{ ...record, text: "Synthetic message" }],
        currentAccountId: "synthetic-self",
        style: "default",
    });
    const container = state.document.createElement("div");
    container.innerHTML = markup;
    assert.equal(provider.version, 2);
    assert.equal(
        container.querySelector("a, button, img, .messages-message-status"),
        null,
    );
    assert.equal(state.state.requests.length, before);
    assert.ok(container.querySelector('[data-profile-avatar-size="small"]'));
});

test("repeated page binding and a separate loader instance share provider ownership", async (context) => {
    const state = await fixture(context);
    await state.render();
    await state.open();
    const previous = state.panel;
    const direct = await import("../../ui/read-receipts.js?direct-fixture");
    const current = direct.bindReadReceiptPanel({
        root: state.root,
        signal: state.lifetime.signal,
        i18n: state.i18n,
        captureRoom: () => () => true,
        isActive: () => !state.lifetime.signal.aborted,
    });
    assert.equal(state.popup(), null);
    await state.open();
    assert.equal(
        state.document.querySelectorAll(".messages-read-receipt-popup").length,
        1,
    );
    previous.dispose();
    assert.ok(state.popup());
    current.dispose();
    assert.equal(state.popup(), null);
});
