import { apiFetch } from "/static/reuse/api-client.js";
import { createOfflineReadCache } from "/static/reuse/offline-read-cache.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

/** Study owns the lightweight metadata needed to reopen its hub and child navigation. */
export function registerStudyNavigation(ctx) {
    const read = createOfflineReadCache({ signal: ctx.signal });
    const registerActions = ctx.capabilities.get("ui:scopedActions");
    if (!registerActions) throw new Error("scoped_actions_unavailable");
    const load = (path, signal) =>
        read(path, async () => {
            const response = await apiFetch(path, {
                signal: AbortSignal.any([
                    ctx.signal,
                    ...(signal ? [signal] : []),
                ]),
            });
            if (!response.ok)
                throw Object.assign(new Error("study_navigation_unavailable"), {
                    status: response.status,
                });
            return (await response.json()).data;
        });
    const actions = registerActions(ctx, "study:navigation", {
        languages: ({ signal } = {}) =>
            load("/api/v1/study/registered-languages", signal ?? ctx.signal),
        preferences: ({ signal } = {}) =>
            load("/api/v1/study/preferences", signal ?? ctx.signal),
        modules: ({ languageCode, signal }) =>
            load(
                `/api/v1/study/languages/${encodeURIComponent(languageCode)}/modules`,
                signal ?? ctx.signal,
            ),
    });
    ctx.capabilities.contribute("study:navigation", actions);
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
