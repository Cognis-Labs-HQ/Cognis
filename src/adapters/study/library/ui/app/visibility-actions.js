import {
    incompatibleDependencies,
    publishableDependencyLeaves,
} from "./dependency-scope.js";
import { showToast } from "/static/reuse/toast.js";
import {
    moveLibraryEntryToPersonal,
    requestLibraryPromotion,
    withdrawLibraryPromotion,
} from "/static/gateways/study/ui/library-client.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { selectedEntryIds, setSelectionMode } from "./selection.js";

export function createLibraryVisibilityActions({
    root,
    getEntries,
    setEntries,
    requests,
    getLocations,
    i18n,
    render,
}) {
    const selectedEntry = () => {
        const [entryId] = selectedEntryIds(root);
        return getEntries().find(({ id }) => id === entryId);
    };

    const actions = {
        async publish(scope) {
            const entry = selectedEntry();
            if (!entry || entry.protected || entry.scope !== "user") return;
            let scopeId = "global";
            if (scope === "class") {
                const classes = (getLocations()?.readable ?? []).filter(
                    (location) => location.scope === "class",
                );
                if (!classes.length) return;
                let select;
                const action = await openPopup({
                    title: i18n.t("gateway.study.library_publish_class"),
                    body: `<label>${escapeHtml(i18n.t("gateway.study.library_class"))}<select data-library-publish-class>${classes.map((location) => `<option value="${escapeHtml(location.scopeId)}">${escapeHtml(location.scopeId)}</option>`).join("")}</select></label>`,
                    actions: [
                        {
                            id: "submit",
                            label: i18n.t("gateway.study.library_publish_to"),
                            variant: "confirm",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                    ],
                    onOpen: (overlay) => {
                        select = overlay.querySelector(
                            "[data-library-publish-class]",
                        );
                    },
                });
                if (action !== "submit") return;
                scopeId = select.value;
            }
            const destination = { scope, scopeId };
            const dependencies = incompatibleDependencies(
                entry,
                destination,
                getEntries(),
            );
            if (dependencies.length) {
                const leaves = publishableDependencyLeaves(
                    entry,
                    destination,
                    getEntries(),
                ).filter(
                    ({ id }) =>
                        !requests.some(
                            (request) =>
                                request.sourceEntryId === id &&
                                request.status === "pending",
                        ),
                );
                if (!leaves.length) {
                    showToast(
                        i18n
                            .t(
                                "gateway.study.library_publish_dependencies_first",
                            )
                            .replace(
                                "{{ cards }}",
                                dependencies
                                    .map(({ label }) => label)
                                    .join(" · "),
                            ),
                        { variant: "error" },
                    );
                    return;
                }
                const action = await openPopup({
                    title: i18n.t(
                        "gateway.study.library_dependency_scope_title",
                    ),
                    body: `<p>${escapeHtml(i18n.t("gateway.study.library_publish_dependencies_help"))}</p><ul>${leaves.map(({ label }) => `<li>${escapeHtml(label)}</li>`).join("")}</ul>`,
                    actions: [
                        {
                            id: "publish",
                            label: i18n.t(
                                "gateway.study.library_publish_components",
                            ),
                            variant: "confirm",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                    ],
                });
                if (action !== "publish") return;
                for (const component of leaves) {
                    const request = await requestLibraryPromotion(
                        component.id,
                        destination,
                    );
                    requests.push({
                        ...request,
                        source: component,
                        canWithdraw: true,
                    });
                }
                showToast(
                    i18n.t("gateway.study.library_publish_dependencies_help"),
                    { variant: "info" },
                );
                return;
            }
            const request = await requestLibraryPromotion(
                entry.id,
                destination,
            );
            requests.push({ ...request, source: entry, canWithdraw: true });
            setSelectionMode(root, false);
        },

        async withdraw() {
            const button = root.querySelector(
                "[data-library-withdraw-selection]",
            );
            const requestId = button?.dataset.libraryRequestId;
            if (!requestId) return;
            await withdrawLibraryPromotion(requestId);
            const index = requests.findIndex(({ id }) => id === requestId);
            if (index >= 0) requests.splice(index, 1);
            setSelectionMode(root, false);
        },

        async sendBack() {
            const entry = selectedEntry();
            if (
                !entry ||
                entry.protected ||
                entry.scope === "user" ||
                entry.createdBy?.startsWith("content-pack:")
            )
                return;
            await moveLibraryEntryToPersonal(entry.id);
            const remaining = getEntries().filter(({ id }) => id !== entry.id);
            setEntries(remaining);
            render(remaining);
            setSelectionMode(root, false);
        },
    };
    return Object.fromEntries(
        Object.entries(actions).map(([name, action]) => [
            name,
            async (...args) => {
                try {
                    return await action(...args);
                } catch (error) {
                    const key =
                        error.message === "reference_visibility_too_low"
                            ? "gateway.study.library_dependency_scope_help"
                            : error.message ===
                                "entry_required_by_shared_content"
                              ? "gateway.study.library_send_back_dependencies"
                              : "gateway.study.library_visibility_error";
                    showToast(i18n.t(key), { variant: "error" });
                }
            },
        ]),
    );
}
