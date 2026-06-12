import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonOk, jsonError } from "../../../../api/reuse/json-responses.js";
import type { RouteContext } from "../../../../api/reuse/route-context.js";
import type { DbClassesStore } from "../store/index.js";

export async function handleClassroomAgendaRoutes({
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
    const agendaMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda$/,
    );
    if (agendaMatch && req.method === "GET") {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;
        const classId = decodeURIComponent(agendaMatch[1]);
        try {
            const resources = await store.getClassroomResourcesForViewer(
                classId,
                claims.sub,
            );
            jsonOk(res, {
                document: resources.agendaDocument,
                snapshots: resources.agendaSnapshots,
                updatedAt: resources.updatedAt,
                updatedBy: resources.updatedBy,
            });
        } catch {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
        }
        return true;
    }

    if (agendaMatch && req.method === "PUT") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(agendaMatch[1]);
        const body = (await readJson(req)) as { document?: unknown };
        const nextDocument = String(body?.document ?? "");
        try {
            const resources = await store.updateClassroomResourcesForTeacher(
                classId,
                claims.sub,
                { agendaDocument: nextDocument },
            );
            jsonOk(res, {
                document: resources.agendaDocument,
                snapshots: resources.agendaSnapshots,
                updatedAt: resources.updatedAt,
                updatedBy: resources.updatedBy,
            });
        } catch {
            jsonError(
                res,
                403,
                "forbidden",
                "Class not found or access denied.",
            );
        }
        return true;
    }

    const snapshotCreateMatch = url.pathname.match(
        /^\/api\/v1\/study\/classes\/([^/]+)\/agenda\/snapshots$/,
    );
    if (snapshotCreateMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "teacher");
        if (!claims) return true;
        const classId = decodeURIComponent(snapshotCreateMatch[1]);
        const body = (await readJson(req)) as {
            name?: unknown;
            document?: unknown;
        };
        const resources = await store.getClassroomResourcesForViewer(
            classId,
            claims.sub,
        );
        const snapshotName =
            String(body?.name ?? "").trim() || new Date().toISOString();
        const snapshotDocument =
            body?.document == null
                ? resources.agendaDocument
                : String(body.document);
        const snapshot = {
            id: randomUUID(),
            name: snapshotName,
            content: snapshotDocument,
            updatedAt: new Date().toISOString(),
        };
        const snapshots = [...resources.agendaSnapshots, snapshot];
        const updated = await store.updateClassroomResourcesForTeacher(
            classId,
            claims.sub,
            {
                agendaDocument: snapshotDocument,
                agendaSnapshots: snapshots,
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
        const body = (await readJson(req)) as { snapshotId?: unknown };
        const snapshotId = String(body?.snapshotId ?? "").trim();
        if (!snapshotId) {
            jsonError(res, 400, "bad_request", "snapshotId is required.");
            return true;
        }
        const resources = await store.getClassroomResourcesForViewer(
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
        const updated = await store.updateClassroomResourcesForTeacher(
            classId,
            claims.sub,
            {
                agendaDocument: snapshot.content,
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

    return false;
}
