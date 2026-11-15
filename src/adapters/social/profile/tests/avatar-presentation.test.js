import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { avatarFixture, deferred, settle } from "./avatar-fixture.js";

async function fixture(context) {
    const state = avatarFixture(context);
    await state.ready;
    const main = state.document.querySelector("main");
    main.innerHTML =
        '<a href="/profile/le-firehawk">Profile</a><section id="hero"></section>';
    const link = main.querySelector("a");
    const i18n = { t: (key) => key };
    state.preview.bindProfilePreviews(i18n);
    return {
        ...state,
        link,
        async open() {
            link.dispatchEvent(
                new state.window.FocusEvent("focusin", { bubbles: true }),
            );
            await state.timers();
        },
        render(profile, avatarBlobUrl = null, isOwnProfile = true) {
            state.document.querySelector("#hero").innerHTML =
                state.hero.renderHero({
                    profile,
                    avatarBlobUrl,
                    bannerBlobUrl: null,
                    bannerPanX: 50,
                    bannerPanY: 50,
                    isOwnProfile,
                    posts: [],
                    following: [],
                    followers: [],
                    i18n,
                });
        },
    };
}

const namedProfile = {
    handle: "le-firehawk",
    displayName: "The Firehawk",
    avatarKey: null,
};
const surfaces = [".avatar-button", ".profile-mini-preview__avatar", "#hero"];
const initials = (state, surface) =>
    state.document.querySelector(
        `${surface} .profile-capability-avatar-initials`,
    );

test("registered presentation and actual navbar, preview and hero share authorized initials and seed", async (context) => {
    const state = await fixture(context);
    const renderer = state.uiCtx.capabilities.get("ui:profileAvatarRenderer");
    for (const [profile, expected] of [
        [namedProfile, "TF"],
        [{ ...namedProfile, displayName: "Ada" }, "A"],
        [{ ...namedProfile, displayName: "" }, "LF"],
        [{ ...namedProfile, displayName: "<script> Unsafe" }, "<U"],
    ]) {
        state.setProfile(profile);
        await state.navbar.updateNavbarAvatar();
        await state.open();
        state.render(profile);
        const presentation = renderer.getPresentation(profile);
        assert.equal(presentation.label, profile.displayName || profile.handle);
        assert.equal(presentation.initials, expected);
        assert.equal(presentation.colorSeed, presentation.label);
        for (const surface of surfaces) {
            assert.equal(initials(state, surface).textContent, expected);
            assert.equal(
                initials(state, surface).style.getPropertyValue(
                    "--initials-bg",
                ),
                presentation.color,
            );
        }
        assert.equal(state.document.querySelector("script"), null);
        const previewLink = state.document.querySelector(
            ".profile-mini-preview__avatar",
        );
        assert.equal(previewLink.getAttribute("href"), "/profile/le-firehawk");
        assert.equal(
            previewLink.getAttribute("aria-label"),
            presentation.label,
        );
        assert.equal(previewLink.querySelector("a, button"), null);
        assert.equal(
            state.document
                .querySelector(".profile-hero-avatar-btn")
                .getAttribute("aria-label"),
            "ui.app.profile.change_avatar",
        );
    }
    assert.throws(
        () => renderer.buildContent({ profile: namedProfile, size: "unknown" }),
        /profile_avatar_size_invalid/,
    );
});

test("owner content has explicit geometry and typography independent of shell CSS order in both themes", async (context) => {
    const state = await fixture(context);
    state.setProfile(namedProfile);
    await state.navbar.updateNavbarAvatar();
    await state.open();
    state.render(namedProfile);
    const styles = [
        "../../../../ui/styles/reuse/theme.css",
        "../../../../ui/styles/reuse/layout.css",
        "../../../../ui/styles/reuse/presence.css",
        "../ui/availability.css",
        "../ui/profile-social.css",
    ].map((path) => readFileSync(new URL(path, import.meta.url), "utf8"));
    for (const theme of ["light", "dark"]) {
        state.document.documentElement.dataset.theme = theme;
        for (const order of [styles, [...styles].reverse()]) {
            state.document.head.replaceChildren();
            for (const source of order) {
                const style = state.document.createElement("style");
                style.textContent = source;
                state.document.head.append(style);
            }
            for (const [index, surface] of surfaces.entries()) {
                const fallback = initials(state, surface);
                const content = fallback.parentElement;
                const computed = state.window.getComputedStyle(content);
                const childComputed = state.window.getComputedStyle(fallback);
                assert.equal(
                    content.dataset.profileAvatarSize,
                    ["small", "medium", "large"][index],
                );
                assert.equal(computed.width, ["32px", "48px", "80px"][index]);
                assert.equal(computed.height, computed.width);
                assert.equal(
                    computed.fontSize,
                    ["0.7rem", "1.05rem", "1.75rem"][index],
                );
                assert.equal(computed.fontWeight, "700");
                assert.equal(computed.lineHeight, "1");
                assert.equal(computed.padding, "0px");
                assert.equal(computed.borderWidth, "0px");
                assert.equal(childComputed.display, "grid");
                assert.equal(childComputed.objectFit, "cover");
                assert.equal(childComputed.color, "rgb(255, 255, 255)");
            }
        }
    }
});

