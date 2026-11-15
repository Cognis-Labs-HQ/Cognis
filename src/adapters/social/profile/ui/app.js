import { createProfilePageLifetime } from "./profile-page-lifetime.js";
import { createProfileHeroMedia } from "./profile-hero-media.js";
import { guides } from "./guides.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { createProfileEditor } from "./profile-editor.js";
import { profileFetch as apiFetch } from "./offline-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { openPopup } from "/static/reuse/popup.js";
import { updateNavbarAvatar } from "/static/layouts/dashboard-layout.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import {
    loadOwnProfile,
    loadFollowers,
    loadFollowing,
    loadOwnPosts,
    loadUserProfile,
    loadUserPosts,
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
import { createProfileImageSelection } from "./profile-image-selection.js";
import { resolveBannerCropAspectRatio } from "./image-crop.js";
import { createProfilePostActions } from "./profile-post-actions.js";
import { hydrateAvailabilityIndicators } from "./availability.js";
import { registerProfilePostSearchIndex } from "./search-groups.js";
import {
    createFollowerCountPoller,
    loadSocialConnectionList,
} from "./follower-poller.js";
import { AVATAR_CROP_WIDTH_TO_HEIGHT_RATIO } from "./profile-config.js";
import {
    bindExternalProfileSync,
    resolveExternalProfileProvider,
} from "./provider-sync.js";
import {
    bindFollowButtonHover,
    bindSocialCardFollowButtons,
} from "./follow-buttons.js";

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
let pendingBannerAspectRatio = resolveBannerCropAspectRatio(bannerHeight);
let newPostFormController = null;
let followerCountPoller = null;
let profileEditor = null;
let pageLifetime = null;
let heroMedia = null;
const boundHeroes = new WeakSet();

