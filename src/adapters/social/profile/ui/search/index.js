import { apiFetch } from "/static/reuse/api-client.js";
import { createUserContentSearchItem } from "/static/reuse/search-index.js";
import { registerSearchIndex } from "/static/reuse/search-bar.js";
import { formatDate } from "/static/reuse/timestamp.js";

export const componentSearchId = "social-profile";

function postAuthorLabel(post) {
    return (
        post.author?.displayName ||
        post.author?.handle ||
        post.authorHandle ||
        post.accountId ||
        "Post"
    );
}

function postUrl(post) {
    const handle = post.author?.handle || post.authorHandle || "";
    const profilePath = handle
        ? `/profile/${encodeURIComponent(handle)}`
        : "/profile";
    return `${profilePath}#post-${encodeURIComponent(post.id)}`;
}

export async function buildSearchResults({ query = "" } = {}) {
    const response = await apiFetch(
        `/api/v1/social/posts?scope=visible&q=${encodeURIComponent(query)}`,
    );
    if (!response.ok) return [];
    const payload = await response.json().catch(() => null);
    const posts = Array.isArray(payload?.data) ? payload.data : [];
    const items = posts.map((post) => {
        const author = postAuthorLabel(post);
        const timeLabel = formatDate(post.createdAt, "");
        return createUserContentSearchItem({
            id: `post:${post.id}`,
            label: post.title || author,
            context: author,
            timestamp: timeLabel,
            url: postUrl(post),
            resultClass: "text",
            category: "Posts",
            content: post.content,
        });
    });
    return items.length ? [{ category: "Posts", items }] : [];
}

export function registerSearchIndexing() {
    return registerSearchIndex("global-posts", buildSearchResults, {
        componentId: componentSearchId,
    });
}
