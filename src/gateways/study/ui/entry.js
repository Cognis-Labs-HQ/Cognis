import {
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
} from "./sub-navigation.js";
import { captureAccountGuard } from "/static/reuse/offline-identity.js";
import { isOffline } from "/static/reuse/offline-state.js";

export function registerStudyEntry(ctx) {
    const flow = "study:navigation:enter";
    let revision = 0;
    let opening = 0;
    const log = ctx.capabilities.get("ui:log");
    for (const event of [
        "cognis:study-enrollment-changed",
        "cognis:module-lifecycle-changed",
    ]) {
        window.addEventListener(
            event,
            () => {
                revision++;
                ctx.capabilities.get("study:subPages")?.invalidate("study");
            },
            { signal: ctx.signal },
        );
    }
    ctx.registerFlow(flow, ["resolve", "navigate"]);
    ctx.extendFlow(
        flow,
        "resolve",
        { id: flow },
        async ({ input = {}, data }) => {
            const currentOpening = ++opening;
            const path = window.location.pathname;
            const assertAccount = captureAccountGuard();
            const active = () => {
                if (
                    ctx.signal.aborted ||
                    input.signal?.aborted ||
                    currentOpening !== opening ||
                    window.location.pathname !== path
                )
                    return false;
                assertAccount();
                return true;
            };
            data.active = active;
            if (!["/study", "/study/"].includes(path)) return;
            while (active()) {
                const expectedRevision = revision;
                const selected = readSelectedStudyLanguageCode();
                let model;
                try {
                    model = await loadStudySubNavigationModel({
                        fallbackLanguageCode: selected,
                        signal: AbortSignal.any([
                            ctx.signal,
                            ...(input.signal ? [input.signal] : []),
                        ]),
                    });
                } catch (error) {
                    if (!active()) return;
                    if (revision === expectedRevision) throw error;
                    log?.(
                        "error",
                        "Study provider changed during entry resolution.",
                        {
                            component: "study",
                            operation: "resolveEntry",
                            errorName: error?.name,
                        },
                    );
                    continue;
                }
                if (!active()) return;
                if (
                    revision !== expectedRevision ||
                    selected !== readSelectedStudyLanguageCode()
                )
                    continue;
                data.language = model.selectedLanguageCode;
                data.path = model.explorePageUrl;
                if (!data.path) {
                    data.path = isOffline()
                        ? null
                        : model.languageCatalogByCode.size === 0 ||
                            data.language
                          ? "/error?code=503"
                          : "/study/welcome";
                }
                data.current = () =>
                    active() &&
                    revision === expectedRevision &&
                    selected === readSelectedStudyLanguageCode();
                data.result = data.path ? "ready" : "offline";
                return;
            }
        },
    );
    ctx.extendFlow(
        flow,
        "navigate",
        { id: flow },
        async ({ input = {}, data }) => {
            if (!data.active?.()) return;
            if (data.current && !data.current()) {
                const latest = await ctx.runFlow(flow, input);
                data.result = latest.data.result;
                return;
            }
            if (!data.path) return;
            const navigate = ctx.capabilities.get("ui:navigate");
            if (typeof navigate !== "function")
                throw new Error("study_navigation_unavailable");
            log?.("info", "Opening Study entry.", {
                component: "study",
                operation: "enter",
                language: data.language,
            });
            const mounted = await navigate(data.path, {
                replace: true,
                state: { ...history.state, studyLanguageCode: data.language },
            });
            data.result = mounted === false ? "blocked" : "opened";
        },
    );
}
