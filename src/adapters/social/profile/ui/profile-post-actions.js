import { apiFetch } from "/static/reuse/api-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";

export function createProfilePostActions({
    getState,
    setState,
    refreshPage,
    i18n,
    loadOwnPosts,
    loadFollowers,
    loadFollowing,
}) {
    async function doCreatePost() {
        const { root, newPostFormController } = getState();
        const submitButton = root?.querySelector(
            '#new-post-form button[type="submit"]',
        );
        const fieldValues = newPostFormController?.getValues() ?? {};
        const content = String(fieldValues.content ?? "").trim();
        if (!content) return;

        if (submitButton) submitButton.disabled = true;

        try {
            const response = await apiFetch("/api/v1/posts", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    title: String(fieldValues.title ?? "").trim() || undefined,
                    content,
                    visibility: String(fieldValues.visibility ?? "community"),
                }),
            });

            if (response.ok) {
                setState({ posts: await loadOwnPosts() });
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
        } finally {
            if (submitButton) submitButton.disabled = false;
        }
    }

    async function doDeletePost(postId) {
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
        if (result !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/posts/${encodeURIComponent(postId)}`,
            {
                method: "DELETE",
            },
        );
        if (response.ok) {
            setState({ posts: await loadOwnPosts() });
            refreshPage();
        }
    }

    async function doFollowUser(handle) {
        if (!handle) return;
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
            if (result !== "confirm") return;
        }

        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(handle)}/follow`,
            { method: isFollowingTarget ? "DELETE" : "POST" },
        );
        if (response.ok) {
            const nextRelationship = {
                ...(relationship ?? {}),
                following: !isFollowingTarget,
            };
            const [nextFollowers, nextFollowing] = await Promise.all([
                loadFollowers(profile?.handle),
                loadFollowing(profile?.handle),
            ]);
            setState({
                relationship: nextRelationship,
                followers: nextFollowers,
                following: nextFollowing,
            });
            refreshPage();
            showToast(
                i18n.t(
                    isFollowingTarget
                        ? "ui.app.profile.unfollowed_toast"
                        : "ui.app.profile.followed_toast",
                ),
                { variant: "success" },
            );
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
    }

    async function doBlockUser() {
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
        if (result !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(urlHandle)}/block`,
            { method: "POST" },
        );
        if (!response.ok) return;
        const [nextFollowers, nextFollowing] = await Promise.all([
            loadFollowers(profile?.handle),
            loadFollowing(profile?.handle),
        ]);
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
        if (result !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(urlHandle)}/block`,
            { method: "DELETE" },
        );
        if (!response.ok) return;
        setState({
            relationship: { ...(relationship ?? {}), blocked: false },
            canRequestMessageTarget: Boolean(
                relationship?.canSendMessageRequest,
            ),
        });
        refreshPage();
    }

    async function doOpenMessageRoom() {
        const { profile } = getState();
        if (!profile?.handle) return;
        try {
            const response = await apiFetch("/api/v1/messages/rooms", {
                method: "POST",
                body: JSON.stringify({ handles: [profile.handle] }),
            });
            if (!response.ok) {
                showToast(i18n.t("module.social.messages.start_failed"), {
                    variant: "error",
                });
                return;
            }
            const payload = await response.json();
            const roomId = payload?.data?.id;
            if (!roomId && payload?.data?.requiresApproval) {
                showToast(i18n.t("module.social.messages.request_sent"), {
                    variant: "info",
                });
                return;
            }
            if (!roomId) return;
            await navigateTo(`/messages/${encodeURIComponent(roomId)}`);
        } catch {
            showToast(i18n.t("module.social.messages.start_failed"), {
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
