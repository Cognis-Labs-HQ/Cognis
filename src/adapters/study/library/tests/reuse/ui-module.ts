import * as entryGraph from "../../ui/reuse/entry-graph.js";
import * as offlineState from "../../../../../ui/reuse/offline-state.js";
import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";

const CONTRACTS = {
    "app/selection.js": [
        "/static/gateways/study/library-client.js",
        "/static/reuse/toast.js",
        "/static/reuse/escape-html.js",
        "/static/reuse/popup.js",
        "./presentation.js",
    ],
    "app/audio-media-session.js": ["/static/reuse/i18n.js"],
    "app/presentation.js": [
        "./audio-media-session.js",
        "/static/reuse/toast.js",
        "/static/reuse/ui-ctx.js",
        "/static/reuse/escape-html.js",
        "/static/reuse/group-by.js",
        "/static/gateways/study/library-client.js",
        "/static/gateways/study/language.js",
        "../reuse/transformations.js",
        "./composition-links.js",
    ],
    "app/audio-editor.js": [
        "/static/reuse/escape-html.js",
        "/static/reuse/toast.js",
        "/static/reuse/error-reporting.js",
        "/static/gateways/study/library-client.js",
        "./presentation.js",
    ],
    "app/filters.js": [
        "/static/reuse/collection-view.js",
        "/static/gateways/study/reuse/favourites.js",
        "/static/reuse/escape-html.js",
        "/static/reuse/group-by.js",
        "./presentation.js",
    ],
    "app/transformation-opt-ins.js": [
        "/static/reuse/escape-html.js",
        "./presentation.js",
    ],
    "app/admin-interactions/editor-body.js": [
        "../audio-editor.js",
        "../transformation-opt-ins.js",
        "../reuse/card-preview.js",
        "../reuse/definition-actions.js",
        "/static/reuse/escape-html.js",
        "/static/reuse/popup.js",
        "/static/reuse/toast.js",
        "/static/reuse/form-builder.js",
        "/static/reuse/horizontal-carousel.js",
        "/static/reuse/composition-input.js",
        "/static/reuse/ui-ctx.js",
        "/static/reuse/error-reporting.js",
        "/static/gateways/study/library-client.js",
        "../presentation.js",
        "../editability.js",
        "../pronunciation-editor.js",
        "../composer-contract.js",
        "../composer-limits.js",
        "../composer-extras.js",
        "../composition-tokens.js",
        "../field-input.js",
    ],
    "app/create-entry/lookup-replacement.js": [
        "/static/reuse/popup.js",
        "/static/reuse/escape-html.js",
    ],
    "app/requests.js": [
        "/static/reuse/offline-state.js",
        "./request-preview.js",
        "/static/reuse/popup.js",
        "/static/reuse/ui-ctx.js",
        "/static/reuse/escape-html.js",
        "/static/reuse/toast.js",
        "/static/reuse/timestamp.js",
        "/static/gateways/study/library-client.js",
        "./presentation.js",
    ],
    "app/create-entry/definition-editor.js": [
        "../reuse/definition-actions.js",
        "./entry-match.js",
        "../admin-interactions/index.js",
        "../editability.js",
        "/static/reuse/form-builder.js",
        "/static/reuse/escape-html.js",
        "/static/reuse/popup.js",
        "/static/reuse/toast.js",
        "/static/gateways/study/library-client.js",
        "../definition-languages.js",
    ],
    "app/create-entry/lookups.js": [
        "../composer-limits.js",
        "./lookup-choice.js",
        "./lookup-definitions.js",
        "./lookup-references.js",
        "./lookup-prerequisites.js",
        "./pronunciation-draft.js",
        "/static/gateways/study/library-client.js",
        "/static/reuse/toast.js",
        "../field-input.js",
        "./definition-editor.js",
        "./lookup-replacement.js",
    ],
    "app/create-entry/lookup-prerequisites.js": [
        "/static/gateways/study/library-client.js",
        "/static/reuse/horizontal-carousel.js",
        "./entry-match.js",
        "./lookup-references.js",
        "./lookup-definitions.js",
        "../definition-languages.js",
    ],
} as const;

/** Keep repeated browser fixtures within Library's declared module/import boundaries. */
export function loadLibraryUiModule(
    path: keyof typeof CONTRACTS,
    dependencies: Record<string, unknown>,
): Record<string, unknown> {
    if (!Object.hasOwn(CONTRACTS, path))
        throw new Error("Unknown Library UI fixture");
    return loadTestModule(
        new URL(`../../ui/${path}`, import.meta.url),
        {
            ...Object.fromEntries(
                CONTRACTS[path].map((specifier) => [specifier, dependencies]),
            ),
            "/static/reuse/offline-state.js": offlineState,
            "/static/gateways/study/offline-content.js": {
                isOfflineContentMiss: () => false,
            },
            "../reuse/entry-graph.js": entryGraph,
        },
        dependencies,
    );
}
