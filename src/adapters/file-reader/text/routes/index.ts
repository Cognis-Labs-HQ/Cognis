import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";

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

interface ClassroomSnapshot {
    id?: string;
    name?: string;
    content?: string;
    updatedAt?: string;
}

interface ClassroomResources {
    agendaDocument: string;
    agendaSnapshots: ClassroomSnapshot[];
    updatedAt: string;
    updatedBy: string;
}

interface ClassroomResourcesCapability {
    classExists(classId: string): Promise<boolean>;
    canViewClassroomResources(
        classId: string,
        accountId: string,
    ): Promise<boolean>;
    isClassTeacher(classId: string, accountId: string): Promise<boolean>;
    getClassroomResourcesForViewer(
        classId: string,
        accountId: string,
    ): Promise<ClassroomResources>;
    updateClassroomResourcesForTeacher(
        classId: string,
        accountId: string,
        updates: {
            agendaDocument?: string;
            agendaSnapshots?: ClassroomSnapshot[];
        },
    ): Promise<ClassroomResources>;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;

function getResourcesCapability(
    ctx: RouteContext,
): ClassroomResourcesCapability | null {
    return (
        ctx.getCapability<ClassroomResourcesCapability>(
            "study:classes:resources",
        ) ?? null
    );
}

function getFileGateway(ctx: RouteContext): FileGatewayLike | null {
    return ctx.getCapability<FileGatewayLike>("file:gateway") ?? null;
}

function resolveMaxFileBytes(getMaxFileBytes?: () => number): number {
    const candidate = Number(getMaxFileBytes?.() ?? DEFAULT_MAX_FILE_BYTES);
    if (!Number.isFinite(candidate) || candidate <= 0) {
        return DEFAULT_MAX_FILE_BYTES;
    }
    return Math.floor(candidate);
}

async function validateViewerAccess({
    capability,
    classId,
    accountId,
}: {
    capability: ClassroomResourcesCapability;
    classId: string;
    accountId: string;
}): Promise<"ok" | "not_found" | "forbidden"> {
    const exists = await capability.classExists(classId);
    if (!exists) return "not_found";
    const canView = await capability.canViewClassroomResources(
        classId,
        accountId,
    );
    return canView ? "ok" : "forbidden";
}

export async function handleClassroomNotepadRoutes({
    req,
    res,
    url,
    ctx,
    getMaxFileBytes,
}: {
    req: IncomingMessage;
    res: ServerResponse;
    url: URL;
    ctx: RouteContext;
    getMaxFileBytes?: () => number;
}): Promise<boolean> {
    const resourcesCapability = getResourcesCapability(ctx);
    if (!resourcesCapability) {
        return false;
    }

    const agendaMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda$/,
    );
    if (agendaMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(agendaMatch[1]);
        const access = await validateViewerAccess({
            capability: resourcesCapability,
            classId,
            accountId: claims.sub,
        });
        if (access === "not_found") {
            jsonError(res, 404, "not_found", "Class not found.");
            return true;
        }
        if (access === "forbidden") {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const resources =
            await resourcesCapability.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
        jsonOk(res, {
            document: resources.agendaDocument,
            snapshots: resources.agendaSnapshots,
            updatedAt: resources.updatedAt,
            updatedBy: resources.updatedBy,
        });
        return true;
    }

    if (agendaMatch && req.method === "PUT") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(agendaMatch[1]);
        const isTeacher = await resourcesCapability.isClassTeacher(
            classId,
            claims.sub,
        );
        if (!isTeacher) {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const body = (await readJson(req)) as { document?: unknown };
        const nextDocument = String(body?.document ?? "");
        if (
            Buffer.byteLength(nextDocument, "utf8") >
            resolveMaxFileBytes(getMaxFileBytes)
        ) {
            jsonError(
                res,
                413,
                "payload_too_large",
                "Agenda document exceeds the configured file-size limit.",
            );
            return true;
        }
        const resources =
            await resourcesCapability.updateClassroomResourcesForTeacher(
                classId,
                claims.sub,
                {
                    agendaDocument: nextDocument,
                },
            );
        jsonOk(res, {
            document: resources.agendaDocument,
            snapshots: resources.agendaSnapshots,
            updatedAt: resources.updatedAt,
            updatedBy: resources.updatedBy,
        });
        return true;
    }

    const snapshotCreateMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda\/snapshots$/,
    );
    if (snapshotCreateMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(snapshotCreateMatch[1]);
        const isTeacher = await resourcesCapability.isClassTeacher(
            classId,
            claims.sub,
        );
        if (!isTeacher) {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const body = (await readJson(req)) as {
            name?: unknown;
            document?: unknown;
        };
        const resources =
            await resourcesCapability.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
        const snapshotDocument =
            body?.document == null
                ? resources.agendaDocument
                : String(body.document);
        if (
            Buffer.byteLength(snapshotDocument, "utf8") >
            resolveMaxFileBytes(getMaxFileBytes)
        ) {
            jsonError(
                res,
                413,
                "payload_too_large",
                "Agenda document exceeds the configured file-size limit.",
            );
            return true;
        }
        const snapshot = {
            id: randomUUID(),
            name: String(body?.name ?? "").trim() || new Date().toISOString(),
            content: snapshotDocument,
            updatedAt: new Date().toISOString(),
        };
        const updated =
            await resourcesCapability.updateClassroomResourcesForTeacher(
                classId,
                claims.sub,
                {
                    agendaDocument: snapshotDocument,
                    agendaSnapshots: [...resources.agendaSnapshots, snapshot],
                },
            );
        jsonOk(res, {
            document: updated.agendaDocument,
            snapshots: updated.agendaSnapshots,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
        });
        return true;
    }

    const openSnapshotMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda\/open$/,
    );
    if (openSnapshotMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(openSnapshotMatch[1]);
        const isTeacher = await resourcesCapability.isClassTeacher(
            classId,
            claims.sub,
        );
        if (!isTeacher) {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const body = (await readJson(req)) as { snapshotId?: unknown };
        const snapshotId = String(body?.snapshotId ?? "").trim();
        if (!snapshotId) {
            jsonError(res, 400, "bad_request", "snapshotId is required.");
            return true;
        }
        const resources =
            await resourcesCapability.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
        const snapshot = resources.agendaSnapshots.find(
            (entry) => String(entry.id ?? "").trim() === snapshotId,
        );
        if (!snapshot) {
            jsonError(res, 404, "not_found", "Snapshot not found.");
            return true;
        }
        const updated =
            await resourcesCapability.updateClassroomResourcesForTeacher(
                classId,
                claims.sub,
                {
                    agendaDocument: String(snapshot.content ?? ""),
                },
            );
        jsonOk(res, {
            document: updated.agendaDocument,
            snapshots: updated.agendaSnapshots,
            updatedAt: updated.updatedAt,
            updatedBy: updated.updatedBy,
        });
        return true;
    }

    const snapshotMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda\/snapshots\/([^/]+)$/,
    );
    if (snapshotMatch && req.method === "DELETE") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(snapshotMatch[1]);
        const snapshotId = decodeURIComponent(snapshotMatch[2]);
        const isTeacher = await resourcesCapability.isClassTeacher(
            classId,
            claims.sub,
        );
        if (!isTeacher) {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const resources =
            await resourcesCapability.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
        const remaining = resources.agendaSnapshots.filter(
            (entry) => String(entry.id ?? "").trim() !== snapshotId,
        );
        await resourcesCapability.updateClassroomResourcesForTeacher(
            classId,
            claims.sub,
            {
                agendaSnapshots: remaining,
            },
        );
        jsonOk(res, { ok: true });
        return true;
    }

