import { escapeHtml } from "/static/reuse/escape-html.js";

export async function handleClassroomExit({
    snapshot,
    isTeacherView,
    i18n,
    openPopup,
    apiFetch,
    showToast,
    onSuccess,
}) {
    if (!snapshot) return;
    if (isTeacherView) {
        const action = await openPopup({
            title: i18n.t("module.study.classes.disband_class_title"),
            body: `<p>${escapeHtml(i18n.t("module.study.classes.disband_class_confirm_body"))}</p>`,
            variant: "confirm",
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "confirm",
                    label: i18n.t("module.study.classes.disband_class_action"),
                    variant: "confirm",
                },
            ],
        });
        if (action !== "confirm") return;
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/disband`,
            { method: "DELETE" },
        );
        showToast(
            i18n.t(
                response.ok
                    ? "module.study.classes.disband_class_success"
                    : "module.study.classes.disband_class_failed",
            ),
            {
                variant: response.ok ? "success" : "error",
            },
        );
        if (response.ok) {
            await onSuccess?.("disband");
        }
        return;
    }

    const action = await openPopup({
        title: i18n.t("module.study.classes.leave_confirm_title"),
        body: `<p>${escapeHtml(i18n.t("module.study.classes.leave_confirm_body"))}</p>`,
        variant: "confirm",
        actions: [
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
            {
                id: "leave",
                label: i18n.t("module.study.classes.leave_class"),
                variant: "confirm",
            },
        ],
    });
    if (action !== "leave") return;
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/membership`,
        { method: "DELETE" },
    );
    showToast(
        i18n.t(
            response.ok
                ? "module.study.classes.leave_success"
                : "module.study.classes.leave_failed",
        ),
        {
            variant: response.ok ? "success" : "error",
        },
    );
    if (response.ok) {
        await onSuccess?.("leave");
    }
}