registerProfilePostSearchIndex(() => ({ posts, profile, urlHandle }));

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
    if (Object.hasOwn(partialState, "profile")) {
        const nextProfile = partialState.profile;
        for (const kind of ["avatar", "banner"]) {
            if (
                !Object.hasOwn(partialState, `${kind}BlobUrl`) &&
                (profile?.accountId !== nextProfile?.accountId ||
                    profile?.[`${kind}Key`] !== nextProfile?.[`${kind}Key`])
            )
                heroMedia?.replace(kind, null, nextProfile);
        }
        profile = nextProfile;
    }
    if (Object.hasOwn(partialState, "followers"))
        followers = partialState.followers;
    if (Object.hasOwn(partialState, "following"))
        following = partialState.following;
    if (Object.hasOwn(partialState, "posts")) posts = partialState.posts;
    if (Object.hasOwn(partialState, "avatarBlobUrl")) {
        heroMedia?.replace("avatar", partialState.avatarBlobUrl, profile);
    }
    if (Object.hasOwn(partialState, "bannerBlobUrl")) {
        heroMedia?.replace("banner", partialState.bannerBlobUrl, profile);
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

function refreshProfileHero() {
    composer?.refreshElements(["hero"]);
}

function refreshProfileCards(cardIds) {
    composer?.refreshElements(cardIds);
}

function stopFollowerCountPoller() {
    followerCountPoller?.stop();
    followerCountPoller = null;
}

function startFollowerCountPoller(lifetime) {
    const { signal, isCurrent } = lifetime;
    stopFollowerCountPoller();
    if (signal?.aborted) return;
    followerCountPoller = createFollowerCountPoller({
        loadConnections: loadSocialConnectionList,
        readState: () =>
            !isCurrent()
                ? {}
                : {
                      profileHandle: profile?.handle,
                      followers,
                      following,
                  },
        applyConnections: (next) => {
            if (!isCurrent()) return;
            followers = next.followers;
            following = next.following;
            refreshProfileCards([
                "hero",
                ...(next.followersChanged ? ["followers"] : []),
                ...(next.followingChanged ? ["following"] : []),
                "suggested",
            ]);
            bindProfileHeroEvents();
            bindSocialCardEvents();
        },
        reportError: () => {
            if (!isCurrent()) return;
            showToast(i18n.t("ui.app.profile.follow_counts_refresh_failed"), {
                variant: "error",
            });
        },
    });
    signal?.addEventListener("abort", stopFollowerCountPoller, { once: true });
    followerCountPoller.start();
}

let avatarFileInput = null;
let bannerFileInput = null;
let requestSelection = null;
let imageSelection = null;

function bindProfileHeroEvents() {
    const lifetime = pageLifetime;
    if (!lifetime?.isCurrent()) return;
    const hero = root.querySelector(".profile-hero");
    if (!hero || boundHeroes.has(hero)) return;
    boundHeroes.add(hero);
    const actions = postActions;
    const imageActions = profileImageActions;
    const selectImage = requestSelection;
    const avatarInput = avatarFileInput;
    const bannerInput = bannerFileInput;
    const handle = urlHandle;
    lifetime.listen(
        root.querySelector(".profile-hero-edit-btn"),
        "click",
        profileEditor.open,
    );
    const heroFollowButton = root.querySelector(".profile-hero-follow-btn");
    if (heroFollowButton) {
        bindFollowButtonHover(heroFollowButton, i18n);
        lifetime.listen(heroFollowButton, "click", () =>
            actions?.doFollowUser(handle),
        );
    }
    lifetime.listen(
        root.querySelector(".profile-hero-block-btn"),
        "click",
        () => actions?.doBlockUser(),
    );
    root.querySelectorAll(".profile-hero-unblock-btn").forEach((button) => {
        lifetime.listen(button, "click", () => actions?.doUnblockUser());
    });
    lifetime.listen(root.querySelector("[data-message-target]"), "click", () =>
        actions?.doOpenMessageRoom(),
    );
    lifetime.listen(
        root.querySelector(".profile-hero-banner-btn"),
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
            selectImage("banner", bannerInput);
        },
    );
    lifetime.listen(
        root.querySelector(".profile-hero-avatar-btn"),
        "click",
        () => {
            selectImage("avatar", avatarInput);
        },
    );
    lifetime.listen(
        root.querySelector(".profile-avatar-remove-btn"),
        "click",
        () => imageActions?.doRemoveAvatar(),
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

        lifetime.listen(menuButton, "click", (event) => {
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
                lifetime.listen(bannerHeightRadio, "change", async () => {
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
                    refreshProfileHero();
                    await saveBannerLayoutPreference({
                        height: bannerHeight,
                        panX: bannerPanX,
                        panY: bannerPanY,
                    });
                });
            },
        );

        lifetime.listen(
            root.querySelector(".profile-banner-remove-btn"),
            "click",
            () => {
                dropdown.hidden = true;
                menuButton.setAttribute("aria-expanded", "false");
                document.removeEventListener(
                    "click",
                    bannerMenuCloseHandler,
                    true,
                );
                imageActions?.doRemoveBanner();
            },
        );
        bindExternalProfileSync({
            root,
            dropdown,
            menuButton,
            i18n,
            isCurrent: lifetime.isCurrent,
            signal: lifetime.signal,
            applyProfile: async () => {
                const previousProfile = profile;
                const nextProfile = await loadOwnProfile();
                if (!lifetime.isCurrent() || profile !== previousProfile)
                    return false;
                profile = nextProfile;
                const outcome = await heroMedia.read(nextProfile);
                if (!outcome.current) return false;
                refreshProfileHero();
                if (outcome.retryable)
                    throw new Error("profile_media_retryable");
                return true;
            },
        });
    }
}

function bindSocialCardEvents() {
    const lifetime = pageLifetime;
    const actions = postActions;
    bindSocialCardFollowButtons(root, (handle) => {
        if (lifetime.isCurrent()) return actions?.doFollowUser(handle);
    });
}

