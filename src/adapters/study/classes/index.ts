import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import { DbClassesStore } from "./store.js";
import { createClassesRoutes } from "./routes.js";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);

let adapterReady = false;

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "classes",
        adapterName: "Classes",
        getConfig: () => ({}),
        setConfig: () => {},
        isConfigured: () => adapterReady,
    };
}

/**
 * Page-serving route for `/classes`. Serves the classes SPA page.
 */
function createClassesPageRoute(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/classes") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        if (!ctx.hasMinRole(session.role, "teacher")) {
            res.writeHead(302, { location: "/dashboard" });
            res.end();
            return true;
        }
        ctx.setPageSecurityHeaders(res);
        const html = await import("node:fs/promises").then((fs) =>
            fs.readFile(path.join(ADAPTER_UI_ROOT, "index.html"), "utf8"),
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

/**
 * Page-serving route for `/my-classes`. Serves the student classes SPA page.
 */
function createMyClassesPageRoute(
    routeContext: RouteContext | undefined,
    isAdapterEnabled: () => boolean,
) {
    const ctx = resolveRouteContext(routeContext);
    return async (
        req: IncomingMessage,
        res: ServerResponse,
        url: URL,
    ): Promise<boolean> => {
        if (req.method && req.method !== "GET") return false;
        if (!isAdapterEnabled()) return false;
        if (url.pathname !== "/my-classes") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        if (session.role === "teacher") {
            res.writeHead(302, { location: "/classes" });
            res.end();
            return true;
        }
        ctx.setPageSecurityHeaders(res);
        const html = await import("node:fs/promises").then((fs) =>
            fs.readFile(path.join(ADAPTER_UI_ROOT, "my-classes.html"), "utf8"),
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
    };
}

export async function bootstrapStudyAdapter(
    ctx: StudyAdapterBootstrapCtx,
): Promise<void> {
    const routeContext =
        ctx.capabilities.get<RouteContext>("auth:routeContext");
    const dbExecutor = ctx.capabilities.get("db:executor") ?? ctx.dbExecutor;
    if (!dbExecutor) {
        ctx.log?.(
            "warn",
            "Study/classes adapter: no DB executor available — skipping.",
            { component: "study-classes" },
        );
        return;
    }

    const store = new DbClassesStore(dbExecutor);

    try {
        await store.ensureSchema();
    } catch (err) {
        ctx.log?.(
            "error",
            "Study/classes adapter: schema initialisation failed.",
            {
                component: "study-classes",
                error: err instanceof Error ? err.message : String(err),
            },
        );
        return;
    }

    adapterReady = true;

    const isEnabled = () => ctx.isAdapterEnabled();
    const preferenceStore =
        ctx.capabilities.get<UserPreferenceStore>("preferences:store");
    const readTeacherManualApproval = async (): Promise<boolean> => {
        if (!preferenceStore) return true;
        const raw = await preferenceStore.get(
            "__system__",
            "security-settings",
        );
        if (!raw) return true;
        try {
            const parsed = JSON.parse(raw) as {
                requireTeacherManualApproval?: unknown;
            };
            return parsed.requireTeacherManualApproval !== false;
        } catch {
            return true;
        }
    };
    const accountStore = ctx.capabilities.get<{
        setRole(username: string, role: "teacher"): Promise<void>;
        exists(username: string): Promise<boolean>;
    }>("auth:accountStore");
    const profileStore = ctx.capabilities.get<{
        getProfile: (
            accountId: string,
        ) => Promise<{ handle?: string | null } | null>;
    }>("social:profileStore");
    const setProfileRole = ctx.capabilities.get<
        (handle: string, role: "teacher") => Promise<void>
    >("profile:setRoleByHandle");

    /** study:classroom:listParticipantHandles — resolves normalized participant handles for classroom-linked features. */
    ctx.capabilities.contribute(
        "study:classroom:listParticipantHandles",
        async (input: { classId: string }): Promise<string[]> => {
            const classId = String(input?.classId ?? "").trim();
            if (!classId) return [];
            const classRow = await store.getClass(classId);
            if (!classRow) return [];
            const members = await store.listClassMembers(classId);

            const accountIds = Array.from(
                new Set([
                    classRow.teacherAccountId,
                    ...members.map((member) => member.studentAccountId),
                ]),
            );
            const profileRows = await Promise.all(
                accountIds.map(async (accountId) => ({
                    accountId,
                    profile: profileStore
                        ? await profileStore.getProfile(accountId)
                        : null,
                })),
            );
            return Array.from(
                new Set(
                    profileRows
                        .map((row) =>
                            String(
                                row.profile?.handle ?? row.accountId ?? "",
                            ).toLowerCase(),
                        )
                        .map((handle) => handle.replace(/^@+/, "").trim())
                        .filter(Boolean),
                ),
            );
        },
    );

    ctx.registerRoute(createClassesPageRoute(routeContext, isEnabled), "study");
    ctx.registerRoute(
        createMyClassesPageRoute(routeContext, isEnabled),
        "study",
    );
    ctx.registerRoute(
        createClassesRoutes(store, {
            requireTeacherManualApproval: readTeacherManualApproval,
            setRole: accountStore
                ? (username, role) => accountStore.setRole(username, role)
                : undefined,
            setProfileRole,
            accountExists: accountStore
                ? (id) => accountStore.exists(id)
                : undefined,
            routeContext,
            dispatchToRole: (role, envelope) => {
                const dispatch = ctx.capabilities.get<
                    (
                        role: "admin" | "teacher" | "user",
                        envelope: typeof envelope,
                    ) => Promise<unknown>
                >("notify:dispatchToRole");
                return dispatch?.(role, envelope) ?? Promise.resolve(null);
            },
            log: ctx.log,
        }),
        "study",
    );

    ctx.registerPageExtension("dashboard", {
        id: "study-classes-dashboard",
        label: "My Classes",
        scriptUrl: "/static/gateways/study/classes-dashboard-element.js",
        isEnabled: () => ctx.isAdapterEnabled(),
    });

    ctx.registerAdapterStaticDir?.("study", "classes", ADAPTER_UI_ROOT);
    ctx.registerSpaRoute?.({
        id: "study-classes-teacher-page",
        pattern: "^/classes$",
        base: "/classes",
        scriptUrl: "/static/adapters/study/classes/app.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/study/classes/classes.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });
    ctx.registerSpaRoute?.({
        id: "study-classes-student-page",
        pattern: "^/my-classes$",
        base: "/my-classes",
        scriptUrl: "/static/adapters/study/classes/my-classes.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/study/classes/classes.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });

    ctx.log?.("info", "Study/classes adapter: bootstrapped.", {
        component: "study-classes",
    });
}
