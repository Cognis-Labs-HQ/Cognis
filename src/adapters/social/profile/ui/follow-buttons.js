export function bindFollowButtonHover(button, i18n) {
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

export function bindSocialCardFollowButtons(root, followUser) {
    root.querySelectorAll(".profile-follow-btn[data-handle]").forEach(
        (button) => {
            if (button.dataset.followActionBound === "true") return;
            button.dataset.followActionBound = "true";
            button.addEventListener("click", () =>
                followUser(button.dataset.handle),
            );
        },
    );
}
