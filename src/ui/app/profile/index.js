import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { generateInitialsDataUrl } from '../../reuse/avatar-utils.js';

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

let editState = {
  bio: profile?.bio ?? '',
  location: profile?.location ?? '',
  website: profile?.website ?? '',
  visibility: profile?.visibility ?? 'hidden',
};

let composer;
let mediaPopupTarget = null;

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
  const dataUrl = generateInitialsDataUrl(profile?.handle ?? '', 80);
  return `<img src="${escapeHtml(dataUrl)}" class="profile-hero-avatar-img" alt="${i18n.t('ui.layout.avatar.alt')}" />`;
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
      <button
        class="profile-hero-banner-btn"
        type="button"
        aria-label="${i18n.t('ui.app.profile.change_banner')}"
      >${bannerContent}</button>
      <button
        class="profile-hero-edit-btn"
        type="button"
        aria-label="${i18n.t('ui.app.profile.edit_profile')}"
      >✏</button>
      <div class="profile-hero-body">
        <button
          class="profile-hero-avatar-btn"
          type="button"
          aria-label="${i18n.t('ui.app.profile.change_avatar')}"
        >${renderAvatarContent()}</button>
        <div class="profile-hero-identity">
          <div class="profile-hero-handle-row">
            <strong class="profile-hero-handle">@${escapeHtml(profile?.handle ?? '')}</strong>
            ${profile?.role ? `<span class="profile-role-badge">${escapeHtml(profile.role)}</span>` : ''}
            <span class="visibility-badge ${visibilityClass(profile?.visibility ?? 'hidden')}">${i18n.t(`ui.app.profile.visibility.${profile?.visibility ?? 'hidden'}`)}</span>
          </div>
          ${bio}
          ${details ? `<div class="profile-hero-details">${details}</div>` : ''}
          <div class="profile-hero-stats">
            <span class="profile-hero-stat"><strong>${followers.length}</strong> ${i18n.t('ui.app.profile.followers_stat')}</span>
            <span class="profile-hero-stat-sep" aria-hidden="true">·</span>
            <span class="profile-hero-stat"><strong>${following.length}</strong> ${i18n.t('ui.app.profile.following_stat')}</span>
            <span class="profile-hero-stat-sep" aria-hidden="true">·</span>
            <span class="profile-hero-stat"><strong>${posts.length}</strong> ${i18n.t('ui.app.profile.posts_stat')}</span>
            ${profile?.createdAt
              ? `<span class="profile-hero-stat-sep" aria-hidden="true">·</span>
                 <span class="profile-member-since">${i18n.t('ui.app.profile.member_since')} ${formatDate(profile.createdAt)}</span>`
              : ''
            }
          </div>
        </div>
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
          <select id="post-visibility" class="profile-field-input">
            ${['only_me', 'private', 'friends', 'community'].map((v) =>
              `<option value="${v}">${i18n.t(`ui.app.profile.post_visibility.${v}`)}</option>`
            ).join('')}
          </select>
          <button type="button" id="post-submit" class="btn-confirm btn-animated">
            ${i18n.t('ui.app.profile.post_submit')}
          </button>
        </div>
      </div>
      <h3 class="profile-posts-heading">
        ${i18n.t('ui.app.profile.section.posts')}
        <span class="profile-count-badge">${posts.length}</span>
      </h3>
      ${renderPostsList()}
    </div>
  `;
}

const editDialog = document.createElement('dialog');
editDialog.className = 'profile-edit-dialog';
document.body.appendChild(editDialog);

function buildEditDialogHtml() {
  return `
    <div class="profile-edit-dialog-header">
      <h2 class="profile-edit-dialog-title">${i18n.t('ui.app.profile.edit_profile')}</h2>
      <button class="profile-edit-dialog-close btn-animated" type="button" id="edit-dialog-close">✕</button>
    </div>
    <div class="profile-edit-dialog-body">
      <label class="profile-field-label">
        ${i18n.t('ui.app.profile.bio')}
        <textarea id="edit-bio" class="profile-field-input" rows="3">${escapeHtml(editState.bio)}</textarea>
      </label>
      <label class="profile-field-label">
        ${i18n.t('ui.app.profile.location')}
        <input type="text" id="edit-location" class="profile-field-input" value="${escapeHtml(editState.location)}" />
      </label>
      <label class="profile-field-label">
        ${i18n.t('ui.app.profile.website')}
        <input type="url" id="edit-website" class="profile-field-input" value="${escapeHtml(editState.website)}" />
      </label>
      <label class="profile-field-label">
        ${i18n.t('ui.app.profile.visibility')}
        <select id="edit-visibility" class="profile-field-input">
          ${['hidden', 'private', 'friends', 'community'].map((v) =>
            `<option value="${v}"${editState.visibility === v ? ' selected' : ''}>${i18n.t(`ui.app.profile.visibility.${v}`)}</option>`
          ).join('')}
        </select>
      </label>
    </div>
    <div class="profile-edit-dialog-actions">
      <button class="btn-cancel btn-animated" type="button" id="edit-dialog-discard">
        ${i18n.t('ui.reuse.generic.discard')}
      </button>
      <button class="btn-confirm btn-animated" type="button" id="edit-dialog-save">
        ${i18n.t('ui.reuse.generic.save')}
      </button>
    </div>
  `;
}

function openEditDialog() {
  editDialog.innerHTML = buildEditDialogHtml();
  editDialog.querySelector('#edit-dialog-close')?.addEventListener('click', () => editDialog.close());
  editDialog.querySelector('#edit-dialog-discard')?.addEventListener('click', () => {
    editState = {
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      website: profile?.website ?? '',
      visibility: profile?.visibility ?? 'hidden',
    };
    editDialog.close();
  });
  editDialog.querySelector('#edit-dialog-save')?.addEventListener('click', async () => {
    editState.bio = editDialog.querySelector('#edit-bio')?.value ?? editState.bio;
    editState.location = editDialog.querySelector('#edit-location')?.value ?? editState.location;
    editState.website = editDialog.querySelector('#edit-website')?.value ?? editState.website;
    editState.visibility = editDialog.querySelector('#edit-visibility')?.value ?? editState.visibility;
    await apiFetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(editState),
    });
    profile = await loadOwnProfile();
    editDialog.close();
    composer.refresh(elements);
  });
  editDialog.showModal();
}

editDialog.addEventListener('click', (e) => {
  if (e.target === editDialog) editDialog.close();
});

const mediaPopup = document.createElement('div');
mediaPopup.id = 'profile-media-popup';
mediaPopup.className = 'profile-media-popup';
mediaPopup.hidden = true;
mediaPopup.innerHTML = `
  <button class="profile-media-popup-remove btn-animated" type="button" id="media-popup-remove" aria-label="${i18n.t('ui.app.profile.photo_remove')}">✕</button>
  <button class="profile-media-popup-upload btn-animated" type="button" id="media-popup-upload" aria-label="${i18n.t('ui.app.profile.photo_set')}">⬆</button>
