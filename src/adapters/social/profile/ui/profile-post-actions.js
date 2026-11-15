import { profileFetch as apiFetch } from "./offline-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { isOffline } from "/static/reuse/offline-state.js";

/** Create page-owned post and relationship actions. @returns {object} Action callbacks. */
export function createProfilePostActions({
    getState,
    isCurrent,
    setState,
    refreshPage,
    refreshProfileHero = refreshPage,
    refreshProfileCards = refreshPage,
    i18n,
    signal,
    loadOwnPosts,
    loadFollowers,
    loadFollowing,
}) {
    const mutations = new Map();
    const log = (level, operation, metadata = {}) =>
        console[level]("[profile] relationship or post action", {
            component: "social-profile",
            operation,
            ...metadata,
        });

    function runAction({
        key,
        operation,
        title,
        body = "",
        label,
        destructive = true,
        path,
        method,
        apply,
        retain = false,
    }) {
        if (!isCurrent() || signal?.aborted) return Promise.resolve();
        const existing = mutations.get(key);
        if (existing) {
            if (existing.uncertain)
                showToast(i18n.t("ui.app.profile.action_uncertain"), {
                    variant: "error",
                });
            return existing.promise;
        }
        const entry = { uncertain: false, accepted: false, promise: null };
        mutations.set(key, entry);
        entry.promise = Promise.resolve().then(async () => {
            let submitted = false;
            let startedOffline = false;
            try {
                if (!isCurrent() || signal?.aborted) return;
                if (title) {
                    const result = await openPopup({
                        title: i18n.t(title),
                        body,
                        signal,
                        variant: destructive ? "danger" : "info",
                        actions: [
                            {
                                id: "cancel",
                                label: i18n.t("ui.reuse.cancel"),
                                variant: "neutral",
                            },
                            {
                                id: "confirm",
                                label: i18n.t(label),
                                variant: destructive ? "cancel" : "neutral",
                            },
                        ],
                    });
                    if (result !== "confirm") return;
                }
                if (!isCurrent() || signal?.aborted) return;
                startedOffline = isOffline();
                submitted = true;
                log("info", operation, { phase: "submit" });
                const response = await apiFetch(path, { method, signal });
                if (!isCurrent() || signal?.aborted) return;
                if (!response.ok) {
                    entry.uncertain =
                        response.status >= 500 || response.status === 408;
                    log("error", operation, {
                        status: response.status,
                        uncertain: entry.uncertain,
                    });
                    showToast(
                        i18n.t(
                            entry.uncertain
                                ? "ui.app.profile.action_uncertain"
                                : "ui.app.profile.action_failed",
                        ),
                        { variant: "error" },
                    );
                    return;
                }
                entry.accepted = true;
                log("info", operation, { phase: "accepted" });
                await apply();
            } catch (error) {
                if (error?.code === "missing_translation") throw error;
                const knownUnsent =
                    [
                        "offline_delivery_pending",
                        "offline_operation_unavailable",
                        "profile_client_unavailable",
                    ].includes(error?.message) ||
                    (startedOffline &&
                        [
                            "offline_outbox_full",
                            "offline_delivery_unavailable",
                        ].includes(error?.message));
                entry.uncertain = submitted && !entry.accepted && !knownUnsent;
                log("error", operation, {
                    errorName: error?.name,
                    accepted: entry.accepted,
                    uncertain: entry.uncertain,
                });
                if (!isCurrent() || signal?.aborted) return;
                showToast(
                    i18n.t(
                        entry.accepted
                            ? "ui.app.profile.action_refresh_failed"
                            : entry.uncertain
                              ? "ui.app.profile.action_uncertain"
                              : "ui.app.profile.action_failed",
                    ),
                    { variant: "error" },
                );
            } finally {
                if (!entry.uncertain && !(retain && entry.accepted))
                    mutations.delete(key);
            }
        });
        return entry.promise;
    }

    async function doCreatePost() {
        if (!isCurrent()) return;
        const { root, newPostFormController } = getState();
        const submitButton = root?.querySelector(
            '#new-post-form button[type="submit"]',
        );
        const fieldValues = newPostFormController?.getValues() ?? {};
        const content = String(fieldValues.content ?? "").trim();
        if (!content) return;

        if (submitButton) submitButton.disabled = true;
        let delivered = false;

        try {
            const response = await apiFetch("/api/v1/social/posts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title: String(fieldValues.title ?? "").trim() || undefined,
                    content,
                    visibility: String(fieldValues.visibility ?? "community"),
                }),
            });

            if (!isCurrent()) return;
            if (response.ok) {
                const receipt = await response.json();
                if (!isCurrent()) return;
                delivered = true;
                setState({
                    posts: receipt.queued
                        ? [receipt.data, ...(getState().posts ?? [])]
                        : await loadOwnPosts(),
                });
                if (!isCurrent()) return;
                const postFormElement = root?.querySelector("#new-post-form");
                if (postFormElement instanceof HTMLFormElement) {
                    postFormElement.reset();
                    newPostFormController?.validateField("title");
                    newPostFormController?.validateField("content");
                }
                refreshPage();
            } else {
                showToast(i18n.t("ui.app.profile.post_failed"), {
                    variant: "error",
                });
            }
        } catch (error) {
            if (error?.code === "missing_translation") throw error;
            console.error(
                delivered
                    ? "[profile] post view refresh failed"
                    : "[profile] post delivery failed",
                {
                    component: "social-profile",
                    operation: "createPost",
                    errorName: error.name,
                    delivered,
                },
            );
            if (delivered || !isCurrent()) return;
            showToast(
                i18n.t(
                    error.message === "offline_outbox_full"
                        ? "ui.reuse.offline_buffer_full_body"
                        : "ui.app.profile.post_failed",
                ),
                { variant: "error" },
            );
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    let connectionRefresh = 0;

    async function refreshConnections(handle) {
        const generation = ++connectionRefresh;
        const [followersResult, followingResult] = await Promise.allSettled([
            loadFollowers(handle),
            loadFollowing(handle),
        ]);
        if (!isCurrent() || signal?.aborted || generation !== connectionRefresh)
            return;
        setState({
            ...(followersResult.status === "fulfilled"
                ? { followers: followersResult.value }
                : {}),
            ...(followingResult.status === "fulfilled"
                ? { following: followingResult.value }
                : {}),
        });
        refreshPage();
        if (
            followersResult.status === "rejected" ||
            followingResult.status === "rejected"
        )
            throw new Error("connection_refresh_failed");
    }

    function doDeletePost(postId) {
        if (!postId) return Promise.resolve();
        return runAction({
            key: `post:${postId}`,
            operation: "deletePost",
            title: "ui.app.profile.delete_post_confirm",
            label: "ui.app.profile.delete_post",
            path: `/api/v1/social/posts/${encodeURIComponent(postId)}`,
            method: "DELETE",
            retain: true,
            apply: () => {
                setState({
                    posts: (getState().posts ?? []).filter(
                        (post) => post.id !== postId,
                    ),
                });
                refreshPage();
            },
        });
    }

    function doFollowUser(handle) {
        if (!handle || !isCurrent()) return Promise.resolve();
        const { relationship, profile } = getState();
        const isProfileTarget = profile?.handle === handle;
        const isFollowingTarget =
            isProfileTarget && Boolean(relationship?.following);
        const followButton = isProfileTarget
            ? getState().root?.querySelector(".profile-hero-follow-btn")
            : null;
        if (
            followButton &&
            (followButton.dataset.following === "true") !== isFollowingTarget
        )
            return Promise.resolve();
        const pending = mutations.has(`relationship:${handle}`);
        const work = runAction({
            key: `relationship:${handle}`,
            operation: isFollowingTarget ? "unfollow" : "follow",
            retain: !isProfileTarget,
            title: isFollowingTarget
                ? "ui.app.profile.unfollow_confirm_title"
                : null,
            body: isFollowingTarget
                ? `<p>${escapeHtml(i18n.t("ui.app.profile.unfollow_confirm_body"))}</p><strong>${escapeHtml(handle)}</strong>`
                : "",
            label: "ui.app.profile.unfollow",
            path: `/api/v1/social/users/${encodeURIComponent(handle)}/follow`,
            method: isFollowingTarget ? "DELETE" : "POST",
            apply: async () => {
                const currentState = getState();
                if (isProfileTarget) {
                    const nextFollowers = isFollowingTarget
                        ? currentState.followers.filter(
                              (user) => user.handle !== currentState.ownAccount,
                          )
                        : currentState.followers.some(
                                (user) =>
                                    user.handle === currentState.ownAccount,
                            )
                          ? currentState.followers
                          : [
                                ...currentState.followers,
                                { handle: currentState.ownAccount },
                            ];
                    setState({
                        relationship: {
                            ...getState().relationship,
                            following: !isFollowingTarget,
                        },
                        followers: nextFollowers,
                    });
                } else if (currentState.isOwnProfile) {
                    const matchingUser = currentState.followers.find(
                        (user) => user.handle === handle,
                    );
                    if (
                        matchingUser &&
                        !currentState.following.some(
                            (user) => user.handle === handle,
                        )
                    ) {
                        setState({
                            following: [
                                ...currentState.following,
                                matchingUser,
                            ],
                        });
                    }
                }
                refreshProfileHero();
                refreshProfileCards(["followers", "following", "suggested"]);
                showToast(
                    i18n.t(
                        isFollowingTarget
                            ? "ui.app.profile.unfollowed_toast"
                            : "ui.app.profile.followed_toast",
                    ),
                    { variant: "success" },
                );
                await refreshConnections(profile?.handle);
            },
        });
        if (pending) return work;
        if (followButton instanceof HTMLButtonElement) {
            followButton.disabled = true;
            followButton.setAttribute("aria-busy", "true");
        }
        return work.finally(() => {
            if (
                isCurrent() &&
                followButton instanceof HTMLButtonElement &&
                followButton.isConnected
            ) {
                followButton.disabled = false;
                followButton.removeAttribute("aria-busy");
            }
        });
    }

    function changeBlock(blocked) {
        if (!isCurrent()) return Promise.resolve();
        const { urlHandle, profile, relationship } = getState();
        if (Boolean(relationship?.blocked) === blocked)
            return Promise.resolve();
        if (!urlHandle) return Promise.resolve();
        return runAction({
            key: `relationship:${urlHandle}`,
            operation: blocked ? "block" : "unblock",
            title: blocked
                ? "ui.app.profile.block_user"
                : "ui.app.profile.unblock_user",
            body: escapeHtml(
                i18n.t(
                    blocked
                        ? "ui.app.profile.block_user_confirm"
                        : "ui.app.profile.unblock_user_confirm",
                ),
            ),
            label: blocked
                ? "ui.app.profile.block_user_action"
                : "ui.app.profile.unblock_user_action",
            destructive: blocked,
            path: `/api/v1/social/users/${encodeURIComponent(urlHandle)}/block`,
            method: blocked ? "POST" : "DELETE",
            apply: async () => {
                const relationship = getState().relationship;
                setState({
                    relationship: {
                        ...relationship,
                        blocked,
                        ...(blocked ? { following: false } : {}),
                    },
                    ...(blocked
                        ? {
                              canMessageTarget: false,
                              canRequestMessageTarget: false,
                          }
                        : {
                              canRequestMessageTarget: Boolean(
                                  relationship?.canSendMessageRequest,
                              ),
                          }),
                });
                refreshPage();
                if (!blocked) return;
                await refreshConnections(profile?.handle);
            },
        });
    }

    async function doOpenMessageRoom() {
        if (!isCurrent()) return;
        const { profile } = getState();
        if (!profile?.handle) return;
        try {
            const response = await apiFetch("/api/v1/social/messages/rooms", {
                method: "POST",
                body: JSON.stringify({ handles: [profile.handle] }),
            });
            if (!isCurrent()) return;
            if (!response.ok) {
                showToast(i18n.t("ui.app.profile.message_start_failed"), {
                    variant: "error",
                });
                return;
            }
            const payload = await response.json();
            if (!isCurrent()) return;
            const roomId = payload?.data?.id;
            if (!roomId && payload?.data?.requiresApproval) {
                showToast(i18n.t("ui.app.profile.message_request_sent"), {
                    variant: "info",
                });
                return;
            }
            if (!roomId) return;
            await navigateTo(`/messages/${encodeURIComponent(roomId)}`);
        } catch (error) {
            if (error?.code === "missing_translation") throw error;
            if (!isCurrent()) return;
            console.error("[profile] message room request failed", {
                component: "social-profile",
                operation: "openMessageRoom",
                errorName: error?.name,
            });
            showToast(i18n.t("ui.app.profile.message_start_failed"), {
                variant: "error",
            });
        }
    }

    return {
        doCreatePost,
        doDeletePost,
        doFollowUser,
        doBlockUser: () => changeBlock(true),
        doUnblockUser: () => changeBlock(false),
        doOpenMessageRoom,
    };
}
