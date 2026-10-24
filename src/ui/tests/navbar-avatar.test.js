import test from "node:test";
import assert from "node:assert/strict";
import { updateNavbarAvatar } from "../layouts/navbar-avatar.js";
import { uiCtx } from "../reuse/ui-ctx.js";

function element() {
    return {
        className: "",
        style: {},
        children: [],
        isConnected: true,
        querySelector(selector) {
            return (
                this.children.find(
                    (child) => `.${child.className}` === selector,
                ) ?? null
            );
        },
        replaceChildren(...children) {
            this.children = children;
        },
        append(child) {
            this.children.push(child);
        },
        getAttribute(name) {
            return this[name];
        },
    };
}

function deferred() {
    let resolve;
    const promise = new Promise((yes) => {
        resolve = yes;
    });
    return { promise, resolve };
}

test("fresh avatar reads retain unchanged UI and reject stale account, provider and refresh results", async () => {
    const previousDocument = globalThis.document;
    const previousStorage = globalThis.localStorage;
    const button = element();
    const indicator = element();
    indicator.className = "availability-indicator";
    button.append(indicator);
    const account = new Map([
        ["cognis_account", "alice"],
        ["cognis_access_token", "alice-token"],
    ]);
    let visible;
    globalThis.document = {
        createElement: element,
        querySelector(selector) {
            if (selector === ".avatar-button") return button;
            if (selector === "[data-profile-link]")
                return {
                    closest: () => ({
                        toggleAttribute: (_name, hidden) => {
                            visible = !hidden;
                        },
                    }),
                };
            return null;
        },
    };
    globalThis.localStorage = { getItem: (key) => account.get(key) ?? null };
    let result = { profileAvailable: true, avatarBlobUrl: "blob:alice" };
    let calls = 0;
    const provider = () => {
        calls++;
        return result;
    };
    uiCtx.capabilities.contribute("ui:navbarAvatarProvider", provider);
    const release = () =>
        uiCtx.capabilities.remove("ui:navbarAvatarProvider", provider);
    try {
        await updateNavbarAvatar();
        const image = button.querySelector(".avatar-image");
        assert.equal(image.src, "blob:alice");
        await updateNavbarAvatar();
        assert.equal(calls, 2, "each refresh reads the provider afresh");
        assert.equal(button.querySelector(".avatar-image"), image);
        assert.equal(
            button.querySelector(".availability-indicator"),
            indicator,
        );
        assert.equal(visible, true);

        const stale = deferred();
        result = stale.promise;
        const pending = updateNavbarAvatar();
        account.set("cognis_account", "bob");
        account.set("cognis_access_token", "bob-token");
        result = {
            profileAvailable: true,
            avatarInitials: "B",
            avatarColor: "blue",
        };
        await updateNavbarAvatar();
        const initials = button.querySelector(".avatar-initials");
        stale.resolve({
            profileAvailable: true,
            avatarBlobUrl: "blob:stale-alice",
        });
        await pending;
        assert.equal(button.querySelector(".avatar-initials"), initials);
        await updateNavbarAvatar();
        assert.equal(button.querySelector(".avatar-initials"), initials);

        const disabled = deferred();
        result = disabled.promise;
        const pendingDisabled = updateNavbarAvatar();
        release();
        disabled.resolve({
            profileAvailable: true,
            avatarBlobUrl: "blob:disabled",
        });
        await pendingDisabled;
        assert.equal(button.querySelector(".avatar-initials"), initials);
        await updateNavbarAvatar();
        assert.equal(visible, false);
        assert.equal(button.querySelector(".avatar-initials").textContent, "?");
    } finally {
        release();
        globalThis.document = previousDocument;
        globalThis.localStorage = previousStorage;
    }
});