`;
document.body.appendChild(mediaPopup);

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

function openMediaPopup(e, target) {
  mediaPopupTarget = target;
  const rect = e.currentTarget.getBoundingClientRect();
  const popupWidth = 96;
  let left = rect.left;
  if (left + popupWidth > window.innerWidth - 8) left = window.innerWidth - popupWidth - 8;
  mediaPopup.style.top = `${rect.bottom + 8}px`;
  mediaPopup.style.left = `${Math.max(8, left)}px`;
  mediaPopup.hidden = false;
}

function closeMediaPopup() {
  mediaPopup.hidden = true;
  mediaPopupTarget = null;
}

document.addEventListener('click', (e) => {
  if (!mediaPopup.hidden && !mediaPopup.contains(e.target)) closeMediaPopup();
}, true);

mediaPopup.querySelector('#media-popup-remove')?.addEventListener('click', async () => {
  const target = mediaPopupTarget;
  closeMediaPopup();
  if (target === 'avatar') {
    await apiFetch('/api/v1/profile/avatar', { method: 'DELETE' });
    if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
    avatarBlobUrl = null;
  } else if (target === 'banner') {
    await apiFetch('/api/v1/profile/banner', { method: 'DELETE' });
    if (bannerBlobUrl) URL.revokeObjectURL(bannerBlobUrl);
    bannerBlobUrl = null;
  }
  profile = await loadOwnProfile();
  composer.refresh(elements);
});

mediaPopup.querySelector('#media-popup-upload')?.addEventListener('click', () => {
  const target = mediaPopupTarget;
  closeMediaPopup();
  if (target === 'avatar') avatarFileInput.click();
  else if (target === 'banner') bannerFileInput.click();
});

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
  const confirmed = window.confirm(i18n.t('ui.app.profile.delete_post_confirm'));
  if (!confirmed) return;
  const res = await apiFetch(`/api/v1/posts/${encodeURIComponent(postId)}`, { method: 'DELETE' });
  if (res.ok) {
    posts = await loadOwnPosts();
    composer.refresh(elements);
  }
}

function bindPageEvents() {
  root.querySelector('.profile-hero-edit-btn')?.addEventListener('click', openEditDialog);
  root.querySelector('.profile-hero-banner-btn')?.addEventListener('click', (e) => openMediaPopup(e, 'banner'));
  root.querySelector('.profile-hero-avatar-btn')?.addEventListener('click', (e) => openMediaPopup(e, 'avatar'));
  root.querySelector('#post-submit')?.addEventListener('click', doCreatePost);
  root.querySelectorAll('.post-delete-btn[data-post-id]').forEach((btn) => {
    btn.addEventListener('click', () => doDeletePost(btn.dataset.postId));
  });
}

const elements = [
  {
    id: 'hero',
    label: i18n.t('ui.app.profile.section.profile'),
    pinned: true,
    gridSize: { default: [4, 4], min: [2, 3], max: 'full' },
    render: renderHero,
  },
  {
    id: 'social',
    label: i18n.t('ui.app.profile.section.social'),
    pinned: true,
    gridSize: { default: [4, 3], min: [2, 2], max: 'full' },
    render: renderSocial,
  },
  {
    id: 'posts',
    label: i18n.t('ui.app.profile.section.posts'),
    pinned: true,
    gridSize: { default: [4, 4], min: [2, 2], max: 'full' },
    render: renderPosts,
  },
];

composer = createPageComposer(root, {
  allowCustomization: false,
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
