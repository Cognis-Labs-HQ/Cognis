/**
 * Handles save-materials, save-notebook, open-notebook, and open-homework
 * click interactions in the classroom. Returns true if the event was handled.
 *
 * @param {MouseEvent} event
 * @param {object} deps
 * @returns {Promise<boolean>}
 */
export async function handleResourceActions(
    event,
    {
        root,
        snapshot,
        classResources,
        apiFetch,
        i18n,
        showToast,
        openPopup,
        escapeHtml,
        loadSelectedClassMeta,
        refreshDom,
        setNotebookText,
    },
) {
    if (!(event.target instanceof Element)) return false;

    if (event.target.closest(".classes-save-materials-btn")) {
        if (!snapshot) return true;
        const materialsInput = root.querySelector("#classes-materials");
        const homeworkInput = root.querySelector("#classes-homework");
        if (
            !(materialsInput instanceof HTMLTextAreaElement) ||
            !(homeworkInput instanceof HTMLTextAreaElement)
        ) {
            return true;
        }
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    materials: materialsInput.value ?? "",
                    homework: homeworkInput.value ?? "",
                }),
            },
        );
        showToast(
            i18n.t(
                response.ok
                    ? "module.study.classes.materials_saved"
                    : "module.study.classes.materials_save_failed",
            ),
            { variant: response.ok ? "success" : "error" },
        );
        if (response.ok) {
            await loadSelectedClassMeta();
            refreshDom();
        }
        return true;
    }

    if (event.target.closest(".classes-save-notebook-btn")) {
        if (!snapshot) return true;
        const notebookInput = root.querySelector("#classes-own-notebook");
        if (!(notebookInput instanceof HTMLTextAreaElement)) {
            return true;
        }
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebook`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ noteText: notebookInput.value ?? "" }),
            },
        );
        showToast(
            i18n.t(
                response.ok
                    ? "module.study.classes.notebook_saved"
                    : "module.study.classes.notebook_save_failed",
            ),
            { variant: response.ok ? "success" : "error" },
        );
        if (response.ok) {
            setNotebookText(notebookInput.value ?? "");
        }
        return true;
    }

    if (event.target.closest(".classes-open-notebook-btn")) {
        if (!snapshot) return true;
        const studentId = String(
            event.target.closest(".classes-open-notebook-btn")?.dataset
                ?.studentId ?? "",
        ).trim();
        if (!studentId) return true;
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/notebooks/${encodeURIComponent(studentId)}`,
        );
        if (!response.ok) {
            showToast(i18n.t("module.study.classes.notebook_load_failed"), {
                variant: "error",
            });
            return true;
        }
        const payload = await response.json();
        await openPopup({
            title: i18n.t("module.study.classes.open_notebook"),
            body: `<p>${escapeHtml(payload?.data?.noteText || i18n.t("module.study.classes.empty_notebook"))}</p>`,
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.close"),
                    variant: "confirm",
                },
            ],
        });
        return true;
    }

    if (event.target.closest(".classes-open-homework-btn")) {
        if (!snapshot) return true;
        await openPopup({
            title: i18n.t("module.study.classes.open_textbook"),
            body: `<p>${escapeHtml(classResources?.homework || i18n.t("module.study.classes.no_homework_assigned"))}</p>`,
            actions: [
                {
                    id: "close",
                    label: i18n.t("ui.reuse.close"),
                    variant: "confirm",
                },
            ],
        });
        return true;
    }

    return false;
}
