import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { openPopup } from '../../reuse/popup.js';
import { getInitialsText, pickInitialsColor } from '../../reuse/avatar-utils.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.profile');

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
}

async function loadOwnProfile() {
  try {
    const res = await apiFetch('/api/v1/profile');
    if (!res.ok) return null;
    return (await res.json()).data ?? null;
  } catch {
    return null;
  }
}

async function loadFollowers(handle) {
  if (!handle) return [];
  try {
    const res = await apiFetch(`/api/v1/users/${encodeURIComponent(handle)}/followers`);
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch {
    return [];
  }
}

async function loadFollowing(handle) {
  if (!handle) return [];
  try {
    const res = await apiFetch(`/api/v1/users/${encodeURIComponent(handle)}/following`);
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch {
    return [];
  }
}

async function loadOwnPosts() {
  try {
    const res = await apiFetch('/api/v1/posts');
    if (!res.ok) return [];
    return (await res.json()).data ?? [];
  } catch {
    return [];
  }
}

async function loadImageAsBlob(fileKey) {
  if (!fileKey) return null;
  try {
    const res = await apiFetch(`/api/v1/files/${fileKey}`);
    if (!res.ok) return null;
    return URL.createObjectURL(await res.blob());
  } catch {
    return null;
  }
}

let profile = await loadOwnProfile();
let [followers, following, posts] = await Promise.all([
  loadFollowers(profile?.handle),
  loadFollowing(profile?.handle),
  loadOwnPosts(),
]);

let avatarBlobUrl = await loadImageAsBlob(profile?.avatarKey);
let bannerBlobUrl = await loadImageAsBlob(profile?.bannerKey);

let composer;

function visibilityClass(v) {
  const map = {
    hidden: 'visibility-hidden',
    private: 'visibility-private',
    friends: 'visibility-friends',
    community: 'visibility-community',
  };
  return map[v] ?? 'visibility-hidden';
}

function renderAvatarContent() {
  if (avatarBlobUrl) {
    return `<img src="${escapeHtml(avatarBlobUrl)}" class="profile-hero-avatar-img" alt="${i18n.t('ui.layout.avatar.alt')}" />`;
  }
  const initials = getInitialsText(profile?.handle ?? '');
  const color = pickInitialsColor(profile?.handle ?? '');
  return `<div class="profile-avatar-initials" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(initials)}</div>`;
}

function renderHero() {
  const bannerContent = bannerBlobUrl
    ? `<img src="${escapeHtml(bannerBlobUrl)}" class="profile-hero-banner-img" alt="" />`
    : `<div class="profile-hero-banner-placeholder"></div>`;

  const bio = profile?.bio ? `<p class="profile-hero-bio">${escapeHtml(profile.bio)}</p>` : '';

  const details = [
    profile?.location ? `<span class="profile-hero-detail-item">📍 ${escapeHtml(profile.location)}</span>` : '',
    profile?.website
      ? `<span class="profile-hero-detail-item">🌐 <a class="profile-hero-link" href="${escapeHtml(profile.website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(profile.website)}</a></span>`
      : '',
  ].filter(Boolean).join('');

  return `
    <div class="profile-hero">
      <div class="profile-hero-banner-wrap">
        <button
          class="profile-hero-banner-btn"
          type="button"
          aria-label="${i18n.t('ui.app.profile.change_banner')}"
        >${bannerContent}</button>
        ${bannerBlobUrl ? `
          <button
            class="profile-banner-remove-btn"
            type="button"
            aria-label="${i18n.t('ui.app.profile.remove_banner')}"
          >&#x2715;</button>
        ` : ''}
      </div>
      <div class="profile-hero-body">
        <div class="profile-avatar-wrap">
          <button
            class="profile-hero-avatar-btn"
            type="button"
            aria-label="${i18n.t('ui.app.profile.change_avatar')}"
          >${renderAvatarContent()}</button>
          ${avatarBlobUrl ? `
            <button
              class="profile-avatar-remove-btn"
              type="button"
              aria-label="${i18n.t('ui.app.profile.remove_avatar')}"
            >&#x2715;</button>
          ` : ''}
        </div>
        <div class="profile-hero-identity">
          <div class="profile-hero-handle-row">
            <strong class="profile-hero-handle">@${escapeHtml(profile?.handle ?? '')}</strong>
            ${profile?.role ? `<span class="profile-role-badge">${escapeHtml(profile.role)}</span>` : ''}
            <span class="visibility-badge ${visibilityClass(profile?.visibility ?? 'hidden')}">${i18n.t(`ui.app.profile.visibility.${profile?.visibility ?? 'hidden'}`)}</span>
          </div>
          ${bio}
          ${details ? `<div class="profile-hero-details">${details}</div>` : ''}
        </div>
        <button
          class="profile-hero-edit-btn"
          type="button"
          aria-label="${i18n.t('ui.app.profile.edit_profile')}"
        >✏</button>
      </div>
      <div class="profile-hero-stats">
        <div class="profile-stat-block">
          <span class="profile-stat-number">${posts.length}</span>
          <span class="profile-stat-label">${i18n.t('ui.app.profile.posts_stat')}</span>
        </div>
        <div class="profile-stat-block">
          <span class="profile-stat-number">${following.length}</span>
          <span class="profile-stat-label">${i18n.t('ui.app.profile.following_stat')}</span>
        </div>
        <div class="profile-stat-block">
          <span class="profile-stat-number">${followers.length}</span>
          <span class="profile-stat-label">${i18n.t('ui.app.profile.followers_stat')}</span>
        </div>
      </div>
      <div class="profile-achievement-row" aria-label="${i18n.t('ui.app.profile.achievements')}">
      </div>
    </div>
  `;
}

function renderUserList(list, emptyKey) {
  if (!list.length) return `<p class="profile-empty">${i18n.t(emptyKey)}</p>`;
  return `
    <ul class="profile-user-list">
      ${list.map((u) => `
        <li class="profile-user-item">
          <span class="profile-user-handle">@${escapeHtml(u.handle)}</span>
          <span class="profile-role-badge">${escapeHtml(u.role)}</span>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderSocial() {
  return `
    <div class="profile-social-grid">
      <div class="profile-social-col">
        <h3 class="profile-social-heading">
          ${i18n.t('ui.app.profile.followers')}
          <span class="profile-count-badge">${followers.length}</span>
        </h3>
        ${renderUserList(followers, 'ui.app.profile.no_followers')}
      </div>
      <div class="profile-social-col">
        <h3 class="profile-social-heading">
          ${i18n.t('ui.app.profile.following')}
          <span class="profile-count-badge">${following.length}</span>
        </h3>
        ${renderUserList(following, 'ui.app.profile.no_following')}
      </div>
    </div>
  `;
}

function renderSocialLinks() {
  const website = profile?.website ?? '';
  const linksHtml = website
    ? `<a
        href="${escapeHtml(website)}"
        class="profile-social-link-item"
        target="_blank"
        rel="noopener noreferrer"
      >🌐 <span class="profile-social-link-label">${escapeHtml(i18n.t('ui.app.profile.social_links.website'))}</span>
        <span class="profile-social-link-url">${escapeHtml(website)}</span>
      </a>`
    : `<p class="profile-empty">${escapeHtml(i18n.t('ui.app.profile.social_links.empty'))}</p>`;

  return `
    <div class="profile-social-links-section">
      ${linksHtml}
    </div>
  `;
}

function renderSuggestedContacts() {
  const followingHandles = new Set(following.map((u) => u.handle));
  const suggestions = followers.filter((u) => !followingHandles.has(u.handle)).slice(0, 5);

  if (!suggestions.length) {
    return `
      <div class="profile-suggested-section">
        <p class="profile-empty">${escapeHtml(i18n.t('ui.app.profile.suggested.empty'))}</p>
      </div>
    `;
  }

  const items = suggestions.map((u) => `
    <div class="profile-suggested-item">
      <span class="profile-user-handle">@${escapeHtml(u.handle)}</span>
      ${u.role ? `<span class="profile-role-badge">${escapeHtml(u.role)}</span>` : ''}
      <button
        type="button"
        class="btn-confirm btn-animated profile-follow-btn"
        data-handle="${escapeHtml(u.handle)}"
      >${escapeHtml(i18n.t('ui.app.profile.suggested.follow_back'))}</button>
    </div>
  `).join('');

  return `<div class="profile-suggested-section">${items}</div>`;
}

function renderPostsList() {
  if (!posts.length) return `<p class="profile-empty">${i18n.t('ui.app.profile.no_posts')}</p>`;
  return `
    <ul class="profile-post-list">
      ${posts.map((p) => `
        <li class="profile-post-card" data-post-id="${escapeHtml(p.id)}">
          <div class="profile-post-header">
            ${p.title ? `<strong class="profile-post-title">${escapeHtml(p.title)}</strong>` : ''}
            ${p.visibility ? `<span class="visibility-badge ${visibilityClass(p.visibility)}">${escapeHtml(p.visibility)}</span>` : ''}
            <time class="profile-post-date" datetime="${escapeHtml(p.createdAt ?? '')}">${formatDate(p.createdAt)}</time>
          </div>
          <p class="profile-post-body">${escapeHtml(p.content)}</p>
          <div class="profile-post-actions">
            <button type="button" class="btn-cancel btn-animated post-delete-btn" data-post-id="${escapeHtml(p.id)}">
              ${i18n.t('ui.app.profile.delete_post')}
            </button>
          </div>
        </li>
      `).join('')}
    </ul>
  `;
}

function renderPosts() {
  const profileVis = profile?.visibility ?? 'hidden';
  const canFollowers = profileVis !== 'hidden';
  const canEveryone = profileVis === 'friends' || profileVis === 'community';

  const lockedFollowersTitle = canFollowers ? '' : ` title="${escapeHtml(i18n.t('ui.app.profile.post_visibility.locked.followers'))}"`;
  const lockedEveryoneTitle = canEveryone ? '' : ` title="${escapeHtml(i18n.t('ui.app.profile.post_visibility.locked.everyone'))}"`;

  const visibilityHint = (!canFollowers || !canEveryone)
    ? `<p class="profile-visibility-hint">${escapeHtml(i18n.t('ui.app.profile.post_visibility_hint'))}</p>`
    : '';

  return `
    <div class="profile-posts-section">
      <h3 class="profile-posts-heading">
        ${i18n.t('ui.app.profile.new_post')}
      </h3>
      <div class="new-post-form">
        <input
          type="text"
          id="post-title"
          class="profile-field-input"
          placeholder="${i18n.t('ui.app.profile.post_title')}"
        />
        <textarea
          id="post-content"
          class="profile-field-input"
          rows="3"
          placeholder="${i18n.t('ui.app.profile.post_content')}"
        ></textarea>
        <div class="post-form-footer">
          <select id="post-visibility" class="profile-field-input theme-select">
            <option value="only_me">${escapeHtml(i18n.t('ui.app.profile.post_visibility.only_me'))}</option>
            <option value="private"${canFollowers ? '' : ' disabled'}${lockedFollowersTitle}>${escapeHtml(i18n.t('ui.app.profile.post_visibility.private'))}</option>
            <option value="community"${canEveryone ? '' : ' disabled'}${lockedEveryoneTitle}>${escapeHtml(i18n.t('ui.app.profile.post_visibility.community'))}</option>
          </select>
          <button type="button" id="post-submit" class="btn-confirm btn-animated">
            ${i18n.t('ui.app.profile.post_submit')}
          </button>
        </div>
        ${visibilityHint}
      </div>
      <h3 class="profile-posts-heading">
        ${i18n.t('ui.app.profile.section.posts')}
        <span class="profile-count-badge">${posts.length}</span>
      </h3>
      ${renderPostsList()}
    </div>
  `;
}

const avatarFileInput = document.createElement('input');
avatarFileInput.type = 'file';
avatarFileInput.accept = 'image/jpeg,image/png,image/webp';
avatarFileInput.hidden = true;
document.body.appendChild(avatarFileInput);

const bannerFileInput = document.createElement('input');
bannerFileInput.type = 'file';
bannerFileInput.accept = 'image/jpeg,image/png,image/webp,image/gif';
bannerFileInput.hidden = true;
document.body.appendChild(bannerFileInput);

async function doRemoveAvatar() {
  await apiFetch('/api/v1/profile/avatar', { method: 'DELETE' });
  if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
  avatarBlobUrl = null;
  profile = await loadOwnProfile();
  composer.refresh(elements);
}

async function doRemoveBanner() {
  await apiFetch('/api/v1/profile/banner', { method: 'DELETE' });
  if (bannerBlobUrl) URL.revokeObjectURL(bannerBlobUrl);
  bannerBlobUrl = null;
  profile = await loadOwnProfile();
  composer.refresh(elements);
}

async function openEditPopup() {
  const currentBio = profile?.bio ?? '';
  const currentLocation = profile?.location ?? '';
  const currentWebsite = profile?.website ?? '';
  const currentVisibility = profile?.visibility ?? 'hidden';

  const result = await openPopup({
    title: i18n.t('ui.app.profile.edit_profile'),
    body: () => `
      <div class="profile-edit-form">
        <label class="profile-field-label">
          ${escapeHtml(i18n.t('ui.app.profile.bio'))}
          <textarea id="popup-edit-bio" class="profile-field-input" rows="3">${escapeHtml(currentBio)}</textarea>
        </label>
        <label class="profile-field-label">
          ${escapeHtml(i18n.t('ui.app.profile.location'))}
          <input type="text" id="popup-edit-location" class="profile-field-input" value="${escapeHtml(currentLocation)}" />
        </label>
        <label class="profile-field-label">
          ${escapeHtml(i18n.t('ui.app.profile.website'))}
          <input type="url" id="popup-edit-website" class="profile-field-input" value="${escapeHtml(currentWebsite)}" />
        </label>
        <label class="profile-field-label">
          ${escapeHtml(i18n.t('ui.app.profile.visibility'))}
          <select id="popup-edit-visibility" class="profile-field-input">
            ${['hidden', 'private', 'friends', 'community'].map((v) =>
              `<option value="${v}"${currentVisibility === v ? ' selected' : ''}>${escapeHtml(i18n.t(`ui.app.profile.visibility.${v}`))}</option>`
            ).join('')}
          </select>
        </label>
      </div>
    `,
    variant: 'info',
    actions: [
      { id: 'cancel', label: i18n.t('ui.reuse.generic.discard'), variant: 'cancel' },
      { id: 'save', label: i18n.t('ui.reuse.generic.save'), variant: 'confirm' },
    ],
  });

  if (result === 'save') {
    const bio = document.getElementById('popup-edit-bio')?.value ?? currentBio;
    const location = document.getElementById('popup-edit-location')?.value ?? currentLocation;
    const website = document.getElementById('popup-edit-website')?.value ?? currentWebsite;
    const visibility = document.getElementById('popup-edit-visibility')?.value ?? currentVisibility;
    await apiFetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ bio, location, website, visibility }),
    });
    profile = await loadOwnProfile();
    composer.refresh(elements);
  }
}

