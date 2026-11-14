import { formatDate } from "/static/reuse/timestamp.js";
import { registerSearchIndex } from "/static/reuse/search-util/popup.js";

export function collectProfilePostSearchGroups({
    posts,
    profile,
    urlHandle,
    pathname,
    search,
}) {
    const items = (posts ?? []).map((post) => {
        const author = profile?.displayName || profile?.handle || urlHandle;
        const timeLabel = formatDate(post.createdAt, "");
        return {
            id: `post:${post.id}`,
            label: post.title || author || "Post",
            description: [author, timeLabel].filter(Boolean).join(" — "),
            url: `${pathname}${search}#post-${encodeURIComponent(post.id)}`,
            resultClass: "text",
            searchText: [post.title, post.content, author, timeLabel]
                .filter(Boolean)
                .join(" "),
            visible: true,
        };
    });
    return items.length ? [{ category: "Posts", items }] : [];
}

export function registerProfilePostSearchIndex(readState) {
    registerSearchIndex("profile-posts", () => {
        const state = readState();
        return collectProfilePostSearchGroups({
            ...state,
            pathname: window.location.pathname,
            search: window.location.search,
        });
    });
}