function bindPageEvents() {
    heroMedia?.reconcile();
    const lifetime = pageLifetime;
    const actions = postActions;
    if (!lifetime?.isCurrent()) return;
    bindProfileHeroEvents();
    void hydrateAvailabilityIndicators(root);
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
        lifetime.listen(postTitleInput, "input", renderPostPreview);
        lifetime.listen(postContentInput, "input", renderPostPreview);
        lifetime.listen(postComposeToggle, "click", () => {
            isPostPreviewMode = false;
            syncPostComposerMode();
        });
        lifetime.listen(postPreviewToggle, "click", () => {
            isPostPreviewMode = true;
            syncPostComposerMode();
            renderPostPreview();
        });
        postFormElement.addEventListener(
            "submit",
            (event) => {
                if (!lifetime.isCurrent()) return;
                event.preventDefault();
                return actions?.doCreatePost();
            },
            { signal: lifetime.signal },
        );
    } else {
        newPostFormController = null;
    }
    root.querySelectorAll(".post-delete-btn[data-post-id]").forEach(
        (button) => {
            lifetime.listen(button, "click", () =>
                actions?.doDeletePost(button.dataset.postId),
            );
        },
    );
    bindSocialCardEvents();
}

export async function mount(rootEl, { signal } = {}) {
    pageLifetime?.dispose();
    root = rootEl;
    composer = null;
    elements = [];
    profile = null;
    followers = [];
    following = [];
    posts = [];
    avatarBlobUrl = null;
    bannerBlobUrl = null;
    bannerHeight = "half";
    bannerPanX = 50;
    bannerPanY = 50;
    newPostFormController = null;
    const lifetime = createProfilePageLifetime({
        root,
        signal,
        onDispose: () => {
            profileEditor?.dispose();
            stopFollowerCountPoller();
            imageSelection?.dispose();
            if (bannerMenuCloseHandler) {
                document.removeEventListener(
                    "click",
                    bannerMenuCloseHandler,
                    true,
                );
                bannerMenuCloseHandler = null;
            }
            heroMedia?.clear();
        },
    });
    pageLifetime = lifetime;
    const media = createProfileHeroMedia({
        root,
        signal: lifetime.signal,
        isCurrent: lifetime.isCurrent,
        onChange: (next, { refresh = true } = {}) => {
            avatarBlobUrl = next.avatarBlobUrl;
            bannerBlobUrl = next.bannerBlobUrl;
            if (refresh) refreshProfileHero();
        },
    });
    heroMedia = media;
    try {
        await initializePage(lifetime, media);
    } catch (error) {
        const current = lifetime.isCurrent();
        lifetime.dispose();
        if (current) throw error;
    }
}

