import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";
import type { FileStorageGateway } from "../../../../core/contracts/files-gateway.js";

interface MaterialLibraryMetadataEntry {
    name: string;
    contentType?: string;
}

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function buildTeacherMaterialsPrefix(teacherAccountId: string) {
    return `teacher-materials/${encodeURIComponent(teacherAccountId)}/`;
}

function buildTeacherMaterialsMetadataKey(teacherAccountId: string) {
    return `${buildTeacherMaterialsPrefix(teacherAccountId)}.library-metadata.json`;
}

function dedupeFileRefs(
    files: Array<{ key: string; name: string; contentType?: string }>,
) {
    const fileRefsByKey = new Map<
        string,
        { key: string; name: string; contentType?: string }
    >();
    for (const fileRef of files) {
        const fileKey = String(fileRef?.key ?? "").trim();
        const fileName = String(fileRef?.name ?? "").trim();
        if (!fileKey || !fileName) {
            continue;
        }
        fileRefsByKey.set(fileKey, {
            key: fileKey,
            name: fileName,
            contentType: String(fileRef?.contentType ?? "").trim() || undefined,
        });
    }
    return [...fileRefsByKey.values()];
}

async function readTeacherMaterialsMetadata(
    fileGateway: FileStorageGateway,
    teacherAccountId: string,
) {
    const metadataKey = buildTeacherMaterialsMetadataKey(teacherAccountId);
    const metadataContent = await fileGateway
        .get(metadataKey)
        .catch(() => null);
    if (!metadataContent) {
        return {} as Record<string, MaterialLibraryMetadataEntry>;
    }
    const parsed = JSON.parse(textDecoder.decode(metadataContent)) as Record<
        string,
        MaterialLibraryMetadataEntry
    >;
    if (!parsed || typeof parsed !== "object") {
        return {};
    }
    return Object.fromEntries(
        Object.entries(parsed).flatMap(([key, value]) => {
            const normalizedKey = String(key ?? "").trim();
            const normalizedName = String(value?.name ?? "").trim();
            if (!normalizedKey || !normalizedName) {
                return [];
            }
            return [
                [
                    normalizedKey,
                    {
                        name: normalizedName,
                        contentType:
                            String(value?.contentType ?? "").trim() ||
                            undefined,
                    },
                ],
            ];
        }),
    );
}

