import { createFormBuilder } from "/static/reuse/form-builder.js";
import {
    getInitialsText,
    pickInitialsColor,
} from "/static/reuse/avatar-utils.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";
import { formatDate } from "/static/reuse/timestamp.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import { getRoleLabel, normalizeRoleValue } from "/static/reuse/access-role.js";

const POST_TITLE_MAX_CHARACTERS = 120;
const POST_CONTENT_MAX_CHARACTERS = 1000;
const PROFILE_ROLE_ICON_PATHS = {
    owner: "/static/assets/reuse/crown.svg",
    admin: "/static/assets/reuse/wrench.svg",
};
const PROFILE_ROLE_ICON_ROLES = new Set(["owner", "admin", "teacher"]);

function renderRoleIconMarkup(normalizedRole, iconClassName) {
    if (normalizedRole === "teacher") return "&#128218;";
    const iconPath = PROFILE_ROLE_ICON_PATHS[normalizedRole];
    if (!iconPath) return "";
    return `<img src="${iconPath}" alt="" class="${iconClassName}" />`;
}

function createPostFormBuilder(canFollowers, canFriends, canEveryone, i18n) {
    return createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "new-post-form",
            formClassName: "new-post-form",
            submitButtonClassName: "btn-confirm btn-animated",
            submitLabelKey: "ui.app.profile.post_submit",
            fields: [
                {
                    name: "title",
                    labelKey: "ui.app.profile.post_title",
                    maxCharacters: POST_TITLE_MAX_CHARACTERS,
                    attributes: {
                        id: "post-title",
                        placeholder: i18n.t("ui.app.profile.post_title"),
                    },
                },
                {
                    name: "content",
                    labelKey: "ui.app.profile.post_content",
                    type: "textarea",
                    required: true,
                    maxCharacters: POST_CONTENT_MAX_CHARACTERS,
                    attributes: {
                        id: "post-content",
                        rows: 3,
                        placeholder: i18n.t("ui.app.profile.post_content"),
                    },
                },
                {
                    name: "visibility",
                    labelKey: "ui.app.profile.visibility",
                    type: "select",
                    attributes: {
                        id: "post-visibility",
                    },
                    options: [
                        {
                            value: "only_me",
                            label: i18n.t(
                                "ui.app.profile.post_visibility.only_me",
                            ),
                        },
                        {
                            value: "private",
                            label: i18n.t(
                                "ui.app.profile.post_visibility.private",
                            ),
                            disabled: !canFollowers,
                            title: !canFollowers
                                ? i18n.t(
                                      "ui.app.profile.post_visibility.locked.followers",
                                  )
                                : "",
                        },
                        {
                            value: "friends",
                            label: i18n.t(
                                "ui.app.profile.post_visibility.friends",
                            ),
                            disabled: !canFriends,
                            title: !canFriends
                                ? i18n.t(
                                      "ui.app.profile.post_visibility.locked.followers",
                                  )
                                : "",
                        },
                        {
                            value: "community",
                            label: i18n.t(
                                "ui.app.profile.post_visibility.community",
                            ),
                            disabled: !canEveryone,
                            title: !canEveryone
                                ? i18n.t(
                                      "ui.app.profile.post_visibility.locked.everyone",
                                  )
                                : "",
                        },
                    ],
                },
            ],
        },
    );
}

export function getPostVisibilityCapabilities(profileVisibility) {
    return {
        canFollowers: profileVisibility !== "hidden",
        canFriends: profileVisibility !== "hidden",
        canEveryone: profileVisibility === "community",
    };
}

export function createPostFormBuilderForVisibility(profileVisibility, i18n) {
    const { canFollowers, canFriends, canEveryone } =
        getPostVisibilityCapabilities(profileVisibility);
    return createPostFormBuilder(canFollowers, canFriends, canEveryone, i18n);
}

export function renderComposerMarkdownPreview(content, emptyMessage) {
    const normalizedContent = String(content ?? "");
    if (!normalizedContent.trim()) {
        return `<p class="profile-compose-preview-empty">${escapeHtml(emptyMessage)}</p>`;
    }
    return renderMarkdown(normalizedContent);
}

