import { apiFetch } from "/static/reuse/api-client.js";
import { createAdaptivePoller } from "/static/reuse/adaptive-poller.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openPopup } from "/static/reuse/popup.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { updateNavbarAvatar } from "/static/layouts/dashboard-layout.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";
import { formatDate } from "/static/reuse/timestamp.js";
import {
    loadOwnProfile,
    loadFollowers,
    loadFollowing,
    loadOwnPosts,
    loadUserProfile,
    loadUserPosts,
    loadImageAsBlob,
    loadBannerLayoutPreference,
    saveBannerLayoutPreference,
} from "./profile-api-loaders.js";
import {
    createPostFormBuilderForVisibility,
    renderComposerMarkdownPreview,
    renderHero,
    renderFollowers,
    renderFollowing,
    renderSocialLinks,
    renderSuggestedContacts,
    renderPosts,
    renderNewPost,
    renderFollowRequests,
} from "./profile-render.js";
import { createProfileImageUploadActions } from "./profile-image-upload.js";
import { resolveBannerCropAspectRatio } from "./image-crop.js";
import { createProfilePostActions } from "./profile-post-actions.js";

let root = null;
let i18n = null;
let urlHandle = "";
let ownAccount = "";
let isOwnProfile = false;
let profile = null;
let followers = [];
let following = [];
let posts = [];
let avatarBlobUrl = null;
let bannerBlobUrl = null;
let bannerHeight = "half";
let bannerPanX = 50;
let bannerPanY = 50;
let composer = null;
let elements = [];
let bannerMenuCloseHandler = null;
let canMessageTarget = false;
let canRequestMessageTarget = false;
let relationship = null;
const AVATAR_CROP_WIDTH_TO_HEIGHT_RATIO = 1;
let pendingBannerAspectRatio = resolveBannerCropAspectRatio(bannerHeight);
let newPostFormController = null;
let followerCountPoller = null;

const PROFILE_BIO_MAX_CHARACTERS = 200;
const PROFILE_DISPLAY_NAME_MAX_CHARACTERS = 80;
const PROFILE_LOCATION_MAX_CHARACTERS = 120;
const PROFILE_WEBSITE_MAX_CHARACTERS = 2048;

function collectProfilePostSearchGroups() {
    const items = (posts ?? []).map((post) => {
        const author = profile?.displayName || profile?.handle || urlHandle;
        const timeLabel = formatDate(post.createdAt, "");
        return {
            id: `post:${post.id}`,
            label: post.title || author || "Post",
            description: [author, timeLabel].filter(Boolean).join(" — "),
            url: `${window.location.pathname}${window.location.search}#post-${encodeURIComponent(post.id)}`,
            resultClass: "text",
            searchText: [post.title, post.content, author, timeLabel]
                .filter(Boolean)
                .join(" "),
            visible: true,
        };
    });
    return items.length ? [{ category: "Posts", items }] : [];
}

registerSearchIndex("profile-posts", collectProfilePostSearchGroups);

let profileImageActions = null;
let postActions = null;

function getState() {
    return {
        root,
        urlHandle,
        ownAccount,
        isOwnProfile,
        profile,
        followers,
        following,
        posts,
        avatarBlobUrl,
        bannerBlobUrl,
        bannerHeight,
        bannerPanX,
        bannerPanY,
        composer,
        elements,
        bannerMenuCloseHandler,
        canMessageTarget,
        canRequestMessageTarget,
        relationship,
        newPostFormController,
    };
}