test("same-key retained navbar and preview images restore the current name after decode error", async (context) => {
    const state = await fixture(context);
    const profile = { ...namedProfile, avatarKey: "synthetic/avatar" };
    state.setProfile(profile);
    await state.navbar.updateNavbarAvatar();
    await state.open();
    const navbarImage = state.document.querySelector(".avatar-button img");
    const previewImage = state.document.querySelector(
        ".profile-mini-preview img",
    );
    for (const displayName of ["New Name", "Changed Name"]) {
        state.setProfile({ ...profile, displayName });
        await state.navbar.updateNavbarAvatar();
        await state.open();
        assert.equal(
            state.document.querySelector(".avatar-button img"),
            navbarImage,
        );
        assert.equal(
            state.document.querySelector(".profile-mini-preview img"),
            previewImage,
        );
        assert.equal(navbarImage.dataset.avatarLabel, displayName);
        assert.equal(previewImage.dataset.avatarLabel, displayName);
    }
    const before = state.requests.length;
    navbarImage.dispatchEvent(new state.window.Event("error"));
    for (const surface of surfaces.slice(0, 2)) {
        assert.equal(initials(state, surface).textContent, "CN");
        assert.equal(
            initials(state, surface).style.getPropertyValue("--initials-bg"),
            state.avatar.getProfileInitialsColor("Changed Name"),
        );
    }
    assert.equal(
        state.requests.length,
        before,
        "decode failures do not schedule a retry",
    );
    await state.navbar.updateNavbarAvatar();
    await state.open();
    assert.notEqual(
        state.document.querySelector(".avatar-button img").src,
        navbarImage.src,
    );
    assert.equal(
        state.revoked.filter((url) => url === navbarImage.src).length,
        1,
    );
});

test("loading remains bounded and focusing the preview avatar neither reopens nor hides it", async (context) => {
    const state = await fixture(context);
    const pending = deferred();
    state.setRequest(() => pending.promise);
    const opening = state.open();
    await settle();
    assert.ok(state.document.querySelector(".profile-mini-preview__loading"));
    pending.resolve(Response.json({ data: namedProfile }));
    await opening;
    const preview = state.document.querySelector(".profile-mini-preview");
    const link = preview.querySelector(".profile-mini-preview__avatar");
    const reads = state.requests.length;
    state.link.dispatchEvent(
        new state.window.FocusEvent("focusout", {
            bubbles: true,
            relatedTarget: link,
        }),
    );
    link.dispatchEvent(
        new state.window.FocusEvent("focusin", { bubbles: true }),
    );
    link.dispatchEvent(
        new state.window.MouseEvent("mouseover", { bubbles: true }),
    );
    await state.timers();
    assert.equal(preview.hidden, false);
    assert.equal(preview.querySelector(".profile-mini-preview__avatar"), link);
    assert.equal(state.requests.length, reads);
    assert.equal(link.getAttribute("href"), "/profile/le-firehawk");
});

test("public custom markup keeps consumer colors, classes, navigation and image hydration", async (context) => {
    const state = await fixture(context);
    const renderer = state.uiCtx.capabilities.get("ui:profileAvatarRenderer");
    const main = state.document.querySelector("main");
    main.innerHTML = renderer.buildMarkup({
        avatarKey: "synthetic/custom-avatar",
        label: "The Firehawk",
        colorSeed: "room-member",
        avatarClass: "consumer-avatar",
        imageClass: "consumer-image",
        fallbackClass: "consumer-initials",
        profileHandle: "@le-firehawk",
        linkClass: "consumer-link",
        showAvailability: true,
    });
    const link = main.querySelector("a");
    assert.equal(link.getAttribute("href"), "/profile/le-firehawk");
    assert.equal(link.getAttribute("aria-label"), "The Firehawk");
    assert.equal(link.classList.contains("consumer-avatar"), true);
    assert.equal(link.classList.contains("consumer-link"), true);
    assert.ok(link.querySelector(".availability-indicator"));
    assert.equal(
        link
            .querySelector(".consumer-initials")
            .style.getPropertyValue("--initials-bg"),
        renderer.getInitialsColor("room-member"),
    );
    await renderer.hydrate(main);
    assert.ok(link.querySelector("img.consumer-image"));
    link.querySelector("img").dispatchEvent(new state.window.Event("error"));
    assert.equal(link.querySelector(".consumer-initials").textContent, "TF");
});

for (const status of [200, 403, 404]) {
    test(`supplied public content images reconcile hydration and errors (${status})`, async (context) => {
        const state = await fixture(context);
        const renderer = state.uiCtx.capabilities.get(
            "ui:profileAvatarRenderer",
        );
        const main = state.document.querySelector("main");
        main.innerHTML = renderer.buildContent({
            profile: namedProfile,
            avatarKey: "supplied/avatar",
            blobUrl: "blob:caller-owned",
            size: "medium",
        });
        state.setRequest(async () => new Response("image", { status }));
        await renderer.hydrate(main);
        if (status === 200)
            main.querySelector("img").dispatchEvent(
                new state.window.Event("error"),
            );
        assert.equal(main.querySelector("img"), null);
        assert.equal(
            main.querySelector(".profile-capability-avatar-initials")
                .textContent,
            "TF",
        );
        assert.equal(state.revoked.includes("blob:caller-owned"), false);
    });
}