    if (snapshotMatch && req.method === "PATCH") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(snapshotMatch[1]);
        const snapshotId = decodeURIComponent(snapshotMatch[2]);
        const isTeacher = await resourcesCapability.isClassTeacher(
            classId,
            claims.sub,
        );
        if (!isTeacher) {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const body = (await readJson(req)) as { name?: unknown };
        const newName = String(body?.name ?? "").trim();
        if (!newName) {
            jsonError(res, 400, "bad_request", "name is required.");
            return true;
        }
        const resources =
            await resourcesCapability.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
        const updatedSnapshots = resources.agendaSnapshots.map((entry) =>
            String(entry.id ?? "").trim() === snapshotId
                ? { ...entry, name: newName }
                : entry,
        );
        await resourcesCapability.updateClassroomResourcesForTeacher(
            classId,
            claims.sub,
            {
                agendaSnapshots: updatedSnapshots,
            },
        );
        jsonOk(res, { ok: true });
        return true;
    }

    const notepadFilesMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notepad-files$/,
    );
    if (notepadFilesMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notepadFilesMatch[1]);
        const access = await validateViewerAccess({
            capability: resourcesCapability,
            classId,
            accountId: claims.sub,
        });
        if (access === "not_found") {
            jsonError(res, 404, "not_found", "Class not found.");
            return true;
        }
        if (access === "forbidden") {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const fileGateway = getFileGateway(ctx);
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

    const notepadFileMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notepad-files\/([^/]+)$/,
    );
    if (notepadFileMatch) {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notepadFileMatch[1]);
        const filename = decodeURIComponent(notepadFileMatch[2]);
        const access = await validateViewerAccess({
            capability: resourcesCapability,
            classId,
            accountId: claims.sub,
        });
        if (access === "not_found") {
            jsonError(res, 404, "not_found", "Class not found.");
            return true;
        }
        if (access === "forbidden") {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const fileGateway = getFileGateway(ctx);
        if (!fileGateway) {
            jsonError(
                res,
                503,
                "service_unavailable",
                "File storage is unavailable.",
            );
            return true;
        }
        const key = `classroom-notes/${encodeURIComponent(classId)}/${encodeURIComponent(filename)}`;
        if (req.method === "GET") {
            const content = await fileGateway.get(key).catch(() => null);
            if (!content) {
                jsonError(res, 404, "not_found", "File not found.");
                return true;
            }
            res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
            res.end(Buffer.from(content));
            return true;
        }
        if (req.method === "PUT") {
            const chunks: Buffer[] = [];
            for await (const chunk of req) {
                chunks.push(
                    typeof chunk === "string" ? Buffer.from(chunk) : chunk,
                );
            }
            const content = Buffer.concat(chunks);
            if (content.byteLength > resolveMaxFileBytes(getMaxFileBytes)) {
                jsonError(
                    res,
                    413,
                    "payload_too_large",
                    "File exceeds the configured size limit.",
                );
                return true;
            }
            await fileGateway.put(key, content, "text/plain; charset=utf-8");
            jsonOk(res, { key });
            return true;
        }
        if (req.method === "DELETE") {
            const deleted = await fileGateway.delete(key).catch(() => false);
            jsonOk(res, { deleted });
            return true;
        }
    }

    const notepadRenameMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/notepad-files\/rename$/,
    );
    if (notepadRenameMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(notepadRenameMatch[1]);
        const access = await validateViewerAccess({
            capability: resourcesCapability,
            classId,
            accountId: claims.sub,
        });
        if (access === "not_found") {
            jsonError(res, 404, "not_found", "Class not found.");
            return true;
        }
        if (access === "forbidden") {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
            return true;
        }
        const fileGateway = getFileGateway(ctx);
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
            oldName?: unknown;
            newName?: unknown;
        };
        const oldName = String(body?.oldName ?? "").trim();
        const newName = String(body?.newName ?? "").trim();
        if (!oldName || !newName) {
            jsonError(
                res,
                400,
                "bad_request",
                "oldName and newName are required.",
            );
            return true;
        }
        const oldKey = `classroom-notes/${encodeURIComponent(classId)}/${encodeURIComponent(oldName)}`;
        const newKey = `classroom-notes/${encodeURIComponent(classId)}/${encodeURIComponent(newName)}`;
        const content = await fileGateway.get(oldKey).catch(() => null);
        if (!content) {
            jsonError(res, 404, "not_found", "File not found.");
            return true;
        }
        await fileGateway.put(newKey, content, "text/plain; charset=utf-8");
        await fileGateway.delete(oldKey).catch(() => false);
        jsonOk(res, { key: newKey });
        return true;
    }

    return false;
}
