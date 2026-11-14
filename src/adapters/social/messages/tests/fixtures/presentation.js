import { loadTestModule } from "../../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../../ui/reuse/escape-html.js";
import { renderMarkdown } from "../../../../../ui/reuse/markdown-renderer.js";

export function loadPresentation(
    timestamp = {
        formatDate: (value) => value?.slice(0, 10) ?? "",
        formatTime: (value) => value?.slice(11, 16) ?? "",
    },
) {
    return loadTestModule(
        new URL("../../ui/reuse/conversation-presentation.js", import.meta.url),
        {
            "/static/reuse/escape-html.js": { escapeHtml },
            "/static/reuse/markdown-renderer.js": { renderMarkdown },
            "/static/reuse/timestamp.js": timestamp,
        },
    );
}