async function writeTeacherMaterialsMetadata(
    fileGateway: FileStorageGateway,
    teacherAccountId: string,
    metadataEntries: Record<string, MaterialLibraryMetadataEntry>,
) {
    const metadataKey = buildTeacherMaterialsMetadataKey(teacherAccountId);
    const normalizedEntries = Object.fromEntries(
        Object.entries(metadataEntries).flatMap(([key, value]) => {
            const normalizedKey = String(key ?? "").trim();
            const normalizedName = String(value?.name ?? "").trim();
            if (!normalizedKey || !normalizedName) {
                return [];
            }
            return [
                [
                    normalizedKey,
                    {
                        name: normalizedName,
                        contentType:
                            String(value?.contentType ?? "").trim() ||
                            undefined,
                    },
                ],
            ];
        }),
    );
    if (!Object.keys(normalizedEntries).length) {
        await fileGateway.delete(metadataKey).catch(() => null);
        return;
    }
    await fileGateway.put(
        metadataKey,
        textEncoder.encode(JSON.stringify(normalizedEntries)),
        "application/json",
    );
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
        const fileGateway =
            ctx.getCapability<FileStorageGateway>("file:gateway");
        if (!fileGateway) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "File storage is unavailable.",
            );
            return true;
        }
        const prefix = buildTeacherMaterialsPrefix(claims.sub);
        const metadataByKey = await readTeacherMaterialsMetadata(
            fileGateway,
            claims.sub,
        );
        const metadataKey = buildTeacherMaterialsMetadataKey(claims.sub);
        const files = await fileGateway.list(prefix).catch(() => []);
        jsonOk(
            res,
            files
                .filter((file) => file.key !== metadataKey)
                .map((file) => ({
                    key: file.key,
                    size: file.size,
                    contentType:
                        metadataByKey[file.key]?.contentType ??
                        file.contentType,
                    name:
                        metadataByKey[file.key]?.name ??
                        decodeURIComponent(
                            file.key.split("/").pop() ?? file.key,
                        ),
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
        const fileGateway =
            ctx.getCapability<FileStorageGateway>("file:gateway");
        if (!fileGateway) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "File storage is unavailable.",
            );
            return true;
        }
        const body = (await readJson(req)) as {
            key?: unknown;
            name?: unknown;
            contentType?: unknown;
        };
        const sourceKey = String(body?.key ?? "").trim();
        const materialsPrefix = buildTeacherMaterialsPrefix(claims.sub);
        if (!sourceKey) {
            jsonError(res, 400, "bad_request", "key is required.");
            return true;
        }
        if (!sourceKey.startsWith(materialsPrefix)) {
            jsonError(res, 403, "forbidden", "Access denied.");
            return true;
        }
        const sourceName = decodeURIComponent(
            sourceKey.split("/").pop() ?? sourceKey,
        );
        const nextName = String(body?.name ?? "").trim() || sourceName;
        const nextContentType =
            String(body?.contentType ?? "").trim() || undefined;
        const metadataByKey = await readTeacherMaterialsMetadata(
            fileGateway,
            claims.sub,
        );
        metadataByKey[sourceKey] = {
            name: nextName,
            contentType:
                nextContentType ?? metadataByKey[sourceKey]?.contentType,
        };
        await writeTeacherMaterialsMetadata(
            fileGateway,
            claims.sub,
            metadataByKey,
        );
        const teacherClasses = await store.getClassesForTeacher(claims.sub);
        await Promise.all(
            teacherClasses.map(async (teacherClass) => {
                const resources = await store.getClassroomResourcesForViewer(
                    teacherClass.id,
                    claims.sub,
                );
                const nextFiles = dedupeFileRefs(
                    resources.files.map((file) =>
                        String(file.key ?? "").trim() === sourceKey
                            ? {
                                  ...file,
                                  name: nextName,
                                  contentType:
                                      nextContentType ?? file.contentType,
                              }
                            : file,
                    ),
                );
                if (
                    nextFiles.some(
                        (file) => String(file.key ?? "").trim() === sourceKey,
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
        jsonOk(res, {
            key: sourceKey,
            name: nextName,
            contentType: nextContentType,
        });
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
        const fileGateway =
            ctx.getCapability<FileStorageGateway>("file:gateway");
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
        const materialsPrefix = buildTeacherMaterialsPrefix(claims.sub);
        if (!key) {
            jsonError(res, 400, "bad_request", "key is required.");
            return true;
        }
        if (!key.startsWith(materialsPrefix)) {
            jsonError(res, 403, "forbidden", "Access denied.");
            return true;
        }
        await fileGateway.delete(key).catch(() => null);
        const metadataByKey = await readTeacherMaterialsMetadata(
            fileGateway,
            claims.sub,
        );
        delete metadataByKey[key];
        await writeTeacherMaterialsMetadata(
            fileGateway,
            claims.sub,
            metadataByKey,
        );
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
                        { files: dedupeFileRefs(nextFiles) },
                    );
                }
            }),
        );
        jsonOk(res, { deleted: true });
        return true;
    }

    const materialFileMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/materials\/files\/(.+)$/,
    );
    if (materialFileMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(materialFileMatch[1]);
        const fileKey = materialFileMatch[2];
        const fileGateway =
            ctx.getCapability<FileStorageGateway>("file:gateway");
        if (!fileGateway) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "File storage is unavailable.",
            );
            return true;
        }
        let resources: Awaited<
            ReturnType<typeof store.getClassroomResourcesForViewer>
        >;
        try {
            resources = await store.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
        } catch {
            jsonError(res, 403, "not_authorized", "Access denied.");
            return true;
        }
        const fileRef = resources.files.find(
            (file) => String(file.key ?? "").trim() === fileKey,
        );
        if (!fileRef) {
            jsonError(res, 404, "not_found", "File not found.");
            return true;
        }
        const content = await fileGateway.get(fileKey).catch(() => null);
        if (!content) {
            jsonError(res, 404, "not_found", "File not found.");
            return true;
        }
        const contentType =
            String(fileRef.contentType ?? "").trim() ||
            "application/octet-stream";
        res.writeHead(200, { "Content-Type": contentType });
        res.end(content);
        return true;
    }

    return false;
}