function toAbsoluteUrl(url) {
    if (!url) return url;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

export function visibilityClass(visibilityValue) {
    const visibilityClassMap = {
        hidden: "visibility-hidden",
        private: "visibility-private",
        friends: "visibility-friends",
        community: "visibility-community",
    };
    return visibilityClassMap[visibilityValue] ?? "visibility-hidden";
}

function getEscapedRoleLabel(normalizedRole, i18n, allowedRoles) {
    if (!normalizedRole) return "";
    if (!allowedRoles.has(normalizedRole)) return "";
    return escapeHtml(getRoleLabel(i18n, normalizedRole));
}

export function renderAvatarBadge(roleValue, i18n) {
    const normalizedRole = normalizeRoleValue(roleValue);
    const roleLabel = getEscapedRoleLabel(
        normalizedRole,
        i18n,
        PROFILE_ROLE_ICON_ROLES,
    );
    const iconMarkup = renderRoleIconMarkup(
        normalizedRole,
        "profile-avatar-badge-icon",
    );
    if (!roleLabel) return "";
    if (!iconMarkup) return "";
    return `
      <span
        class="profile-avatar-badge profile-avatar-badge--${normalizedRole}"
        aria-label="${roleLabel}"
        title="${roleLabel}"
        role="img"
      >${iconMarkup}</span>
    `;
}

function renderAvatarContent({ avatarBlobUrl, profile, i18n }) {
    if (avatarBlobUrl) {
        return `<img src="${escapeHtml(avatarBlobUrl)}" class="profile-hero-avatar-img" data-composer-preserve="false" alt="${i18n.t("ui.layout.avatar.alt")}" />`;
    }
    const initialsLabel = profile?.displayName || profile?.handle || "";
    const initials = getInitialsText(initialsLabel);
    const initialsColor = pickInitialsColor(initialsLabel);
    return `<div class="profile-avatar-initials" style="--initials-bg: ${escapeHtml(initialsColor)};">${escapeHtml(initials)}</div>`;
}

export function renderHero({
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
}) {
    const bannerImageObjectPosition = `${bannerPanX}% ${bannerPanY}%`;
    const bannerContent = bannerBlobUrl
        ? `<img src="${escapeHtml(bannerBlobUrl)}" class="profile-hero-banner-img" data-composer-preserve="false" style="object-position: ${escapeHtml(bannerImageObjectPosition)};" alt="" />`
        : '<div class="profile-hero-banner-placeholder"></div>';
    const details = [
        profile?.location
            ? `<span class="profile-hero-detail-item">📍 ${escapeHtml(profile.location)}</span>`
            : "",
        profile?.website
            ? `<span class="profile-hero-detail-item">🌐 <a class="profile-hero-link" href="${escapeHtml(toAbsoluteUrl(profile.website))}" target="_blank" rel="noopener noreferrer">${escapeHtml(profile.website)}</a></span>`
            : "",
    ]
        .filter(Boolean)
        .join("");

    const bioWrap =
        profile?.bio || details
            ? `
      <div class="profile-hero-bio-wrap">
        ${profile?.bio ? `<div class="profile-hero-bio profile-markdown">${renderMarkdown(profile.bio ?? "")}</div>` : ""}
        ${details ? `<div class="profile-hero-details">${details}</div>` : ""}
      </div>
    `
            : "";

    const bannerRemoveButton = bannerBlobUrl
        ? `
        <button
          class="btn-cancel profile-banner-remove-btn"
          type="button"
          aria-label="${escapeHtml(i18n.t("ui.app.profile.remove_banner"))}"
          title="${escapeHtml(i18n.t("ui.app.profile.remove_banner"))}"
        >&#215;</button>
    `
        : "";

    const bannerWrap = isOwnProfile
        ? `
      <button
        class="profile-hero-banner-btn"
        type="button"
        aria-label="${escapeHtml(i18n.t("ui.app.profile.change_banner"))}"
      >${bannerContent}</button>
      <div class="profile-banner-menu-wrap">
        ${bannerRemoveButton}
        <button
          class="profile-banner-menu-btn"
          type="button"
          aria-label="${escapeHtml(i18n.t("ui.app.profile.banner_menu_label"))}"
          aria-haspopup="true"
          aria-expanded="false"
        >&#9776;</button>
        <div class="profile-banner-menu-dropdown" hidden>
          <label class="profile-banner-menu-item profile-banner-height-label">
            <input
              type="radio"
              class="profile-banner-height-radio"
              value="half"
              ${bannerHeight !== "full" ? "checked" : ""}
            >
            ${escapeHtml(i18n.t("ui.app.profile.banner_height.half"))}
          </label>
          <label class="profile-banner-menu-item profile-banner-height-label">
            <input
              type="radio"
              class="profile-banner-height-radio"
              value="full"
              ${bannerHeight === "full" ? "checked" : ""}
            >
            ${escapeHtml(i18n.t("ui.app.profile.banner_height.full"))}
          </label>
        </div>
      </div>
    `
        : `<div class="profile-hero-banner-static">${bannerContent}</div>`;

    const avatarWrap = isOwnProfile
        ? `
      <div class="profile-avatar-wrap">
        <button
          class="profile-hero-avatar-btn"
          type="button"
          aria-label="${escapeHtml(i18n.t("ui.app.profile.change_avatar"))}"
        >${renderAvatarContent({ avatarBlobUrl, profile, i18n })}</button>
        ${renderAvatarBadge(profile?.role, i18n)}
        ${
            avatarBlobUrl
                ? `
          <button
            class="profile-avatar-remove-btn"
            type="button"
            aria-label="${escapeHtml(i18n.t("ui.app.profile.remove_avatar"))}"
          >&#x2715;</button>
        `
                : ""
        }
      </div>
    `
        : `
      <div class="profile-avatar-wrap">
        <div class="profile-hero-avatar-display">${renderAvatarContent({ avatarBlobUrl, profile, i18n })}</div>
        ${renderAvatarBadge(profile?.role, i18n)}
      </div>
    `;

    const renderedDisplayName =
        profile?.displayName ?? (profile?.handle ?? "").replace(/^@/, "");
    const visibleToText = i18n
        .t("ui.app.profile.visible_to")
        .replace(
            "{visibility}",
            i18n.t(
                `ui.app.profile.visibility.${profile?.visibility ?? "hidden"}`,
            ),
        );
    const handleRow = `
    <div class="profile-hero-name-block">
      <div class="profile-hero-display-row">
        <span class="profile-hero-display-name">${escapeHtml(renderedDisplayName)}</span>
        ${isOwnProfile ? `<span class="profile-its-you-pill">${i18n.t("ui.app.profile.its_you")}</span>` : ""}
        <span class="visibility-badge ${visibilityClass(profile?.visibility ?? "hidden")}">${escapeHtml(visibleToText)}</span>
      </div>
      <em class="profile-hero-handle">@${escapeHtml(profile?.handle ?? "")}</em>
    </div>
  `;

    const isFollowingTarget = Boolean(relationship?.following);
    const isBlocked = Boolean(relationship?.blocked);
    const isFollowedByTarget = Boolean(relationship?.followedBy);
    const followLabel = isFollowingTarget
        ? i18n.t("ui.app.profile.following")
        : isFollowedByTarget
          ? i18n.t("ui.app.profile.suggested.follow_back")
          : i18n.t("ui.app.profile.follow");
    const actionRow = isOwnProfile
        ? `
      <div class="profile-hero-action-row">
        <button class="profile-hero-edit-btn" type="button">${escapeHtml(i18n.t("ui.app.profile.edit_profile"))}</button>
      </div>
    `
        : `
      <div class="profile-hero-action-row">
        ${
            !isBlocked
                ? `<button class="profile-hero-follow-btn btn-animated" type="button" data-following="${isFollowingTarget ? "true" : "false"}">${escapeHtml(followLabel)}</button>`
                : ""
        }
        ${
            !isBlocked && (canMessageTarget || canRequestMessageTarget)
                ? `<button
                    class="profile-message-button"
                    type="button"
                    data-message-target="${escapeHtml(profile?.handle ?? "")}"
                    aria-label="${escapeHtml(i18n.t("ui.reuse.message"))}"
                    title="${escapeHtml(i18n.t("ui.reuse.message"))}"
                  ><img src="/static/assets/reuse/message-light.svg" alt="" class="profile-message-icon profile-message-icon--light" /><img src="/static/assets/reuse/message-dark.svg" alt="" class="profile-message-icon profile-message-icon--dark" /></button>`
                : ""
        }
        <button
          class="${isBlocked ? "profile-hero-unblock-btn" : "profile-hero-block-btn"}"
          type="button"
          aria-label="${escapeHtml(i18n.t(isBlocked ? "ui.app.profile.unblock_user" : "ui.app.profile.block_user"))}"
        >${isBlocked ? "🔓" : "🚫"}</button>
      </div>
    `;

    const blockedOverlay = isBlocked
        ? `<div class="profile-blocked-overlay">
        <span class="profile-blocked-label">${escapeHtml(i18n.t("ui.app.profile.blocked_overlay_label"))}</span>
        <button
          class="profile-hero-unblock-btn"
          type="button"
        >${escapeHtml(i18n.t("ui.app.profile.unblock_user_action"))}</button>
      </div>`
        : "";

    const statsHtml = `
    <div class="profile-hero-stats">
      <div class="profile-stat-block">
        <span class="profile-stat-number">${posts.length}</span>
        <span class="profile-stat-label">${i18n.t("ui.reuse.posts")}</span>
      </div>
      <div class="profile-stat-block">
        <span class="profile-stat-number">${following.length}</span>
        <span class="profile-stat-label">${i18n.t("ui.reuse.following")}</span>
      </div>
      <div class="profile-stat-block">
        <span class="profile-stat-number">${followers.length}</span>
        <span class="profile-stat-label">${i18n.t("ui.reuse.followers")}</span>
      </div>
    </div>
  `;

    const achievementRow = `<div class="profile-achievement-row" aria-label="${i18n.t("ui.app.profile.achievements")}"></div>`;
    const archivedBanner =
        profile?.lifecycleState === "archived"
            ? `<div class="profile-archived-banner">${escapeHtml(i18n.t("ui.app.profile.archived_banner"))}</div>`
            : "";

    const heroClass =
        bannerHeight === "full"
            ? "profile-hero profile-hero--full-banner"
            : "profile-hero";

    if (bannerHeight === "full") {
        return `
      ${archivedBanner}
      <div class="${heroClass}${isBlocked ? " profile-hero--blocked" : ""}" data-composer-preserve="false">
        <div class="profile-hero-banner-wrap">
          ${bannerWrap}
        </div>
        <div class="profile-hero-content">
          <div class="profile-hero-unified">
            ${avatarWrap}
            <div class="profile-hero-identity">
              ${handleRow}
            </div>
            ${statsHtml}
          </div>
          ${actionRow}
          ${bioWrap}
          ${achievementRow}
        </div>
        ${blockedOverlay}
      </div>
    `;
    }

    return `
    ${archivedBanner}
    <div class="${heroClass}${isBlocked ? " profile-hero--blocked" : ""}" data-composer-preserve="false">
      <div class="profile-hero-banner-wrap">
        ${bannerWrap}
      </div>
      <div class="profile-hero-content">
        <div class="profile-hero-body">
          ${avatarWrap}
          <div class="profile-hero-identity">
            ${handleRow}
            ${actionRow}
          </div>
        </div>
        <div class="profile-hero-stats-bio">
          ${statsHtml}
          ${bioWrap}
        </div>
        ${achievementRow}
      </div>
      ${blockedOverlay}
    </div>
  `;
}

function userDisplayName(user) {
    return user?.displayName || user?.username || user?.handle || "";
}

function renderUserRoleIcons(user, i18n) {
    const normalizedRole = normalizeRoleValue(user?.role);
    if (!normalizedRole) return "";
    const roleLabel = getEscapedRoleLabel(
        normalizedRole,
        i18n,
        PROFILE_ROLE_ICON_ROLES,
    );
    const iconMarkup = renderRoleIconMarkup(
        normalizedRole,
        "profile-role-icon-img",
    );
    if (!roleLabel) return "";
    if (!iconMarkup) return "";
    return `
      <span
        class="profile-user-role-icon"
        aria-label="${roleLabel}"
        title="${roleLabel}"
        role="img"
      >${iconMarkup}</span>
    `;
}

function renderUserList(users, emptyKey, i18n) {
    if (!users.length) {
        return `<p class="profile-empty">${i18n.t(emptyKey)}</p>`;
    }
    return `
    <div class="profile-user-card-grid">
      ${users
          .map(
              (user) => `
        <a class="profile-user-card" href="/profile/${escapeHtml(encodeURIComponent(user.handle))}">
          <span class="profile-user-card-name">${escapeHtml(userDisplayName(user))}</span>
          <span class="profile-user-card-handle">@${escapeHtml(user.handle)}</span>
          <span class="profile-user-card-icons">
            ${renderUserRoleIcons(user, i18n)}
          </span>
        </a>
      `,
          )
          .join("")}
    </div>
  `;
}

export function renderFollowers({ followers, i18n }) {
    return `
    <div class="profile-social-col">
      <h3 class="profile-social-heading">
        ${i18n.t("ui.app.profile.followers")}
        <span class="profile-count-badge">${followers.length}</span>
      </h3>
      ${renderUserList(followers, "ui.app.profile.no_followers", i18n)}
    </div>
  `;
}

export function renderFollowing({ following, i18n }) {
    return `
    <div class="profile-social-col">
      <h3 class="profile-social-heading">
        ${i18n.t("ui.app.profile.following")}
        <span class="profile-count-badge">${following.length}</span>
      </h3>
      ${renderUserList(following, "ui.app.profile.no_following", i18n)}
    </div>
  `;
}

export function renderSocialLinks({ profile, i18n }) {
    const website = profile?.website ?? "";
    const linksHtml = website
        ? `<a
        href="${escapeHtml(toAbsoluteUrl(website))}"
        class="profile-social-link-item"
        target="_blank"
        rel="noopener noreferrer"
      >🌐 <span class="profile-social-link-label">${escapeHtml(i18n.t("ui.app.profile.social_links.website"))}</span>
        <span class="profile-social-link-url">${escapeHtml(website)}</span>
      </a>`
        : `<p class="profile-empty">${escapeHtml(i18n.t("ui.app.profile.social_links.empty"))}</p>`;

    return `
    <div class="profile-social-links-section">
      ${linksHtml}
    </div>
  `;
}

export function renderSuggestedContacts({ followers, following, i18n }) {
    const followingHandles = new Set(
        following.map((followedUser) => followedUser.handle),
    );
    const suggestions = followers
        .filter((follower) => !followingHandles.has(follower.handle))
        .slice(0, 5);

    if (!suggestions.length) {
        return `
      <div class="profile-suggested-section">
        <p class="profile-empty">${escapeHtml(i18n.t("ui.app.profile.suggested.empty"))}</p>
      </div>
    `;
    }

    const items = suggestions
        .map(
            (suggestedUser) => `
    <div class="profile-suggested-item">
      <a class="profile-user-handle" href="/profile/${escapeHtml(encodeURIComponent(suggestedUser.handle))}">${escapeHtml(userDisplayName(suggestedUser))}</a>
      ${renderUserRoleIcons(suggestedUser, i18n)}
      <button
        type="button"
        class="btn-confirm btn-animated profile-follow-btn"
        data-handle="${escapeHtml(suggestedUser.handle)}"
      >${escapeHtml(i18n.t("ui.app.profile.suggested.follow_back"))}</button>
    </div>
  `,
        )
        .join("");

    return `<div class="profile-suggested-section">${items}</div>`;
}

function renderPostsList({ posts, isOwnProfile, i18n }) {
    if (!posts.length) {
        return `<p class="profile-empty">${i18n.t("ui.app.profile.no_posts")}</p>`;
    }
    return `
    <ul class="profile-post-list">
      ${posts
          .map(
              (post) => `
        <li id="post-${escapeHtml(encodeURIComponent(post.id))}" class="profile-post-card" data-post-id="${escapeHtml(post.id)}" data-search-category="Posts" data-search-label="${escapeHtml(post.title || i18n.t("ui.reuse.posts"))}" data-search-description="${escapeHtml(formatDate(post.createdAt, ""))}" data-search-text="${escapeHtml([post.title, post.content, formatDate(post.createdAt, "")].filter(Boolean).join(" "))}">
          <div class="profile-post-header">
            ${post.title ? `<strong class="profile-post-title">${escapeHtml(post.title)}</strong>` : ""}
            ${post.visibility ? `<span class="visibility-badge ${visibilityClass(post.visibility)}">${escapeHtml(i18n.t(`ui.app.profile.post_visibility.${post.visibility}`) || post.visibility)}</span>` : ""}
            <time class="profile-post-date" datetime="${escapeHtml(post.createdAt ?? "")}">${formatDate(post.createdAt)}</time>
          </div>
          <div class="profile-post-body profile-markdown">${renderMarkdown(post.content ?? "")}</div>
          ${
              isOwnProfile
                  ? `<div class="profile-post-actions">
            <button type="button" class="btn-cancel btn-animated post-delete-btn" data-post-id="${escapeHtml(post.id)}">
              ${i18n.t("ui.app.profile.delete_post")}
            </button>
          </div>`
                  : ""
          }
        </li>
      `,
          )
          .join("")}
    </ul>
  `;
}

export function renderNewPost({ profile, i18n }) {
    const profileVisibility = profile?.visibility ?? "hidden";
    const { canFollowers, canEveryone } =
        getPostVisibilityCapabilities(profileVisibility);

    const visibilityHint =
        !canFollowers || !canEveryone
            ? `<span class="profile-visibility-tooltip">${renderInfoTooltip(i18n.t("ui.app.profile.post_visibility_hint"), i18n.t("ui.reuse.more_information"))}</span>`
            : "";
    const postFormBuilder = createPostFormBuilderForVisibility(
        profileVisibility,
        i18n,
    );

    return `
    <div class="profile-posts-section">
      <h3 class="profile-posts-heading">
        ${i18n.t("ui.app.profile.new_post")}
      </h3>
      <div class="new-post-form-wrap">
        ${postFormBuilder.render()}
        <div class="profile-compose-preview-switcher">
          <button
            type="button"
            id="profile-post-compose-toggle"
            class="profile-compose-mode-toggle"
            aria-pressed="true"
          >${escapeHtml(i18n.t("ui.app.profile.compose"))}</button>
          <button
            type="button"
            id="profile-post-preview-toggle"
            class="profile-compose-mode-toggle"
            aria-pressed="false"
          >${escapeHtml(i18n.t("ui.app.profile.preview"))}</button>
        </div>
        <div
          id="profile-post-preview"
          class="profile-compose-preview profile-compose-preview--hidden"
          hidden
          aria-live="polite"
        >${renderComposerMarkdownPreview("", i18n.t("ui.app.profile.post_preview_placeholder"))}</div>
        ${visibilityHint}
      </div>
    </div>
  `;
}

export function renderPosts({ posts, isOwnProfile, i18n }) {
    return `
    <div class="profile-posts-section">
      <h3 class="profile-posts-heading">
        ${i18n.t("ui.app.profile.section.posts")}
        <span class="profile-count-badge">${posts.length}</span>
      </h3>
      ${renderPostsList({ posts, isOwnProfile, i18n })}
    </div>
  `;
}

export function renderFollowRequests({ i18n }) {
    return `
    <div class="profile-follow-requests-section">
      <p class="profile-empty">${escapeHtml(i18n.t("ui.app.profile.follow_requests.empty"))}</p>
    </div>
  `;
}
