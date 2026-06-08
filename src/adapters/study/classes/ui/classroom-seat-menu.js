import { buildAccountLabel } from "/static/adapters/study/classes/classroom-render.js";

export async function openSeatActionMenu({
    button,
    getSelectedClassId,
    apiFetch,
    i18n,
    openSearchPopup,
    openPopup,
    escapeHtml,
    showToast,
    navigateTo,
    refreshContent,
}) {
    const studentId = String(button.dataset.studentId ?? "").trim();
    const studentHandle = String(button.dataset.studentHandle ?? "").trim();
    if (!studentId) {
        openSearchPopup({
            endpoint: "/api/v1/social/messages/users/lookup",
            category: "user",
            ariaLabel: i18n.t("module.study.classes.invite_student"),
            noResultsText: i18n.t("ui.layout.search.no_results"),
            onSelect: async (result) => {
                const accountId = String(result?.accountId ?? "").trim();
                const selectedClassId = getSelectedClassId();
                if (!accountId || !selectedClassId) return;
                const response = await apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/invite`,
                    {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ accountId }),
                    },
                );
                showToast(
                    i18n.t(
                        response.ok
                            ? "module.study.classes.invite_success"
                            : "module.study.classes.invite_failed",
                    ),
                    { variant: response.ok ? "success" : "error" },
                );
                if (response.ok) {
                    await refreshContent();
                }
            },
        });
        return;
    }
    const action = await openPopup({
        title: buildAccountLabel({
            studentAccountId: studentId,
            handle: studentHandle,
        }),
        body: `<p>${escapeHtml(i18n.t("module.study.classes.manage_student_prompt"))}</p>`,
        variant: "confirm",
        actions: [
            {
                id: "message",
                label: i18n.t("ui.reuse.message"),
                variant: "confirm",
            },
            {
                id: "kick",
                label: i18n.t("module.study.classes.kick_student"),
                variant: "cancel",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.close"),
                variant: "cancel",
            },
        ],
    });
    if (action === "message" && studentHandle) {
        const response = await apiFetch("/api/v1/social/messages/rooms", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ handles: [studentHandle] }),
        });
        if (!response.ok) {
            showToast(i18n.t("module.study.classes.message_failed"), {
                variant: "error",
            });
            return;
        }
        const payload = await response.json();
        navigateTo(`/messages/${encodeURIComponent(payload?.data?.id ?? "")}`);
        return;
    }
    if (action === "kick") {
        const selectedClassId = getSelectedClassId();
        if (!selectedClassId) return;
        const response = await apiFetch(
            `/api/v1/study/classrooms/${encodeURIComponent(selectedClassId)}/students/${encodeURIComponent(studentId)}`,
            { method: "DELETE" },
        );
        showToast(
            i18n.t(
                response.ok
                    ? "module.study.classes.kick_success"
                    : "module.study.classes.kick_failed",
            ),
            { variant: response.ok ? "success" : "error" },
        );
        if (response.ok) {
            await refreshContent();
        }
    }
}