function setState(partialState) {
    if (Object.hasOwn(partialState, "root")) root = partialState.root;
    if (Object.hasOwn(partialState, "urlHandle"))
        urlHandle = partialState.urlHandle;
    if (Object.hasOwn(partialState, "ownAccount"))
        ownAccount = partialState.ownAccount;
    if (Object.hasOwn(partialState, "isOwnProfile")) {
        isOwnProfile = partialState.isOwnProfile;
    }
    if (Object.hasOwn(partialState, "profile")) profile = partialState.profile;
    if (Object.hasOwn(partialState, "followers"))
        followers = partialState.followers;
    if (Object.hasOwn(partialState, "following"))
        following = partialState.following;
    if (Object.hasOwn(partialState, "posts")) posts = partialState.posts;
    if (Object.hasOwn(partialState, "avatarBlobUrl")) {
        avatarBlobUrl = partialState.avatarBlobUrl;
    }
    if (Object.hasOwn(partialState, "bannerBlobUrl")) {
        bannerBlobUrl = partialState.bannerBlobUrl;
    }
    if (Object.hasOwn(partialState, "bannerHeight")) {
        bannerHeight = partialState.bannerHeight;
    }
    if (Object.hasOwn(partialState, "bannerPanX"))
        bannerPanX = partialState.bannerPanX;
    if (Object.hasOwn(partialState, "bannerPanY"))
        bannerPanY = partialState.bannerPanY;
    if (Object.hasOwn(partialState, "composer"))
        composer = partialState.composer;
    if (Object.hasOwn(partialState, "elements"))
        elements = partialState.elements;
    if (Object.hasOwn(partialState, "bannerMenuCloseHandler")) {
        bannerMenuCloseHandler = partialState.bannerMenuCloseHandler;
    }
    if (Object.hasOwn(partialState, "canMessageTarget")) {
        canMessageTarget = partialState.canMessageTarget;
    }
    if (Object.hasOwn(partialState, "canRequestMessageTarget")) {
        canRequestMessageTarget = partialState.canRequestMessageTarget;
    }
    if (Object.hasOwn(partialState, "relationship")) {
        relationship = partialState.relationship;
    }
    if (Object.hasOwn(partialState, "newPostFormController")) {
        newPostFormController = partialState.newPostFormController;
    }
}

function refreshPage() {
    composer?.refresh(elements);
}

async function loadSocialConnectionList(profileHandle, connectionKind) {
    const response = await apiFetch(
        `/api/v1/social/users/${encodeURIComponent(profileHandle)}/${connectionKind}`,
    );
    if (!response.ok) {
        throw new Error(`Unable to refresh ${connectionKind}`);
    }
    return (await response.json()).data ?? [];
}

function getSocialHandles(users) {
    return users.map((user) => user?.handle ?? "").join("\n");
}

async function refreshFollowerCounts() {
    const profileHandle = profile?.handle;
    if (!profileHandle) return false;
    const [latestFollowers, latestFollowing] = await Promise.all([
        loadSocialConnectionList(profileHandle, "followers"),
        loadSocialConnectionList(profileHandle, "following"),
    ]);
    const followersChanged =
        getSocialHandles(latestFollowers) !== getSocialHandles(followers);
    const followingChanged =
        getSocialHandles(latestFollowing) !== getSocialHandles(following);
    if (!followersChanged && !followingChanged) return false;
    followers = latestFollowers;
    following = latestFollowing;
    refreshPage();
    return true;
}

function stopFollowerCountPoller() {
    followerCountPoller?.stop();
    followerCountPoller = null;
}

function startFollowerCountPoller(signal) {
    stopFollowerCountPoller();
    followerCountPoller = createAdaptivePoller({
        task: refreshFollowerCounts,
        minIntervalMs: 1_000,
        maxIntervalMs: 10_000,
        initialIntervalMs: 1_000,
        onError: () => {
            showToast(i18n.t("ui.app.profile.follow_counts_refresh_failed"), {
                variant: "error",
            });
        },
    });
    signal?.addEventListener("abort", stopFollowerCountPoller, { once: true });
    followerCountPoller.start();
}

const avatarFileInput = document.createElement("input");
avatarFileInput.type = "file";
avatarFileInput.accept = "image/*";
avatarFileInput.hidden = true;
document.body.appendChild(avatarFileInput);

const bannerFileInput = document.createElement("input");
bannerFileInput.type = "file";
bannerFileInput.accept = "image/*";
bannerFileInput.hidden = true;
document.body.appendChild(bannerFileInput);