avatarFileInput.addEventListener('change', async () => {
  const file = avatarFileInput.files?.[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const res = await apiFetch('/api/v1/profile/avatar', {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: buffer,
  });
  if (!res.ok) return;
  if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
  avatarBlobUrl = URL.createObjectURL(file);
  profile = await loadOwnProfile();
  composer.refresh(elements);
  avatarFileInput.value = '';
});

bannerFileInput.addEventListener('change', async () => {
  const file = bannerFileInput.files?.[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const res = await apiFetch('/api/v1/profile/banner', {
    method: 'PUT',
    headers: { 'content-type': file.type },
    body: buffer,
  });
  if (!res.ok) return;
  if (bannerBlobUrl) URL.revokeObjectURL(bannerBlobUrl);
  bannerBlobUrl = URL.createObjectURL(file);
  profile = await loadOwnProfile();
  composer.refresh(elements);
  bannerFileInput.value = '';
});

async function doCreatePost() {
  const titleEl = root.querySelector('#post-title');
  const contentEl = root.querySelector('#post-content');
  const visibilityEl = root.querySelector('#post-visibility');
  const submitBtn = root.querySelector('#post-submit');

  const content = contentEl?.value?.trim() ?? '';
  if (!content) return;

  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await apiFetch('/api/v1/posts', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: titleEl?.value?.trim() || undefined,
        content,
        visibility: visibilityEl?.value ?? 'community',
      }),
    });

    if (res.ok) {
      posts = await loadOwnPosts();
      if (titleEl) titleEl.value = '';
      if (contentEl) contentEl.value = '';
      composer.refresh(elements);
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function doDeletePost(postId) {
  const result = await openPopup({
    title: i18n.t('ui.app.profile.delete_post_confirm'),
    body: '',
    variant: 'danger',
    actions: [
      { id: 'cancel', label: i18n.t('ui.reuse.generic.discard'), variant: 'cancel' },
      { id: 'confirm', label: i18n.t('ui.app.profile.delete_post'), variant: 'confirm' },
    ],
  });
  if (result !== 'confirm') return;
  const res = await apiFetch(`/api/v1/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  if (res.ok) {
    posts = await loadOwnPosts();
    composer.refresh(elements);
  }
}

async function doFollowUser(handle) {
  const res = await apiFetch(`/api/v1/users/${encodeURIComponent(handle)}/follow`, { method: 'POST' });
  if (res.ok) {
    following = await loadFollowing(profile?.handle);
    composer.refresh(elements);
  }
}

function bindPageEvents() {
  root.querySelector('.profile-hero-edit-btn')?.addEventListener('click', openEditPopup);
  root.querySelector('.profile-hero-banner-btn')?.addEventListener('click', () => bannerFileInput.click());
  root.querySelector('.profile-banner-remove-btn')?.addEventListener('click', doRemoveBanner);
  root.querySelector('.profile-hero-avatar-btn')?.addEventListener('click', () => avatarFileInput.click());
  root.querySelector('.profile-avatar-remove-btn')?.addEventListener('click', doRemoveAvatar);
  root.querySelector('#post-submit')?.addEventListener('click', doCreatePost);
  root.querySelectorAll('.post-delete-btn[data-post-id]').forEach((btn) => {
    btn.addEventListener('click', () => doDeletePost(btn.dataset.postId));
  });
  root.querySelectorAll('.profile-follow-btn[data-handle]').forEach((btn) => {
    btn.addEventListener('click', () => doFollowUser(btn.dataset.handle));
  });
}

const elements = [
  {
    id: 'hero',
    label: i18n.t('ui.app.profile.section.profile'),
    gridSize: { default: [4, 4], min: [2, 3], max: 'full' },
    render: renderHero,
  },
  {
    id: 'social',
    label: i18n.t('ui.app.profile.section.social'),
    gridSize: { default: [4, 3], min: [2, 2], max: 'full' },
    render: renderSocial,
  },
  {
    id: 'posts',
    label: i18n.t('ui.app.profile.section.posts'),
    gridSize: { default: [4, 4], min: [2, 2], max: 'full' },
    render: renderPosts,
  },
  {
    id: 'social-links',
    label: i18n.t('ui.app.profile.section.social_links'),
    defaultHidden: true,
    gridSize: { default: [2, 2], min: [1, 1], max: 'full' },
    render: renderSocialLinks,
  },
  {
    id: 'suggested',
    label: i18n.t('ui.app.profile.section.suggested'),
    defaultHidden: true,
    gridSize: { default: [2, 3], min: [1, 2], max: 'full' },
    render: renderSuggestedContacts,
  },
];

composer = createPageComposer(root, {
  allowCustomization: true,
  elements,
  preferenceKey: 'profile-layout',
  i18n,
  pageContext: {
    title: i18n.t('ui.app.profile.page_title'),
    subtitle: i18n.t('ui.app.profile.page_subtitle'),
  },
  onRender: bindPageEvents,
});

await composer.init();
