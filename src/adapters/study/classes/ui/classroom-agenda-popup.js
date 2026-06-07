import { escapeHtml } from "/static/reuse/escape-html.js";

export async function openAgendaPopup({
    i18n,
    openPopup,
    apiFetch,
    selectedClassId,
    onSaved,
    showToast,
}) {
    let title = "";
    let description = "";
    let startAt = "";
    let endAt = "";
    const action = await openPopup({
        title: i18n.t("module.study.classes.create_agenda"),
        body: `
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.agenda_title"))}
                <input id="classes-agenda-title" class="theme-select" type="text" />
            </label>
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.agenda_description"))}
                <textarea id="classes-agenda-description" class="theme-select" rows="4"></textarea>
            </label>
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.agenda_start"))}
                <input id="classes-agenda-start" class="theme-select" type="datetime-local" />
            </label>
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.agenda_end"))}
                <input id="classes-agenda-end" class="theme-select" type="datetime-local" />
            </label>
        `,
        variant: "confirm",
        actions: [
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
            {
                id: "save",
                label: i18n.t("module.study.classes.create_agenda"),
                variant: "confirm",
            },
        ],
        closeProtection: true,
        onAction: (actionId, overlay) => {
            if (actionId !== "save") return true;
            title = String(
                overlay.querySelector("#classes-agenda-title")?.value ?? "",
            ).trim();
            description = String(
                overlay.querySelector("#classes-agenda-description")?.value ??
                    "",
            ).trim();
            startAt = String(
                overlay.querySelector("#classes-agenda-start")?.value ?? "",
            ).trim();
            endAt = String(
                overlay.querySelector("#classes-agenda-end")?.value ?? "",
            ).trim();
            return Boolean(title && startAt && endAt);
        },
    });
    if (action !== "save" || !selectedClassId) return;
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(selectedClassId)}/agenda`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                title,
                description,
                startAt: new Date(startAt).toISOString(),
                endAt: new Date(endAt).toISOString(),
            }),
        },
    );
    showToast(
        i18n.t(
            response.ok
                ? "module.study.classes.agenda_saved"
                : "module.study.classes.agenda_save_failed",
        ),
        { variant: response.ok ? "success" : "error" },
    );
    if (response.ok) {
        await onSaved?.();
    }
}