async function initializePage(lifetime, media) {
    if (!lifetime.isCurrent()) return;
    const nextI18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
    });
    if (!lifetime.isCurrent()) return;
    i18n = nextI18n;
    applyDocumentTitle(i18n, "ui.page.title.profile");
    const ownedState = {
        getState,
        setState: (next) => {
            if (lifetime.isCurrent()) setState(next);
        },
        isCurrent: lifetime.isCurrent,
    };
    const refreshOwnedHero = () => {
        if (lifetime.isCurrent()) refreshProfileHero();
    };
    profileImageActions = createProfileImageUploadActions({
        ...ownedState,
        saveBannerLayoutPreference,
        refreshPage: refreshOwnedHero,
        updateNavbarAvatar,
        i18n,
        openPopup: (options) =>
            openPopup({ ...options, signal: lifetime.signal }),
    });
    const ownedImageActions = profileImageActions;
    imageSelection = createProfileImageSelection({
        signal: lifetime.signal,
        isCurrent: lifetime.isCurrent,
        onFileSelected: (kind, file) =>
            ownedImageActions.handleProfileImageUpload({
                kind,
                file,
                aspectRatio:
                    kind === "avatar"
                        ? AVATAR_CROP_WIDTH_TO_HEIGHT_RATIO
                        : pendingBannerAspectRatio,
            }),
        onError: (error) => {
            if (error?.code === "missing_translation") throw error;
            console.error("[profile] image selection failed", {
                component: "social-profile",
                operation: "selectImage",
                errorName: error?.name,
            });
            if (lifetime.isCurrent())
                showToast(
                    i18n.t(
                        error.message === "offline_outbox_full"
                            ? "ui.reuse.offline_buffer_full_body"
                            : "ui.app.profile.upload_failed",
                    ),
                    { variant: "error" },
                );
        },
    });
    ({ avatarFileInput, bannerFileInput, requestSelection } = imageSelection);
    postActions = createProfilePostActions({
        ...ownedState,
        signal: lifetime.signal,
        refreshPage: () => {
            if (lifetime.isCurrent()) refreshPage();
        },
        refreshProfileHero: refreshOwnedHero,
        refreshProfileCards: (cardIds) => {
            if (!lifetime.isCurrent()) return;
            refreshProfileCards(cardIds);
            bindSocialCardEvents();
        },
        i18n,
        loadOwnPosts,
        loadFollowers: (handle) =>
            loadSocialConnectionList(handle, "followers"),
        loadFollowing: (handle) =>
            loadSocialConnectionList(handle, "following"),
    });
    urlHandle = decodeURIComponent(
        window.location.pathname.split("/")[2] ?? "",
    );
    ownAccount = localStorage.getItem("cognis_account") ?? "";
    isOwnProfile =
        !urlHandle ||
        urlHandle === ownAccount ||
        uiCtx.capabilities.get("social:isOwnProfileRoute")?.(
            window.location.pathname,
        ) === true;
    if (isOffline() && !isOwnProfile) throw new Error("offline_access_denied");

    const nextProfile = isOwnProfile
        ? await loadOwnProfile()
        : await loadUserProfile(urlHandle);
    if (!lifetime.isCurrent()) return;
    if (nextProfile?.notFound) {
        await navigateTo("/error?code=404");
        return;
    }
    profile = nextProfile;
    const connections = await Promise.all([
        loadFollowers(profile?.handle),
        loadFollowing(profile?.handle),
        isOwnProfile ? loadOwnPosts() : loadUserPosts(profile?.handle),
    ]);
    if (!lifetime.isCurrent()) return;
    [followers, following, posts] = connections;
    canMessageTarget = false;
    canRequestMessageTarget = false;
    relationship = null;
    if (!isOwnProfile && profile?.handle) {
        try {
            const response = await apiFetch(
                `/api/v1/social/users/${encodeURIComponent(profile.handle)}/relationship`,
            );
            if (!lifetime.isCurrent()) return;
            if (response.ok) {
                const payload = await response.json();
                if (!lifetime.isCurrent()) return;
                relationship = payload?.data ?? null;
                canMessageTarget = Boolean(relationship?.canMessage);
                canRequestMessageTarget = Boolean(
                    relationship?.canSendMessageRequest,
                );
            }
        } catch (error) {
            if (!lifetime.isCurrent()) return;
            console.error("[profile] relationship read failed", {
                component: "social-profile",
                operation: "readRelationship",
                errorName: error?.name,
            });
        }
    }
    if (!lifetime.isCurrent()) return;
    const [mediaOutcome, bannerLayout] = await Promise.all([
        media.read(profile),
        loadBannerLayoutPreference(profile?.accountId),
    ]);
    if (!lifetime.isCurrent()) return;
    bannerHeight = bannerLayout.height;
    bannerPanX = bannerLayout.panX;
    bannerPanY = bannerLayout.panY;
    if (mediaOutcome.retryable)
        showToast(i18n.t("ui.app.profile.media_refresh_failed"), {
            variant: "error",
        });

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
                media.prepare(
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
                        externalProviderLabel: isOwnProfile
                            ? resolveExternalProfileProvider()
                            : null,
                        i18n,
                    }),
                ),
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

    profileEditor = createProfileEditor({
        ...ownedState,
        refreshProfileCards,
        bindProfileHeroEvents,
        i18n,
        signal: lifetime.signal,
    });
    composer = createPageComposer(root, {
        tutorials: guides,
        signal: lifetime.signal,
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
    if (lifetime.isCurrent()) startFollowerCountPoller(lifetime);
}

await mountWhenDirect(mount);