async function openEditPopup() {
    const currentBio = profile?.bio ?? "";
    const currentLocation = profile?.location ?? "";
    const currentWebsite = profile?.website ?? "";
    const currentVisibility = profile?.visibility ?? "hidden";
    const currentDisplayName = profile?.displayName ?? "";
    const profileRequiresDiscoverableVisibility = [
        "teacher",
        "admin",
        "owner",
    ].includes(profile?.role);
    const profileEditFormBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "profile-edit-form",
            formClassName: "profile-edit-form",
            submitLabelKey: "ui.reuse.save",
            includeSubmitButton: false,
            fields: [
                {
                    name: "displayName",
                    labelKey: "ui.app.profile.display_name",
                    value: currentDisplayName,
                    maxCharacters: PROFILE_DISPLAY_NAME_MAX_CHARACTERS,
                    attributes: {
                        id: "popup-edit-display-name",
                    },
                },
                {
                    name: "bio",
                    labelKey: "ui.app.profile.bio",
                    type: "textarea",
                    value: currentBio,
                    maxCharacters: PROFILE_BIO_MAX_CHARACTERS,
                    attributes: {
                        rows: 3,
                    },
                },
                {
                    name: "location",
                    labelKey: "ui.app.profile.location",
                    value: currentLocation,
                    maxCharacters: PROFILE_LOCATION_MAX_CHARACTERS,
                    attributes: {
                        id: "popup-edit-location",
                    },
                },
                {
                    name: "website",
                    labelKey: "ui.app.profile.website",
                    type: "url",
                    value: currentWebsite,
                    maxCharacters: PROFILE_WEBSITE_MAX_CHARACTERS,
                    attributes: {
                        id: "popup-edit-website",
                    },
                },
                {
                    name: "visibility",
                    labelKey: "ui.app.profile.visibility",
                    type: "select",
                    value: currentVisibility,
                    attributes: {
                        id: "popup-edit-visibility",
                    },
                    options: ["hidden", "private", "friends", "community"].map(
                        (visibilityOption) => {
                            const isRestrictedForProfileRole =
                                profileRequiresDiscoverableVisibility &&
                                (visibilityOption === "hidden" ||
                                    visibilityOption === "private");
                            return {
                                value: visibilityOption,
                                label: i18n.t(
                                    `ui.app.profile.visibility.${visibilityOption}`,
                                ),
                                disabled: isRestrictedForProfileRole,
                            };
                        },
                    ),
                },
            ],
        },
    );

    let profileEditFormController = null;
    const popupPromise = openPopup({
        title: i18n.t("ui.app.profile.edit_profile"),
        body: () => profileEditFormBuilder.render(),
        variant: "info",
        maxWidth: "40%",
        onOpen: (overlay) => {
            const popupFormElement =
                overlay.querySelector("#profile-edit-form");
            profileEditFormController =
                popupFormElement instanceof HTMLFormElement
                    ? profileEditFormBuilder.attach(popupFormElement)
                    : null;
            const popupBioInput = overlay.querySelector('textarea[name="bio"]');
            const bioFieldWrapper = overlay.querySelector(
                '[data-form-builder-field="bio"]',
            );
            const bioPreviewElement = document.createElement("div");
            bioPreviewElement.id = "profile-edit-bio-preview";
            bioPreviewElement.className =
                "profile-edit-bio-preview profile-markdown";
            bioPreviewElement.setAttribute("aria-live", "polite");
            if (bioFieldWrapper instanceof HTMLElement) {
                bioFieldWrapper.insertAdjacentElement(
                    "afterend",
                    bioPreviewElement,
                );
            }
            const renderBioPreview = () => {
                const bioValue =
                    popupBioInput instanceof HTMLTextAreaElement
                        ? popupBioInput.value
                        : "";
                bioPreviewElement.innerHTML = renderComposerMarkdownPreview(
                    bioValue,
                    i18n.t("ui.app.profile.bio_preview_placeholder"),
                );
            };
            renderBioPreview();
            popupBioInput?.addEventListener("input", renderBioPreview);
        },
        actions: [
            {
                id: "cancel",
                label: i18n.t("ui.reuse.discard"),
                variant: "cancel",
            },
            {
                id: "save",
                label: i18n.t("ui.reuse.save"),
                variant: "confirm",
            },
        ],
        closeProtection: true,
    });

    const result = await popupPromise;

    if (result === "save") {
        const fieldValues = profileEditFormController?.getValues() ?? {};
        const displayName = fieldValues.displayName ?? currentDisplayName;
        const bio = fieldValues.bio ?? currentBio;
        const location = fieldValues.location ?? currentLocation;
        const website = fieldValues.website ?? currentWebsite;
        const visibility = fieldValues.visibility ?? currentVisibility;
        try {
            const response = await apiFetch("/api/v1/social/profile", {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    displayName,
                    bio,
                    location,
                    website,
                    visibility,
                }),
            });
            if (!response.ok) {
                const responseBody = await response.json().catch(() => null);
                const responseMessage =
                    responseBody?.error?.message ??
                    i18n.t("ui.app.profile.save_failed");
                throw new Error(responseMessage);
            }
            localStorage.setItem("cognis_display_name", displayName);
            setState({ profile: await loadOwnProfile() });
            refreshPage();
            updateNavbarAvatar().catch(() => {});
            showToast(i18n.t("ui.app.profile.saved"), { variant: "success" });
        } catch (error) {
            showToast(
                error instanceof Error
                    ? error.message
                    : i18n.t("ui.app.profile.save_failed"),
                {
                    variant: "error",
                },
            );
        }
    }
}

