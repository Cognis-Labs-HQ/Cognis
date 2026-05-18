import type { IncomingMessage, ServerResponse } from "node:http";
import { hasMinRole } from "@cognis/core";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../../api/reuse/route-context.js";
import type {
    DbProfileStore,
    AccountProfile,
    Post,
    PostVisibility,
} from "../store.js";
import { visibilityRank } from "../store.js";
import { readJson } from "../../../../api/reuse/read-json.js";

const VALID_POST_VISIBILITY = new Set<PostVisibility>([
    "only_me",
    "private",
    "friends",
    "community",
]);

async function canViewPost(
    requesterId: string | null,
    requesterRole: string | null,
    post: Post,
    author: AccountProfile,
    profileStore: DbProfileStore,
): Promise<boolean> {
    if (requesterRole === "admin") return true;
    if (requesterId === post.accountId) return true;
    if (author.visibility === "hidden") return false;
    if (!requesterId) return false;

    if (author.visibility === "private" || author.visibility === "friends") {
        const [requesterFollowsAuthor, authorFollowsRequester] =
            await Promise.all([
                profileStore.isFollowing(requesterId, post.accountId),
                profileStore.isFollowing(post.accountId, requesterId),
            ]);
        if (post.visibility === "private") return requesterFollowsAuthor;
        if (post.visibility === "friends") {
            return requesterFollowsAuthor && authorFollowsRequester;
        }
        return false;
    }

    switch (post.visibility) {
        case "only_me":
            return false;
        case "private":
            return profileStore.isFollowing(requesterId, post.accountId);
        case "friends":
            return profileStore.isFollowing(requesterId, post.accountId);
        case "community":
            return true;
    }
}

export function createPostRoutes(
    profileStore: DbProfileStore,
    routeContext?: RouteContext,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (url.pathname === "/api/v1/posts" && req.method === "POST") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const profile = await profileStore.getProfile(claims.sub);
            if (!profile) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Profile required to post",
                        },
                    }),
                );
                return true;
            }
            const body = await readJson(req);
            const content = String(body.content ?? "").trim();
            if (!content) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: "content is required",
                        },
                    }),
                );
                return true;
            }
            const rawVisibility = String(body.visibility ?? "community");
            if (!VALID_POST_VISIBILITY.has(rawVisibility as PostVisibility)) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: `Invalid visibility: ${rawVisibility}`,
                        },
                    }),
                );
                return true;
            }
            const visibility = rawVisibility as PostVisibility;
            const maxAllowed: PostVisibility =
                profile.visibility === "hidden"
                    ? "only_me"
                    : visibilityRank(profile.visibility) >=
                        visibilityRank("community")
                      ? "community"
                      : "friends";
            if (
                postVisibilityRank(visibility) > postVisibilityRank(maxAllowed)
            ) {
                res.writeHead(400, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "bad_request",
                            message: `Visibility ${visibility} not allowed for your account visibility`,
                        },
                    }),
                );
                return true;
            }
            const post = await profileStore.createPost(claims.sub, {
                title:
                    body.title != null
                        ? String(body.title).trim() || undefined
                        : undefined,
                content,
                visibility,
            });
            res.writeHead(201, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: post }));
            return true;
        }

        if (url.pathname === "/api/v1/posts" && req.method === "GET") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const posts = await profileStore.getPostsByAccount(claims.sub);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: posts }));
            return true;
        }

        const deleteMatch = url.pathname.match(/^\/api\/v1\/posts\/([^/]+)$/);
        if (deleteMatch && req.method === "DELETE") {
            const claims = ctx.requireAuth(req, res, "user");
            if (!claims) return true;
            const postId = decodeURIComponent(deleteMatch[1]);
            const post = await profileStore.getPostById(postId);
            if (!post) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "Post not found" },
                    }),
                );
                return true;
            }
            if (
                post.accountId !== claims.sub &&
                !hasMinRole(claims.role, "moderator")
            ) {
                res.writeHead(403, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "forbidden",
                            message: "Cannot delete another user's post",
                        },
                    }),
                );
                return true;
            }
            await profileStore.deletePost(postId);
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: { deleted: true } }));
            return true;
        }

        const userPostsMatch = url.pathname.match(
            /^\/api\/v1\/users\/([^/]+)\/posts$/,
        );
        if (userPostsMatch && req.method === "GET") {
            const claims = ctx.getAuthClaims(req);
            if (!claims) {
                res.writeHead(401, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: {
                            code: "unauthorized",
                            message: "Login required",
                        },
                    }),
                );
                return true;
            }
            const handle = decodeURIComponent(userPostsMatch[1]);
            const author = await profileStore.getProfileByHandle(handle);
            if (!author) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            if (await profileStore.isBlocked(author.accountId, claims.sub)) {
                res.writeHead(404, { "content-type": "application/json" });
                res.end(
                    JSON.stringify({
                        error: { code: "not_found", message: "User not found" },
                    }),
                );
                return true;
            }
            const allPosts = await profileStore.getPostsByAccount(
                author.accountId,
            );
            const visible: Post[] = [];
            for (const post of allPosts) {
                if (
                    await canViewPost(
                        claims.sub,
                        claims.role,
                        post,
                        author,
                        profileStore,
                    )
                ) {
                    visible.push(post);
                }
            }
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ data: visible }));
            return true;
        }

        return false;
    };
}

function postVisibilityRank(v: PostVisibility): number {
    const ranks: Record<PostVisibility, number> = {
        only_me: 0,
        private: 1,
        friends: 2,
        community: 3,
    };
    return ranks[v] ?? 0;
}
