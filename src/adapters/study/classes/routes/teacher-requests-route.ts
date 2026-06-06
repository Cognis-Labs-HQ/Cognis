import type { IncomingMessage, ServerResponse } from "node:http";
import { readJson } from "../../../../api/reuse/read-json.js";
import { jsonError, jsonOk } from "../../../../api/reuse/json-responses.js";
import type { DbClassesStore } from "../store/index.js";
import {
    DEFAULT_STUDENT_LIMIT,
    MAX_STUDENT_LIMIT,
} from "../store/constants.js";
import {
    buildDefaultClassName,
    normalizeJoinMode,
    syncClassroomArtifacts,
    type ClassesRouteOptions,
} from "./route-helpers.js";

type RouteContextLike = {
    requireAuth: (
        req: IncomingMessage,
        res: ServerResponse,
        role: "user" | "teacher" | "admin",
    ) => { sub: string; role?: string } | null;
};

export async function handleTeacherRequestsRoutes(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL,
    params: {
        store: DbClassesStore;
        options: ClassesRouteOptions;
        ctx: RouteContextLike;
        logMeta: Record<string, unknown>;
        resolveStudyLanguageName: (languageCode: string) => Promise<string>;
    },
): Promise<boolean> {
    const { store, options, ctx, logMeta, resolveStudyLanguageName } = params;

    if (
        url.pathname === "/api/v1/study/teacher-requests" &&
        req.method === "POST"
    ) {
        const claims = ctx.requireAuth(req, res, "user");
        if (!claims) return true;

        const body = (await readJson(req)) as {
            languageCode?: unknown;
            className?: unknown;
            studentLimit?: unknown;
            reason?: unknown;
            joinMode?: unknown;
        };
        const languageCode =
            typeof body?.languageCode === "string"
                ? body.languageCode.trim().toLowerCase()
                : "";
        const reason =
            typeof body?.reason === "string" ? body.reason.trim() : "";
        const customClassName =
            typeof body?.className === "string" ? body.className.trim() : "";
        const rawStudentLimit = Number(body?.studentLimit);
        const studentLimit =
            Number.isInteger(rawStudentLimit) &&
            rawStudentLimit > 0 &&
            rawStudentLimit <= MAX_STUDENT_LIMIT
                ? rawStudentLimit
                : DEFAULT_STUDENT_LIMIT;
        const joinMode = normalizeJoinMode(body?.joinMode);
        const isListed = joinMode !== "invite_only";
        if (!languageCode) {
            jsonError(res, 400, "bad_request", "languageCode is required.");
            return true;
        }

        const existingClass = await store.getTeacherClassForLanguage(
            claims.sub,
            languageCode,
        );
        if (existingClass) {
            jsonError(
                res,
                409,
                "conflict",
                "A class already exists for this language.",
            );
            return true;
        }

        const existing = await store.getTeacherRequest(
            claims.sub,
            languageCode,
        );
        if (existing?.status === "pending") {
            jsonOk(res, existing);
            return true;
        }

        const profile = await options.getProfileSummary?.(claims.sub);
        const languageName =
            (await resolveStudyLanguageName(languageCode)) || languageCode;
        const className =
            customClassName ||
            buildDefaultClassName({
                teacherDisplayName:
                    profile?.displayName || profile?.handle || claims.sub,
                languageName,
            });

        const requiresApproval =
            (await options.requireTeacherManualApproval?.()) ?? true;
        if (!requiresApproval) {
            const request =
                existing ??
                (await store.submitTeacherRequest(
                    claims.sub,
                    languageCode,
                    className,
                    studentLimit,
                    reason || null,
                    joinMode,
                    isListed,
                ));
            const classRow = await store.approveTeacherRequest(
                request.id,
                claims.sub,
            );
            if (classRow) {
                await syncClassroomArtifacts(store, options, classRow.id);
            }
            await options.setRole?.(claims.sub, "teacher");
            await options.setProfileRole?.(claims.sub, "teacher");
            options.log?.("info", "Auto-approved teacher request.", {
                ...logMeta,
                accountId: claims.sub,
                languageCode,
            });
            jsonOk(res, { request, class: classRow, autoApproved: true });
            return true;
        }

        if (!reason) {
            jsonError(res, 400, "bad_request", "reason is required.");
            return true;
        }

        const request = await store.submitTeacherRequest(
            claims.sub,
            languageCode,
            className,
            studentLimit,
            reason,
            joinMode,
            isListed,
        );
        await options.dispatchToRole?.("admin", {
            category: "study",
            subject: `Teacher application for ${languageCode}`,
            body: `${claims.sub} applied to teach ${languageCode}.`,
            senderName: claims.sub,
            actionUrl: "/classroom",
            metadata: {
                requestId: request.id,
                accountId: claims.sub,
                languageCode,
            },
        });
        options.log?.("info", "Submitted teacher request.", {
            ...logMeta,
            accountId: claims.sub,
            languageCode,
            requestId: request.id,
        });
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ data: request }));
        return true;
    }

    if (
        url.pathname === "/api/v1/study/teacher-requests" &&
        req.method === "GET"
    ) {
        if (!ctx.requireAuth(req, res, "admin")) return true;
        const pending = await store.listPendingRequests();
        jsonOk(res, pending);
        return true;
    }

    const approveMatch = url.pathname.match(
        /^\/api\/v1\/study\/teacher-requests\/([^/]+)\/(approve|reject)$/,
    );
    if (approveMatch && req.method === "POST") {
        const claims = ctx.requireAuth(req, res, "admin");
        if (!claims) return true;

        const requestId = decodeURIComponent(approveMatch[1]);
        const action = approveMatch[2] as "approve" | "reject";

        if (action === "approve") {
            const classRow = await store.approveTeacherRequest(
                requestId,
                claims.sub,
            );
            if (!classRow) {
                jsonError(
                    res,
                    404,
                    "not_found",
                    "Request not found or already reviewed.",
                );
                return true;
            }
            await syncClassroomArtifacts(store, options, classRow.id);
            await options.setRole?.(classRow.teacherAccountId, "teacher");
            await options.setProfileRole?.(
                classRow.teacherAccountId,
                "teacher",
            );
            options.log?.("info", "Approved teacher request.", {
                ...logMeta,
                accountId: claims.sub,
                teacherAccountId: classRow.teacherAccountId,
                languageCode: classRow.languageCode,
                requestId,
            });
            jsonOk(res, classRow);
        } else {
            await store.rejectTeacherRequest(requestId, claims.sub);
            options.log?.("info", "Rejected teacher request.", {
                ...logMeta,
                accountId: claims.sub,
                requestId,
            });
            jsonOk(res, { rejected: true });
        }
        return true;
    }

    return false;
}
