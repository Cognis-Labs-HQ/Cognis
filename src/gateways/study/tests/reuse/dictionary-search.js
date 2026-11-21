/** Load the real Study search renderer with caller-supplied public UI contracts. */
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";

export function loadDictionarySearch(context) {
    return loadTestModule(
        new URL("../../ui/sub-navigation-search.js", import.meta.url),
        Object.fromEntries(
            [
                "/static/reuse/form-builder.js",
                "/static/reuse/escape-html.js",
                "/static/reuse/popup.js",
                "/static/reuse/toast.js",
                "/static/reuse/ui-ctx.js",
                "/static/gateways/study/library-client.js",
            ].map((path) => [path, context]),
        ),
        context,
    );
}
