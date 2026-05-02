import { apiFetch } from '../../reuse/api-client.js';
import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { createPageComposer } from '../../reuse/page-composer.js';
import { createUnsavedChangesBar } from '../../reuse/unsaved-changes.js';

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

let changesBar;
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

function renderVisibilityBadge(v) {
  return `<span class="visibility-badge ${visibilityClass(v)}">${i18n.t(`ui.app.profile.visibility.${v}`)}</span>`;
}

function renderAvatarImg(blobUrl) {
  if (blobUrl) {
    return `<img src="${escapeHtml(blobUrl)}" class="profile-avatar-img" alt="${i18n.t('ui.layout.avatar.alt')}" />`;
  }
  return `<span class="profile-avatar-placeholder" aria-hidden="true">👤</span>`;
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

function renderPostsList() {
  if (!posts.length) return `<p class="profile-empty">${i18n.t('ui.app.profile.no_posts')}</p>`;
  return `
    <ul class="profile-post-list">
      ${posts.map((p) => `
        <li class="profile-post-card" data-post-id="${escapeHtml(p.id)}">
          <div class="profile-post-header">
            ${p.title ? `<strong class="profile-post-title">${escapeHtml(p.title)}</strong>` : ''}
            <span class="visibility-badge ${visibilityClass(p.visibility ?? 'community')}">${escapeHtml(p.visibility ?? '')}</span>
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

function bindProfileEdit() {
  const bioEl = root.querySelector('#profile-bio');
  const locationEl = root.querySelector('#profile-location');
  const websiteEl = root.querySelector('#profile-website');
  const visibilityEl = root.querySelector('#profile-visibility');

  if (bioEl) {
    bioEl.addEventListener('input', () => {
      editState.bio = bioEl.value;
      changesBar?.markDirty('profile', true);
    });
  }

  if (locationEl) {
    locationEl.addEventListener('input', () => {
      editState.location = locationEl.value;
      changesBar?.markDirty('profile', true);
    });
  }

  if (websiteEl) {
    websiteEl.addEventListener('input', () => {
      editState.website = websiteEl.value;
      changesBar?.markDirty('profile', true);
    });
  }

  if (visibilityEl) {
    visibilityEl.addEventListener('change', () => {
      editState.visibility = visibilityEl.value;
      changesBar?.markDirty('profile', true);
    });
  }
}

async function doAvatarUpload(file) {
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
}

async function doAvatarRemove() {
  await apiFetch('/api/v1/profile/avatar', { method: 'DELETE' });
  if (avatarBlobUrl) URL.revokeObjectURL(avatarBlobUrl);
  avatarBlobUrl = null;
  profile = await loadOwnProfile();
  composer.refresh(elements);
}

async function doBannerUpload(file) {
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
}

async function doBannerRemove() {
  await apiFetch('/api/v1/profile/banner', { method: 'DELETE' });
  if (bannerBlobUrl) URL.revokeObjectURL(bannerBlobUrl);
  bannerBlobUrl = null;
  profile = await loadOwnProfile();
  composer.refresh(elements);
}

function bindMediaUploads() {
  const avatarInput = root.querySelector('#avatar-upload');
  const avatarBtn = root.querySelector('#avatar-upload-btn');
  const avatarRemoveBtn = root.querySelector('#avatar-remove-btn');
  const bannerInput = root.querySelector('#banner-upload');
  const bannerBtn = root.querySelector('#banner-upload-btn');
  const bannerRemoveBtn = root.querySelector('#banner-remove-btn');

  avatarBtn?.addEventListener('click', () => avatarInput?.click());
  avatarInput?.addEventListener('change', () => {
    const file = avatarInput.files?.[0];
    if (file) doAvatarUpload(file);
  });
  avatarRemoveBtn?.addEventListener('click', doAvatarRemove);

  bannerBtn?.addEventListener('click', () => bannerInput?.click());
  bannerInput?.addEventListener('change', () => {
    const file = bannerInput.files?.[0];
    if (file) doBannerUpload(file);
  });
  bannerRemoveBtn?.addEventListener('click', doBannerRemove);
}

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

function bindNewPost() {
  root.querySelector('#post-submit')?.addEventListener('click', doCreatePost);
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

function bindPostDeletes() {
  root.querySelectorAll('.post-delete-btn[data-post-id]').forEach((btn) => {
    btn.addEventListener('click', () => doDeletePost(btn.dataset.postId));
  });
}

const elements = [
  {
    id: 'profile-info',
    label: i18n.t('ui.app.profile.section.profile'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'profile-info-layout',
      heading: i18n.t('ui.app.profile.section.profile'),
      elements: [
        {
          id: 'profile-card',
          label: i18n.t('ui.app.profile.section.profile'),
          pinned: true,
          render: () => `
            <div class="profile-banner-wrap">
              ${bannerBlobUrl
                ? `<img src="${escapeHtml(bannerBlobUrl)}" class="profile-banner-img" alt="" />`
                : `<div class="profile-banner-placeholder"></div>`
              }
            </div>
            <div class="profile-identity">
              <div class="profile-avatar-wrap">
                ${renderAvatarImg(avatarBlobUrl)}
              </div>
              <div class="profile-handle-row">
                <strong class="profile-handle">@${escapeHtml(profile?.handle ?? '')}</strong>
                ${profile?.role ? `<span class="profile-role-badge">${escapeHtml(profile.role)}</span>` : ''}
                ${renderVisibilityBadge(profile?.visibility ?? 'hidden')}
              </div>
              ${profile?.createdAt
                ? `<p class="profile-member-since">${i18n.t('ui.app.profile.member_since')} ${formatDate(profile.createdAt)}</p>`
                : ''
              }
            </div>
          `,
        },
        {
          id: 'profile-edit',
          label: i18n.t('ui.app.profile.section.profile'),
          pinned: true,
          render: () => `
            <div class="profile-edit-form">
              <label class="profile-field-label">
                ${i18n.t('ui.app.profile.bio')}
                <textarea id="profile-bio" class="profile-field-input" rows="3">${escapeHtml(editState.bio)}</textarea>
              </label>
              <label class="profile-field-label">
                ${i18n.t('ui.app.profile.location')}
                <input type="text" id="profile-location" class="profile-field-input" value="${escapeHtml(editState.location)}" />
              </label>
              <label class="profile-field-label">
                ${i18n.t('ui.app.profile.website')}
                <input type="url" id="profile-website" class="profile-field-input" value="${escapeHtml(editState.website)}" />
              </label>
              <label class="profile-field-label">
                ${i18n.t('ui.app.profile.visibility')}
                <select id="profile-visibility" class="profile-field-input">
                  ${['hidden', 'private', 'friends', 'community'].map((v) =>
                    `<option value="${v}"${editState.visibility === v ? ' selected' : ''}>${i18n.t(`ui.app.profile.visibility.${v}`)}</option>`
                  ).join('')}
                </select>
              </label>
            </div>
          `,
        },
        {
          id: 'profile-media',
          label: i18n.t('ui.app.profile.avatar'),
          pinned: true,
          render: () => `
            <div class="profile-media-row">
              <div class="profile-media-item">
                <h4>${i18n.t('ui.app.profile.avatar')}</h4>
                <input type="file" id="avatar-upload" accept="image/jpeg,image/png,image/webp" hidden />
                <button type="button" id="avatar-upload-btn" class="btn-confirm btn-animated">
                  ${i18n.t('ui.app.profile.upload_avatar')}
                </button>
                ${profile?.avatarKey
                  ? `<button type="button" id="avatar-remove-btn" class="btn-cancel btn-animated">
                      ${i18n.t('ui.app.profile.remove_avatar')}
                    </button>`
                  : ''
                }
              </div>
              <div class="profile-media-item">
                <h4>${i18n.t('ui.app.profile.banner')}</h4>
                <input type="file" id="banner-upload" accept="image/jpeg,image/png,image/webp,image/gif" hidden />
                <button type="button" id="banner-upload-btn" class="btn-confirm btn-animated">
                  ${i18n.t('ui.app.profile.upload_banner')}
                </button>
                ${profile?.bannerKey
                  ? `<button type="button" id="banner-remove-btn" class="btn-cancel btn-animated">
                      ${i18n.t('ui.app.profile.remove_banner')}
                    </button>`
                  : ''
                }
              </div>
            </div>
          `,
        },
      ],
      onRender: () => {
        bindProfileEdit();
        bindMediaUploads();
      },
    },
  },
  {
    id: 'social',
    label: i18n.t('ui.app.profile.section.social'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'profile-social-layout',
      columns: 2,
      heading: i18n.t('ui.app.profile.section.social'),
      elements: [
        {
          id: 'followers',
          label: i18n.t('ui.app.profile.followers'),
          pinned: true,
          render: () => `
            <h3>${i18n.t('ui.app.profile.followers')}
              <span class="profile-count-badge">${followers.length}</span>
            </h3>
            ${renderUserList(followers, 'ui.app.profile.no_followers')}
          `,
        },
        {
          id: 'following',
          label: i18n.t('ui.app.profile.following'),
          pinned: true,
          render: () => `
            <h3>${i18n.t('ui.app.profile.following')}
              <span class="profile-count-badge">${following.length}</span>
            </h3>
            ${renderUserList(following, 'ui.app.profile.no_following')}
          `,
        },
      ],
      onRender: () => {},
    },
  },
  {
    id: 'posts',
    label: i18n.t('ui.app.profile.section.posts'),
    subComposerOptions: {
      allowCustomization: false,
      preferenceKey: 'profile-posts-layout',
      heading: i18n.t('ui.app.profile.section.posts'),
      elements: [
        {
          id: 'new-post',
          label: i18n.t('ui.app.profile.new_post'),
          pinned: true,
          render: () => `
            <h3>${i18n.t('ui.app.profile.new_post')}</h3>
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
          `,
        },
        {
          id: 'my-posts',
          label: i18n.t('ui.app.profile.section.posts'),
          pinned: true,
          render: () => `
            <h3>${i18n.t('ui.app.profile.section.posts')}
              <span class="profile-count-badge">${posts.length}</span>
            </h3>
            ${renderPostsList()}
          `,
        },
      ],
      onRender: () => {
        bindNewPost();
        bindPostDeletes();
      },
    },
  },
];

composer = createPageComposer(root, {
  allowCustomization: false,
  subPageNavigation: true,
  elements,
  preferenceKey: 'profile-layout',
  i18n,
  pageContext: {
    title: i18n.t('ui.app.profile.page_title'),
    subtitle: i18n.t('ui.app.profile.page_subtitle'),
  },
  toolbar: [
    {
      id: 'profile-nav',
      label: i18n.t('ui.app.profile.page_title'),
      render: () => `
        <h2>${i18n.t('ui.app.profile.page_title')}</h2>
        <ul>
          <li><button data-composer-scroll="profile-info">${i18n.t('ui.app.profile.section.profile')}</button></li>
          <li><button data-composer-scroll="social">${i18n.t('ui.app.profile.section.social')}</button></li>
          <li><button data-composer-scroll="posts">${i18n.t('ui.app.profile.section.posts')}</button></li>
        </ul>
      `,
    },
  ],
  floatingMenu: [
    {
      id: 'profile-changes-bar',
      label: i18n.t('ui.reuse.unsaved_changes'),
      render: () => `
        <span>${i18n.t('ui.reuse.unsaved_changes')}</span>
        <button class="btn-cancel btn-animated" type="button" data-action="discard">
          ${i18n.t('ui.reuse.generic.discard')}
        </button>
        <button class="btn-confirm btn-animated" type="button" data-action="save">
          ${i18n.t('ui.reuse.generic.save')}
        </button>
      `,
    },
  ],
});

await composer.init();

const floatingSlot = composer.getFloatingSlot('profile-changes-bar');

changesBar = createUnsavedChangesBar(floatingSlot, {
  onSave: async () => {
    await apiFetch('/api/v1/profile', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(editState),
    });
    profile = await loadOwnProfile();
    composer.refresh(elements);
    changesBar.markDirty('profile', false);
  },
  onDiscard: () => {
    editState = {
      bio: profile?.bio ?? '',
      location: profile?.location ?? '',
      website: profile?.website ?? '',
      visibility: profile?.visibility ?? 'hidden',
    };
    composer.refresh(elements);
  },
});