avatarFileInput.addEventListener("change", async () => {
    const file = avatarFileInput.files?.[0];
    if (!file) {
        avatarFileInput.value = "";
        return;
    }
    try {
        await profileImageActions?.handleProfileImageUpload({
            kind: "avatar",
            file,
            aspectRatio: AVATAR_CROP_WIDTH_TO_HEIGHT_RATIO,
        });
    } catch {
        showToast(i18n.t("ui.app.profile.upload_failed"), { variant: "error" });
    }
    avatarFileInput.value = "";
});

bannerFileInput.addEventListener("change", async () => {
    const file = bannerFileInput.files?.[0];
    if (!file) {
        bannerFileInput.value = "";
        return;
    }
    try {
        await profileImageActions?.handleProfileImageUpload({
            kind: "banner",
            file,
            aspectRatio: pendingBannerAspectRatio,
        });
    } catch {
        showToast(i18n.t("ui.app.profile.upload_failed"), { variant: "error" });
    }
    bannerFileInput.value = "";
});

function bindFollowButtonHover(button) {
    if (button.dataset.following !== "true") return;

    const followingLabel = i18n.t("ui.app.profile.following");
    const unfollowLabel = i18n.t("ui.app.profile.unfollow");

    button.addEventListener("mouseenter", () => {
        button.textContent = unfollowLabel;
        button.classList.add("btn-cancel");
    });
    button.addEventListener("mouseleave", () => {
        button.textContent = followingLabel;
        button.classList.remove("btn-cancel");
    });
}

