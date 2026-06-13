import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";

interface FileGatewayLike {
    get(key: string): Promise<Uint8Array | null>;
    put(
        key: string,
        content: Uint8Array,
        contentType?: string,
    ): Promise<{ key: string; contentType?: string }>;
    delete(key: string): Promise<boolean>;
    list(prefix?: string): Promise<
        Array<{
            key: string;
            size: number;
            contentType?: string;
            lastModified: Date;
        }>
    >;
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
    const materialLibraryMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/materials\/library$/,
    );
    if (materialLibraryMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(materialLibraryMatch[1]);
        const classRow = await store.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== claims.sub) {
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
        const prefix = `teacher-materials/${encodeURIComponent(claims.sub)}/`;
        const files = await fileGateway.list(prefix).catch(() => []);
        jsonOk(
            res,
            files.map((file) => ({
                key: file.key,
                size: file.size,
                contentType: file.contentType,
                name: decodeURIComponent(file.key.split("/").pop() ?? file.key),
                lastModified: file.lastModified,
            })),
        );
        return true;
    }

    const materialRenameMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/materials\/library\/rename$/,
    );
    if (materialRenameMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(materialRenameMatch[1]);
        const classRow = await store.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== claims.sub) {
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
        const body = (await readJson(req)) as { key?: unknown; name?: unknown };
        const sourceKey = String(body?.key ?? "").trim();
        if (!sourceKey) {
            jsonError(res, 400, "bad_request", "key is required.");
            return true;
        }
        const sourceParts = sourceKey.split("/");
        const sourceName = decodeURIComponent(
            sourceParts[sourceParts.length - 1] ?? "",
        );
        const extensionStart = sourceName.lastIndexOf(".");
        const extension =
            extensionStart >= 0 ? sourceName.slice(extensionStart) : "";
        const nextNameBase =
            String(body?.name ?? "").trim() ||
            `${sourceName.replace(extension, "")}-renamed`;
        const nextName = `${nextNameBase}${extension}`;
        const targetPrefix = sourceParts.slice(0, -1).join("/");
        const targetKey = `${targetPrefix}/${encodeURIComponent(nextName)}`;
        const content = await fileGateway.get(sourceKey).catch(() => null);
        if (!content) {
            jsonError(res, 404, "not_found", "File not found.");
            return true;
        }
        await fileGateway
            .put(targetKey, content)
            .then(async () => {
                await fileGateway.delete(sourceKey);
            })
            .catch(() => null);
        const teacherClasses = await store.getClassesForTeacher(claims.sub);
        await Promise.all(
            teacherClasses.map(async (teacherClass) => {
                const resources = await store.getClassroomResourcesForViewer(
                    teacherClass.id,
                    claims.sub,
                );
                const nextFiles = resources.files.map((file) =>
                    String(file.key ?? "").trim() === sourceKey
                        ? { ...file, key: targetKey, name: nextName }
                        : file,
                );
                if (
                    nextFiles.some(
                        (file) => String(file.key ?? "").trim() === targetKey,
                    )
                ) {
                    await store.updateClassroomResourcesForTeacher(
                        teacherClass.id,
                        claims.sub,
                        { files: nextFiles },
                    );
                }
            }),
        );
        jsonOk(res, { key: targetKey, name: nextName });
        return true;
    }

    const materialDeleteMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/materials\/library\/delete$/,
    );
    if (materialDeleteMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(materialDeleteMatch[1]);
        const classRow = await store.getClassById(classId);
        if (!classRow || classRow.teacherAccountId !== claims.sub) {
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
        const body = (await readJson(req)) as { key?: unknown };
        const key = String(body?.key ?? "").trim();
        if (!key) {
            jsonError(res, 400, "bad_request", "key is required.");
            return true;
        }
        await fileGateway.delete(key).catch(() => null);
        const teacherClasses = await store.getClassesForTeacher(claims.sub);
        await Promise.all(
            teacherClasses.map(async (teacherClass) => {
                const resources = await store.getClassroomResourcesForViewer(
                    teacherClass.id,
                    claims.sub,
                );
                const nextFiles = resources.files.filter(
                    (file) => String(file.key ?? "").trim() !== key,
                );
                if (nextFiles.length !== resources.files.length) {
                    await store.updateClassroomResourcesForTeacher(
                        teacherClass.id,
                        claims.sub,
                        { files: nextFiles },
                    );
                }
            }),
        );
        jsonOk(res, { deleted: true });
        return true;
    }

    return false;
}
