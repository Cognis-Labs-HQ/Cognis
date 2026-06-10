/**
 * Handles save-materials, save-notebook, open-notebook, open-homework,
 * and materials-file-upload click/change interactions in the classroom.
 * Returns true if the event was handled.
 *
 * @param {Event} event
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

    if (event.target.closest(".classes-materials-upload-input")) {
        const input = event.target.closest(".classes-materials-upload-input");
        if (!(input instanceof HTMLInputElement) || !input.files?.length) {
            return true;
        }
        if (!snapshot) return true;
        const existingFiles = Array.isArray(classResources.files)
            ? [...classResources.files]
            : [];
        for (const file of Array.from(input.files)) {
            const nameBase = file.name
                .replace(/\.[^.]+$/, "")
                .replace(/[^a-z0-9-]/gi, "_");
            const nameExt = (file.name.match(/\.[^.]+$/) ?? [""])[0].replace(
                /[^a-z0-9.]/gi,
                "",
            );
            const safeFileName = (nameBase || "file") + nameExt;
            const key = `classes/${encodeURIComponent(snapshot.id)}/${Date.now()}-${safeFileName}`;
            const uploadResponse = await apiFetch(`/api/v1/files/${key}`, {
                method: "PUT",
                headers: {
                    "content-type": file.type || "application/octet-stream",
                },
                body: await file.arrayBuffer(),
            }).catch(() => null);
            if (!uploadResponse?.ok) {
                showToast(
                    `${i18n.t("module.study.classes.materials_upload_failed")}: ${file.name}`,
                    { variant: "error" },
                );
                continue;
            }
            existingFiles.push({
                key,
                name: file.name,
                contentType: file.type || "application/octet-stream",
            });
        }
        const saveResponse = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ files: existingFiles }),
            },
        ).catch(() => null);
        if (saveResponse?.ok) {
            classResources.files = existingFiles;
        }
        input.value = "";
        await loadSelectedClassMeta();
        refreshDom();
        return true;
    }

    if (event.target.closest(".classes-materials-file-remove")) {
        if (!snapshot) return true;
        const btn = event.target.closest(".classes-materials-file-remove");
        const fileIndex = Number(btn?.dataset?.fileIndex ?? -1);
        const existingFiles = Array.isArray(classResources.files)
            ? [...classResources.files]
            : [];
        if (fileIndex < 0 || fileIndex >= existingFiles.length) return true;
        existingFiles.splice(fileIndex, 1);
        const removeResponse = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ files: existingFiles }),
            },
        ).catch(() => null);
        if (removeResponse?.ok) {
            showToast(i18n.t("module.study.classes.materials_file_removed"), {
                variant: "success",
            });
            classResources.files = existingFiles;
        } else {
            showToast(
                i18n.t("module.study.classes.materials_file_remove_failed"),
                { variant: "error" },
            );
        }
        await loadSelectedClassMeta();
        refreshDom();
        return true;
    }

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