function bindPageEvents() {
    root.querySelector(".profile-hero-edit-btn")?.addEventListener(
        "click",
        openEditPopup,
    );
    const heroFollowButton = root.querySelector(".profile-hero-follow-btn");
    if (heroFollowButton) {
        bindFollowButtonHover(heroFollowButton);
        heroFollowButton.addEventListener("click", () =>
            postActions?.doFollowUser(urlHandle),
        );
    }
    root.querySelector(".profile-hero-block-btn")?.addEventListener(
        "click",
        () => postActions?.doBlockUser(),
    );
    root.querySelectorAll(".profile-hero-unblock-btn").forEach((button) => {
        button.addEventListener("click", () => postActions?.doUnblockUser());
    });
    root.querySelector("[data-message-target]")?.addEventListener("click", () =>
        postActions?.doOpenMessageRoom(),
    );
    root.querySelector(".profile-hero-banner-btn")?.addEventListener(
        "click",
        (event) => {
            const bannerButton = event.currentTarget;
            const bannerRect =
                bannerButton instanceof HTMLElement
                    ? bannerButton.getBoundingClientRect()
                    : null;
            pendingBannerAspectRatio = resolveBannerCropAspectRatio(
                bannerHeight,
                bannerRect,
            );
            bannerFileInput.click();
        },
    );
    root.querySelector(".profile-hero-avatar-btn")?.addEventListener(
        "click",
        () => {
            avatarFileInput.click();
        },
    );
    root.querySelector(".profile-avatar-remove-btn")?.addEventListener(
        "click",
        () => profileImageActions?.doRemoveAvatar(),
    );
    const postFormElement = root.querySelector("#new-post-form");
    if (postFormElement instanceof HTMLFormElement) {
        const profileVis = profile?.visibility ?? "hidden";
        const postFormBuilder = createPostFormBuilderForVisibility(
            profileVis,
            i18n,
        );
        newPostFormController = postFormBuilder.attach(postFormElement);
        const postPreviewToggle = root.querySelector(
            "#profile-post-preview-toggle",
        );
        const postComposeToggle = root.querySelector(
            "#profile-post-compose-toggle",
        );
        const postPreviewElement = root.querySelector("#profile-post-preview");
        const postTitleInput = postFormElement.querySelector("#post-title");
        const postContentInput = postFormElement.querySelector("#post-content");
        let isPostPreviewMode = false;
        const renderPostPreview = () => {
            if (!(postPreviewElement instanceof HTMLElement)) return;
            const titleValue =
                postTitleInput instanceof HTMLInputElement
                    ? postTitleInput.value.trim()
                    : "";
            const contentValue =
                postContentInput instanceof HTMLTextAreaElement
                    ? postContentInput.value
                    : "";
            const titleMarkup = titleValue
                ? `<strong class="profile-post-title">${escapeHtml(titleValue)}</strong>`
                : "";
            const bodyMarkup = `<div class="profile-post-body profile-markdown">${renderComposerMarkdownPreview(
                contentValue,
                i18n.t("ui.app.profile.post_preview_placeholder"),
            )}</div>`;
            postPreviewElement.innerHTML = `${titleMarkup}${bodyMarkup}`;
        };
        const syncPostComposerMode = () => {
            const isComposeMode = !isPostPreviewMode;
            if (postComposeToggle instanceof HTMLButtonElement) {
                postComposeToggle.setAttribute(
                    "aria-pressed",
                    String(isComposeMode),
                );
            }
            if (postPreviewToggle instanceof HTMLButtonElement) {
                postPreviewToggle.setAttribute(
                    "aria-pressed",
                    String(isPostPreviewMode),
                );
            }
            if (postFormElement instanceof HTMLFormElement) {
                postFormElement.hidden = isPostPreviewMode;
            }
            if (postPreviewElement instanceof HTMLElement) {
                postPreviewElement.hidden = !isPostPreviewMode;
                postPreviewElement.classList.toggle(
                    "profile-compose-preview--hidden",
                    !isPostPreviewMode,
                );
            }
        };
        renderPostPreview();
        syncPostComposerMode();
        postTitleInput?.addEventListener("input", renderPostPreview);
        postContentInput?.addEventListener("input", renderPostPreview);
        postComposeToggle?.addEventListener("click", () => {
            isPostPreviewMode = false;
            syncPostComposerMode();
        });
        postPreviewToggle?.addEventListener("click", () => {
            isPostPreviewMode = true;
            syncPostComposerMode();
            renderPostPreview();
        });
        postFormElement.addEventListener("submit", (event) => {
            event.preventDefault();
            postActions?.doCreatePost();
        });
    } else {
        newPostFormController = null;
    }
    root.querySelectorAll(".post-delete-btn[data-post-id]").forEach(
        (button) => {
            button.addEventListener("click", () =>
                postActions?.doDeletePost(button.dataset.postId),
            );
        },
    );
    root.querySelectorAll(".profile-follow-btn[data-handle]").forEach(
        (button) => {
            button.addEventListener("click", () =>
                postActions?.doFollowUser(button.dataset.handle),
            );
        },
    );

    if (bannerMenuCloseHandler) {
        document.removeEventListener("click", bannerMenuCloseHandler, true);
        bannerMenuCloseHandler = null;
    }

    const menuButton = root.querySelector(".profile-banner-menu-btn");
    const dropdown = root.querySelector(".profile-banner-menu-dropdown");

    if (menuButton && dropdown) {
        bannerMenuCloseHandler = (event) => {
            const menuWrap = root.querySelector(".profile-banner-menu-wrap");
            if (!menuWrap?.contains(event.target)) {
                dropdown.hidden = true;
                menuButton.setAttribute("aria-expanded", "false");
            }
        };

        menuButton.addEventListener("click", (event) => {
            event.stopPropagation();
            const opening = dropdown.hidden;
            dropdown.hidden = !opening;
            menuButton.setAttribute("aria-expanded", String(opening));
            if (opening) {
                document.addEventListener(
                    "click",
                    bannerMenuCloseHandler,
                    true,
                );
            } else {
                document.removeEventListener(
                    "click",
                    bannerMenuCloseHandler,
                    true,
                );
            }
        });

        root.querySelectorAll(".profile-banner-height-radio").forEach(
            (bannerHeightRadio) => {
                bannerHeightRadio.addEventListener("change", async () => {
                    const nextBannerHeight = bannerHeightRadio.value;
                    if (!nextBannerHeight) return;
                    bannerHeightRadio
                        .closest(".profile-banner-menu-dropdown")
                        ?.querySelectorAll(".profile-banner-height-radio")
                        .forEach((radio) => {
                            radio.checked = radio.value === nextBannerHeight;
                        });
                    if (nextBannerHeight === bannerHeight) return;
                    bannerHeight = nextBannerHeight;
                    dropdown.hidden = true;
                    menuButton.setAttribute("aria-expanded", "false");
                    document.removeEventListener(
                        "click",
                        bannerMenuCloseHandler,
                        true,
                    );
                    await saveBannerLayoutPreference({
                        height: bannerHeight,
                        panX: bannerPanX,
                        panY: bannerPanY,
                    });
                    composer.refresh(elements);
                });
            },
        );

        root.querySelector(".profile-banner-remove-btn")?.addEventListener(
            "click",
            () => {
                dropdown.hidden = true;
                menuButton.setAttribute("aria-expanded", "false");
                document.removeEventListener(
                    "click",
                    bannerMenuCloseHandler,
                    true,
                );
                profileImageActions?.doRemoveBanner();
            },
        );
    }
}