test("the named nonmodal preview keeps keyboard focus, closes with Escape and can reopen", async (context) => {
    const state = await fixture(context);
    state.setProfile(namedProfile);
    state.link.focus();
    await state.timers();
    const preview = state.document.querySelector(".profile-mini-preview");
    assert.equal(preview.getAttribute("role"), "dialog");
    assert.equal(preview.getAttribute("aria-modal"), "false");
    assert.equal(preview.getAttribute("aria-label"), "The Firehawk");
    const avatarLink = preview.querySelector(".profile-mini-preview__avatar");
    avatarLink.focus();
    await state.timers();
    assert.equal(state.document.activeElement, avatarLink);
    preview.dispatchEvent(new state.window.MouseEvent("mouseleave"));
    await state.timers();
    assert.equal(preview.hidden, false);
    const reads = state.requests.length;
    avatarLink.dispatchEvent(
        new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
        }),
    );
    await state.timers();
    assert.equal(preview.hidden, true);
    assert.equal(state.document.activeElement, state.link);
    assert.equal(state.requests.length, reads);
    const outside = state.document.querySelector(".avatar-button");
    outside.focus();
    state.link.focus();
    await state.timers();
    assert.equal(preview.hidden, false);
    preview.querySelector(".profile-mini-preview__avatar").focus();
    outside.focus();
    await state.timers();
    assert.equal(preview.hidden, true);
});

test("pointer transit preserves the card without stealing focus and Escape leaves outside focus alone", async (context) => {
    const state = await fixture(context);
    state.setProfile(namedProfile);
    const outside = state.document.querySelector(".avatar-button");
    outside.focus();
    state.link.dispatchEvent(
        new state.window.MouseEvent("mouseover", { bubbles: true }),
    );
    await state.timers();
    const preview = state.document.querySelector(".profile-mini-preview");
    const avatarLink = preview.querySelector(".profile-mini-preview__avatar");
    state.link.dispatchEvent(
        new state.window.MouseEvent("mouseout", {
            bubbles: true,
            relatedTarget: avatarLink,
        }),
    );
    preview.dispatchEvent(new state.window.MouseEvent("mouseenter"));
    await state.timers();
    assert.equal(preview.hidden, false);
    assert.equal(state.document.activeElement, outside);
    outside.dispatchEvent(
        new state.window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
        }),
    );
    await state.timers();
    assert.equal(preview.hidden, true);
    assert.equal(state.document.activeElement, outside);
});

test("advertised content sizes preserve existing footprints and add compact owner geometry", async (context) => {
    const state = await fixture(context);
    const renderer = state.uiCtx.capabilities.get("ui:profileAvatarRenderer");
    assert.deepEqual(
        [...renderer.contentSizes],
        ["tiny", "compact", "small", "medium", "large"],
    );
    assert.equal(Object.isFrozen(renderer.contentSizes), true);
    const stylesheet = state.document.createElement("style");
    stylesheet.textContent = readFileSync(
        new URL("../ui/availability.css", import.meta.url),
        "utf8",
    );
    state.document.head.appendChild(stylesheet);
    for (const [size, width, fontSize] of [
        ["tiny", "1.22rem", "0.5rem"],
        ["compact", "1.65rem", "0.6rem"],
        ["small", "32px", "0.7rem"],
        ["medium", "48px", "1.05rem"],
        ["large", "80px", "1.75rem"],
    ]) {
        const container = state.document.createElement("div");
        container.innerHTML = renderer.buildContent({
            profile: namedProfile,
            size,
            avatarKey: "synthetic",
        });
        state.document.body.appendChild(container);
        const content = container.firstElementChild;
        const computed = state.window.getComputedStyle(content);
        assert.equal(computed.width, width);
        assert.equal(computed.height, width);
        assert.equal(computed.fontSize, fontSize);
        assert.equal(content.textContent, "TF");
        assert.equal(
            content.firstElementChild.dataset.avatarColorSeed,
            "The Firehawk",
        );
        assert.equal(
            content.querySelector("a, button, .availability-indicator"),
            null,
        );
    }
    const existing = state.document.createElement("div");
    existing.innerHTML = renderer.buildMarkup({
        label: "The Firehawk",
        colorSeed: "le-firehawk",
        avatarClass: "existing-avatar",
        imageClass: "existing-image",
        fallbackClass: "existing-fallback",
        profileHandle: "le-firehawk",
    });
    assert.equal(
        existing.firstElementChild.getAttribute("href"),
        "/profile/le-firehawk",
    );
    assert.equal(
        existing
            .querySelector(".existing-fallback")
            .style.getPropertyValue("--initials-bg"),
        renderer.getInitialsColor("le-firehawk"),
    );
    assert.ok(existing.querySelector(".availability-indicator"));
});
