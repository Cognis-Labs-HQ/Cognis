import { readStudySnapshot } from "./offline-content.js";
import { bindOfflineSnapshotRefresh } from "/static/reuse/offline-snapshot.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { isOffline } from "/static/reuse/offline-state.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

/** Study owns the lightweight metadata needed to reopen its hub and child navigation. */
export function registerStudyNavigation(ctx) {
    const read = createOfflineReadCache({
        signal: ctx.signal,
        preferCached: true,
        onlineMaxAgeMs: 30_000,
    });
    for (const event of [
        "cognis:study-enrollment-changed",
        "cognis:module-lifecycle-changed",
    ])
        globalThis.window?.addEventListener(event, () => read.invalidate(), {
            signal: ctx.signal,
        });
    const registerActions = ctx.capabilities.get("ui:scopedActions");
    if (!registerActions) throw new Error("scoped_actions_unavailable");
    const load = async (path, signal) => {
        const assertAccount = captureAccountGuard();
        const result = await readStudySnapshot(
            () =>
                read(path, async () => {
                    const response = await apiFetch(path, {
                        timeoutMs: 5000,
                        signal: AbortSignal.any([
                            ctx.signal,
                            ...(signal ? [signal] : []),
                        ]),
                    });
                    if (!response.ok)
                        throw Object.assign(
                            new Error("study_navigation_unavailable"),
                            {
                                status: response.status,
                            },
                        );
                    return (await response.json()).data;
                }),
            path.endsWith("/preferences")
                ? { learningLanguages: [], teachingLanguages: [] }
                : [],
        );
        assertAccount();
        return result;
    };
    const actions = registerActions(ctx, "study:navigation", {
        languages: ({ signal } = {}) =>
            load("/api/v1/study/registered-languages", signal ?? ctx.signal),
        preferences: async ({ signal } = {}) => {
            const prefs = await load(
                "/api/v1/study/preferences",
                signal ?? ctx.signal,
            );
            return prefs;
        },
        modules: ({ languageCode, signal }) =>
            load(
                `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
                signal ?? ctx.signal,
            ),
    });
    ctx.capabilities.contribute("study:navigation", actions);
    bindOfflineSnapshotRefresh(ctx, {
        id: "study:prepareOfflineSnapshot",
        refresh: async () => {
            const [, prefs] = await Promise.all([
                actions.languages(),
                actions.preferences(),
            ]);
            const codes = prefs?.learningLanguages ?? [];
            let index = 0;
            await Promise.all(
                Array.from({ length: Math.min(2, codes.length) }, async () => {
                    while (
                        index < codes.length &&
                        !isOffline() &&
                        !ctx.signal.aborted
                    )
                        await actions.modules({ languageCode: codes[index++] });
                }),
            );
        },
    });
    ctx.capabilities.get("offline:registerSessionRoutes")?.(
        ["gateway.study"],
        ctx.signal,
    );
}

export function fetchStudyLanguages(options) {
    return navigation().languages(options);
}

export function fetchStudyPreferences(options) {
    return navigation().preferences(options);
}

export function fetchStudyModules(languageCode, options = {}) {
    return navigation().modules({ ...options, languageCode });
}

function navigation() {
    const client = uiCtx.capabilities.get("study:navigation");
    if (!client) throw new Error("study_navigation_unavailable");
    return client;
}