export async function mount(rootEl, { signal } = {}) {
    // Clean up any stale document-level listener from a previous mount.
    if (bannerMenuCloseHandler) {
        document.removeEventListener("click", bannerMenuCloseHandler, true);
        bannerMenuCloseHandler = null;
    }

    function isAborted() {
        return signal?.aborted ?? false;
    }

    root = rootEl;
    i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/adapters/social/profile/languages",
            "/static/adapters/social/messages/languages",
        ],
    });
    applyDocumentTitle(i18n, "ui.page.title.profile");

    profileImageActions = createProfileImageUploadActions({
        getState,
        setState,
        loadOwnProfile,
        saveBannerLayoutPreference,
        refreshPage,
        updateNavbarAvatar,
        i18n,
        openPopup,
    });
    postActions = createProfilePostActions({
        getState,
        setState,
        refreshPage,
        i18n,
        loadOwnPosts,
        loadFollowers,
        loadFollowing,
    });

    urlHandle = decodeURIComponent(
        window.location.pathname.split("/")[2] ?? "",
    );
    ownAccount = localStorage.getItem("cognis_account") ?? "";
    isOwnProfile = !urlHandle || urlHandle === ownAccount; // empty handle means /profile with no path segment → own profile

    stopFollowerCountPoller();

    profile = null;
    followers = [];
    following = [];
    posts = [];
    profileImageActions?.revokeProfileBlobUrls();
    bannerHeight = "half";
    bannerPanX = 50;
    bannerPanY = 50;
    composer = null;
    elements = [];
    newPostFormController = null;

    if (isOwnProfile) {
        profile = await loadOwnProfile();
    } else {
        const result = await loadUserProfile(urlHandle);
        if (result?.notFound) {
            await navigateTo("/error?code=404");
            return;
        }
        profile = result;
    }

    if (isAborted()) return;

    [followers, following, posts] = await Promise.all([
        loadFollowers(profile?.handle),
        loadFollowing(profile?.handle),
        isOwnProfile ? loadOwnPosts() : loadUserPosts(profile?.handle),
    ]);

    canMessageTarget = false;
    canRequestMessageTarget = false;
    relationship = null;
    if (!isOwnProfile && profile?.handle) {
        try {
            const response = await apiFetch(
                `/api/v1/social/users/${encodeURIComponent(profile.handle)}/relationship`,
            );
            if (response.ok) {
                const payload = await response.json();
                relationship = payload?.data ?? null;
                canMessageTarget = Boolean(relationship?.canMessage);
                canRequestMessageTarget = Boolean(
                    relationship?.canSendMessageRequest,
                );
            }
        } catch {
            canMessageTarget = false;
            canRequestMessageTarget = false;
            relationship = null;
        }
    }

    if (isAborted()) return;

    avatarBlobUrl = await loadImageAsBlob(profile?.avatarKey);
    bannerBlobUrl = await loadImageAsBlob(profile?.bannerKey);
    const bannerLayout = await loadBannerLayoutPreference(profile?.accountId);
    bannerHeight = bannerLayout.height;
    bannerPanX = bannerLayout.panX;
    bannerPanY = bannerLayout.panY;

    if (isAborted()) return;

    // These heuristics reserve a small fixed padding plus estimated rows per
    // visible item so profile widgets stop clipping or creating avoidable
    // internal scrollbars at the default layout: ~0.7 rows per social-card
    // entry is enough for the compact card density, +2 rows covers headers and
    // gutters, and the 4/5 row minimums preserve readable empty/small states.
    const socialSectionRowCount = Math.max(
        4,
        Math.ceil(Math.max(followers.length, following.length) * 0.7 + 2),
    );
    const postsSectionRowCount = Math.max(
        5,
        Math.ceil(posts.length * 0.85 + 4),
    );
    // The hero needs extra rows for banner + identity stack; full-banner mode
    // needs 7 rows so the overlaid card cluster clears the taller banner, while
    // half-banner mode is comfortable at 5 rows.
    const heroRowCount = bannerHeight === "full" ? 7 : 5;

    elements = [
        {
            id: "hero",
            label: i18n.t("ui.app.profile.section.profile"),
            gridSize: {
                default: [4, heroRowCount],
                min: [2, 4],
                max: "full",
            },
            render: () =>
                renderHero({
                    profile,
                    avatarBlobUrl,
                    bannerBlobUrl,
                    bannerHeight,
                    bannerPanX,
                    bannerPanY,
                    isOwnProfile,
                    relationship,
                    canMessageTarget,
                    canRequestMessageTarget,
                    posts,
                    following,
                    followers,
                    i18n,
                }),
        },
        {
            id: "followers",
            label: i18n.t("ui.app.profile.section.followers"),
            gridSize: {
                default: [2, socialSectionRowCount],
                min: [2, 3],
                max: "half",
            },
            render: () => renderFollowers({ followers, i18n }),
        },
        {
            id: "following",
            label: i18n.t("ui.app.profile.section.following"),
            gridSize: {
                default: [2, socialSectionRowCount],
                min: [2, 3],
                max: "half",
            },
            render: () => renderFollowing({ following, i18n }),
        },
        ...(isOwnProfile
            ? [
                  {
                      id: "posts-new",
                      label: i18n.t("ui.app.profile.section.posts_new"),
                      gridSize: {
                          default: [4, 4],
                          min: [2, 3],
                          max: "full",
                      },
                      render: () => renderNewPost({ profile, i18n }),
                  },
              ]
            : []),
        {
            id: "posts",
            label: i18n.t("ui.app.profile.section.posts"),
            gridSize: {
                default: [4, postsSectionRowCount],
                min: [2, 4],
                max: "full",
            },
            render: () => renderPosts({ posts, isOwnProfile, i18n }),
        },
        {
            id: "social-links",
            label: i18n.t("ui.app.profile.section.social_links"),
            defaultHidden: true,
            gridSize: { default: [2, 2], min: [1, 1], max: "full" },
            render: () => renderSocialLinks({ profile, i18n }),
        },
        {
            id: "suggested",
            label: i18n.t("ui.app.profile.section.suggested"),
            defaultHidden: true,
            gridSize: { default: [2, 3], min: [1, 2], max: "full" },
            render: () =>
                renderSuggestedContacts({
                    followers,
                    following,
                    i18n,
                }),
        },
        {
            id: "follow-requests",
            label: i18n.t("ui.app.profile.section.follow_requests"),
            defaultHidden: true,
            gridSize: { default: [2, 3], min: [2, 2], max: "full" },
            render: () => renderFollowRequests({ i18n }),
        },
    ];

    composer = createPageComposer(root, {
        allowCustomization: isOwnProfile,
        elements,
        preferenceKey: "profile-layout",
        i18n,
        pageContext: {
            title: i18n.t("ui.reuse.profile"),
            subtitle: i18n.t("ui.app.profile.page_subtitle"),
        },
        onRender: bindPageEvents,
    });

    await composer.init();
    startFollowerCountPoller(signal);
}

await mountWhenDirect(mount);
