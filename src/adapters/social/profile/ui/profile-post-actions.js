import { profileFetch as apiFetch } from "./offline-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";

export function createProfilePostActions({
    getState,
    isCurrent,
    setState,
    refreshPage,
    refreshProfileHero = refreshPage,
    refreshProfileCards = refreshPage,
    i18n,
    loadOwnPosts,
    loadFollowers,
    loadFollowing,
}) {
    const pendingFollowHandles = new Set();

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

    async function doDeletePost(postId) {
        if (!isCurrent()) return;
        const result = await openPopup({
            title: i18n.t("ui.app.profile.delete_post_confirm"),
            body: "",
            variant: "danger",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.discard"),
                    variant: "cancel",
                },
                {
                    id: "confirm",
                    label: i18n.t("ui.app.profile.delete_post"),
                    variant: "confirm",
                },
            ],
        });
        if (!isCurrent() || result !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/social/posts/${encodeURIComponent(postId)}`,
            {
                method: "DELETE",
            },
        );
        if (!isCurrent()) return;
        if (response.ok) {
            setState({ posts: await loadOwnPosts() });
            refreshPage();
        }
    }

    async function doFollowUser(handle) {
        if (!isCurrent()) return;
        if (!handle || pendingFollowHandles.has(handle)) return;
        const { relationship, profile } = getState();
        const isFollowingTarget = Boolean(relationship?.following);
        if (isFollowingTarget) {
            const result = await openPopup({
                title: i18n.t("ui.app.profile.unfollow_confirm_title"),
                body: `<p>${escapeHtml(i18n.t("ui.app.profile.unfollow_confirm_body"))}</p><strong>${escapeHtml(handle)}</strong>`,
                variant: "danger",
                actions: [
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                    {
                        id: "confirm",
                        label: i18n.t("ui.app.profile.unfollow"),
                        variant: "confirm",
                    },
                ],
            });
            if (!isCurrent() || result !== "confirm") return;
        }

        pendingFollowHandles.add(handle);
        const followButton = getState().root?.querySelector(
            ".profile-hero-follow-btn",
        );
        if (followButton instanceof HTMLButtonElement) {
            followButton.disabled = true;
            followButton.setAttribute("aria-busy", "true");
        }
        try {
            const response = await apiFetch(
                `/api/v1/social/users/${encodeURIComponent(handle)}/follow`,
                { method: isFollowingTarget ? "DELETE" : "POST" },
            );

            if (!isCurrent()) return;
            if (response.ok) {
                const currentState = getState();
                const matchingUser = [
                    ...(currentState.followers ?? []),
                    ...(currentState.following ?? []),
                ].find((user) => user.handle === handle);
                const nextFollowers = isFollowingTarget
                    ? currentState.followers.filter(
                          (user) => user.handle !== currentState.ownAccount,
                      )
                    : currentState.followers.some(
                            (user) => user.handle === currentState.ownAccount,
                        )
                      ? currentState.followers
                      : [
                            ...currentState.followers,
                            { handle: currentState.ownAccount },
                        ];
                const nextFollowing = isFollowingTarget
                    ? currentState.following
                    : matchingUser
                      ? [...currentState.following, matchingUser]
                      : currentState.following;
                setState({
                    relationship: {
                        ...(relationship ?? {}),
                        following: !isFollowingTarget,
                    },
                    followers: nextFollowers,
                    following: nextFollowing,
                });
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

                const [followersResult, followingResult] =
                    await Promise.allSettled([
                        loadFollowers(profile?.handle),
                        loadFollowing(profile?.handle),
                    ]);
                if (!isCurrent()) return;
                setState({
                    ...(followersResult.status === "fulfilled"
                        ? { followers: followersResult.value }
                        : {}),
                    ...(followingResult.status === "fulfilled"
                        ? { following: followingResult.value }
                        : {}),
                });
                refreshPage();
                return;
            }
            if (response.status === 403) {
                showToast(i18n.t("ui.app.profile.follow_hidden_toast"), {
                    variant: "error",
                });
                return;
            }
            showToast(i18n.t("ui.app.profile.follow_unavailable_toast"), {
                variant: "error",
            });
        } finally {
            pendingFollowHandles.delete(handle);
            if (followButton instanceof HTMLButtonElement) {
                followButton.disabled = false;
                followButton.removeAttribute("aria-busy");
            }
        }
    }

    async function doBlockUser() {
        if (!isCurrent()) return;
        const { urlHandle, relationship, profile } = getState();
        const result = await openPopup({
            title: i18n.t("ui.app.profile.block_user"),
            body: escapeHtml(i18n.t("ui.app.profile.block_user_confirm")),
            variant: "danger",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.discard"),
                    variant: "cancel",
                },
                {
                    id: "confirm",
                    label: i18n.t("ui.app.profile.block_user_action"),
                    variant: "confirm",
                },
            ],
        });
        if (!isCurrent() || result !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(urlHandle)}/block`,
            { method: "POST" },
        );
        if (!isCurrent() || !response.ok) return;
        const [nextFollowers, nextFollowing] = await Promise.all([
            loadFollowers(profile?.handle),
            loadFollowing(profile?.handle),
        ]);
        if (!isCurrent()) return;
        setState({
            relationship: {
                ...(relationship ?? {}),
                blocked: true,
                following: false,
            },
            canMessageTarget: false,
            canRequestMessageTarget: false,
            followers: nextFollowers,
            following: nextFollowing,
        });
        refreshPage();
    }

    async function doUnblockUser() {
        if (!isCurrent()) return;
        const { urlHandle, relationship } = getState();
        const result = await openPopup({
            title: i18n.t("ui.app.profile.unblock_user"),
            body: escapeHtml(i18n.t("ui.app.profile.unblock_user_confirm")),
            variant: "danger",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "confirm",
                    label: i18n.t("ui.app.profile.unblock_user_action"),
                    variant: "confirm",
                },
            ],
        });
        if (!isCurrent() || result !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(urlHandle)}/block`,
            { method: "DELETE" },
        );
        if (!isCurrent() || !response.ok) return;
        setState({
            relationship: { ...(relationship ?? {}), blocked: false },
            canRequestMessageTarget: Boolean(
                relationship?.canSendMessageRequest,
            ),
        });
        refreshPage();
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
        doBlockUser,
        doUnblockUser,
        doOpenMessageRoom,
    };
}
