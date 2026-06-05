import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
    StudyAdapter,
    StudyAdapterBootstrapCtx,
} from "../../../gateways/study/gateway.js";
import { DbClassesStore } from "./store/index.js";
import { createClassesRoutes } from "./routes/index.js";
import type { UserPreferenceStore } from "../../../api/reuse/preference-store.js";
import {
    parseSecuritySettings,
    SECURITY_SETTINGS_KEY,
} from "../../../api/reuse/security-settings.js";
import {
    resolveRouteContext,
    type RouteContext,
} from "../../../api/reuse/route-context.js";

const ADAPTER_UI_ROOT = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "ui",
);

let adapterReady = false;
let requireTeacherManualApproval = true;
let persistTeacherManualApproval: null | ((value: boolean) => Promise<void>) =
    null;

export function createStudyAdapter(): StudyAdapter {
    return {
        adapterId: "classes",
        adapterName: "Classes",
        getConfig: () => ({ requireTeacherManualApproval }),
        setConfig: async (config) => {
            const rawValue = config?.requireTeacherManualApproval;
            requireTeacherManualApproval =
                rawValue === false || rawValue === "false" ? false : true;
            await persistTeacherManualApproval?.(requireTeacherManualApproval);
        },
        isConfigured: () => adapterReady,
    };
}

/**
 * Page-serving route for `/classroom`. Serves the classroom hub SPA page.
 */
function createClassroomHubPageRoute(
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
        if (url.pathname !== "/classroom") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        ctx.setPageSecurityHeaders(res);
        const html = await import("node:fs/promises").then((fs) =>
            fs.readFile(path.join(ADAPTER_UI_ROOT, "classroom.html"), "utf8"),
        );
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return true;
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

function createRequestsPageRoute(
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
        if (url.pathname !== "/requests") return false;
        const session = ctx.getCookieSession(req);
        if (!session) {
            res.writeHead(302, { location: "/login" });
            res.end();
            return true;
        }
        if (!ctx.hasMinRole(session.role, "admin")) {
            res.writeHead(302, { location: "/dashboard" });
            res.end();
            return true;
        }
        ctx.setPageSecurityHeaders(res);
        const html = await import("node:fs/promises").then((fs) =>
            fs.readFile(path.join(ADAPTER_UI_ROOT, "requests.html"), "utf8"),
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
    const dbExecutor = ctx.capabilities.get("db:executor");
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
        return requireTeacherManualApproval;
    };
    const loadTeacherManualApproval = async (): Promise<boolean> => {
        if (!preferenceStore) return true;
        const raw = await preferenceStore.get(
            "__system__",
            SECURITY_SETTINGS_KEY,
        );
        return (
            parseSecuritySettings(raw)?.requireTeacherManualApproval !== false
        );
    };
    persistTeacherManualApproval = async (value) => {
        if (!preferenceStore) return;
        const raw = await preferenceStore.get(
            "__system__",
            SECURITY_SETTINGS_KEY,
        );
        const settings = parseSecuritySettings(raw);
        await preferenceStore.set(
            "__system__",
            SECURITY_SETTINGS_KEY,
            JSON.stringify({
                trustedDomains: settings?.trustedDomains ?? [],
                registrationsEnabled: settings?.registrationsEnabled === true,
                userValidationMode:
                    settings?.userValidationMode === "smtp" ? "smtp" : "none",
                requireTeacherManualApproval: value,
                enforceTfaForAllUsers: settings?.enforceTfaForAllUsers === true,
            }),
        );
    };
    requireTeacherManualApproval = await loadTeacherManualApproval();
    const accountStore = ctx.capabilities.get<{
        setRole(username: string, role: "teacher"): Promise<void>;
        exists(username: string): Promise<boolean>;
    }>("auth:accountStore");
    const profileStore = ctx.capabilities.get<{
        getProfile: (
            accountId: string,
        ) => Promise<{ handle?: string | null } | null>;
        isFollowing?: (
            followerId: string,
            followingId: string,
        ) => Promise<boolean>;
    }>("social:profileStore");
    const setProfileRole = ctx.capabilities.get<
        (handle: string, role: "teacher") => Promise<void>
    >("profile:setRoleByHandle");

    /**
     * study:classroom:listParticipantHandles — resolves normalized participant
     * handles for classroom-linked features.
     */
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
        createRequestsPageRoute(routeContext, isEnabled),
        "study",
    );
    ctx.registerRoute(
        createClassroomHubPageRoute(routeContext, isEnabled),
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
            areFriends: async (accountA, accountB) => {
                if (!profileStore?.isFollowing) return false;
                const [aFollowsB, bFollowsA] = await Promise.all([
                    profileStore.isFollowing(accountA, accountB),
                    profileStore.isFollowing(accountB, accountA),
                ]);
                return aFollowsB && bFollowsA;
            },
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
    ctx.registerSpaRoute?.({
        id: "study-classes-classroom-hub-page",
        pattern: "^/classroom$",
        base: "/classroom",
        scriptUrl: "/static/adapters/study/classes/classroom.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/study/classes/classes.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });

    ctx.registerAdapterStaticDir?.("study", "classes", ADAPTER_UI_ROOT);
    ctx.registerNavbarPlugin("/static/adapters/study/classes/nav-link.js", () =>
        ctx.isAdapterEnabled(),
    );
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
    ctx.registerSpaRoute?.({
        id: "study-classes-requests-page",
        pattern: "^/requests$",
        base: "/requests",
        scriptUrl: "/static/adapters/study/classes/requests.js",
        stylesheets: [
            "/static/styles/page-builder.css",
            "/static/styles/reuse/page-sections.css",
            "/static/adapters/study/classes/classes.css",
        ],
        isEnabled: () => ctx.isAdapterEnabled(),
    });

    const registerNotificationCategory = ctx.capabilities.get<
        (id: string, label: string) => void
    >("notify:registerCategory");
    registerNotificationCategory?.("study", "Study");

    ctx.log?.("info", "Study/classes adapter: bootstrapped.", {
        component: "study-classes",
    });
}
