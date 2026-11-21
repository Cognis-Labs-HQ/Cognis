import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import {
    renderHero,
    renderNewPost,
    renderPosts,
    renderFollowers,
    renderFollowing,
} from "/static/adapters/social/profile/profile-render.js";
const finishLoading = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const i18n = await createI18n({
    componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
});
const own = new URL(location.href).searchParams.get("own") !== "false";
const root = document.querySelector("#app");
const lifetime = new AbortController();
const elements = [
    {
        id: "hero",
        gridSize: { default: [4, 7], min: [2, 4], max: "full" },
        render: () =>
            renderHero({
                profile: data.profile,
                bannerHeight: "full",
                bannerPanX: 50,
                bannerPanY: 50,
                isOwnProfile: own,
                relationship: {},
                posts: data.posts,
                followers: [],
                following: [],
                i18n,
            }),
    },
    {
        id: "followers",
        gridSize: { default: [2, 3], min: [2, 3], max: "half" },
        render: () => renderFollowers({ followers: [], i18n }),
    },
    {
        id: "following",
        gridSize: { default: [2, 3], min: [2, 3], max: "half" },
        render: () => renderFollowing({ following: [], i18n }),
    },
    ...(own
        ? [
              {
                  id: "posts-new",
                  gridSize: { default: [4, 4], min: [2, 3], max: "full" },
                  render: () => renderNewPost({ profile: data.profile, i18n }),
              },
          ]
        : []),
    {
        id: "posts",
        gridSize: { default: [4, 6], min: [2, 4], max: "full" },
        render: () =>
            renderPosts({ posts: data.posts, isOwnProfile: own, i18n }),
    },
];
const composer = createPageComposer(root, {
    elements,
    i18n,
    signal: lifetime.signal,
    allowCustomization: false,
    requireAccountSession: false,
    enableAccountEnhancements: false,
    preferenceKey: "profile-responsive",
    stackAt: "medium",
    readingOrder: ["hero", "posts-new", "posts", "followers", "following"],
});
await composer.init();
finishLoading();
window.fixture = { composer, lifetime };
