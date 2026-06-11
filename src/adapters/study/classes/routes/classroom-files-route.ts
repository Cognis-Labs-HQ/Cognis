import type { IncomingMessage, ServerResponse } from "node:http";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";

interface FileGatewayLike {
    list(
        prefix?: string,
    ): Promise<Array<{ key: string; size: number; lastModified: Date }>>;
}

export async function handleClassroomFilesRoutes({
    req,
    res,
    url,
    ctx,
    store,
}: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    store: DbClassesStore;
}): Promise<boolean> {
    const notepadFilesMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notepad-files$/,
    );
    if (notepadFilesMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notepadFilesMatch[1]);
        const classRow = await store.getClassById(classId);
        if (!classRow) {
            jsonError(res, 404, "not_found", "Class not found.");
            return true;
        }
        try {
            await store.getClassMembersForViewer(classId, claims.sub);
        } catch {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const fileGateway = ctx.getCapability<FileGatewayLike>("file:gateway");
        if (!fileGateway) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "File storage is unavailable.",
            );
            return true;
        }
        const prefix = `classroom-notes/${encodeURIComponent(classId)}/`;
        const files = await fileGateway.list(prefix).catch(() => []);
        jsonOk(
            res,
            files.map((file) => ({
                key: file.key,
                size: file.size,
                lastModified: file.lastModified,
            })),
        );
        return true;
    }

    return false;
}
