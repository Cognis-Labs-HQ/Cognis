import { escapeHtml } from "/static/reuse/escape-html.js";

function extractFilename(key) {
    const parts = key.split("/");
    return decodeURIComponent(parts[parts.length - 1] ?? key);
}

async function listNotepadFiles(apiFetch, classId) {
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(classId)}/notepad-files`,
    ).catch(() => null);
    if (!response?.ok) return [];
    const payload = await response.json().catch(() => ({ data: [] }));
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function saveNotepadFile(apiFetch, classId, filename, content) {
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(classId)}/notepad-files/${encodeURIComponent(filename)}`,
        {
            method: "PUT",
            headers: { "content-type": "text/plain; charset=utf-8" },
            body: new TextEncoder().encode(content),
        },
    ).catch(() => null);
    return response?.ok ?? false;
}

async function loadNotepadFile(apiFetch, classId, filename) {
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(classId)}/notepad-files/${encodeURIComponent(filename)}`,
    ).catch(() => null);
    if (!response?.ok) return null;
    return response.text().catch(() => null);
}

async function deleteNotepadFile(apiFetch, classId, filename) {
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(classId)}/notepad-files/${encodeURIComponent(filename)}`,
        {
            method: "DELETE",
        },
    ).catch(() => null);
    return response?.ok ?? false;
}

async function renameNotepadFile(apiFetch, classId, oldName, newName) {
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(classId)}/notepad-files/rename`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ oldName, newName }),
        },
    );
    return response?.ok ?? false;
}

function renderFilePickerBody(files, i18n) {
    if (!files.length) {
        return `<p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.no_notepad_files"))}</p>`;
    }
    return `
        <ul class="classes-file-list">
            ${files
                .map((file) => {
                    const name = extractFilename(file.key ?? file.name ?? "");
                    return `
                    <li class="classes-file-item">
                        <span class="classes-file-name">${escapeHtml(name)}</span>
                        <div class="classes-file-actions">
                            <button type="button"
                                class="btn-confirm btn-animated classes-file-open-btn"
                                data-file-name="${escapeHtml(name)}">${escapeHtml(i18n.t("ui.reuse.open"))}</button>
                            <button type="button"
                                class="btn-cancel btn-animated classes-file-rename-btn"
                                data-file-name="${escapeHtml(name)}">${escapeHtml(i18n.t("ui.reuse.rename"))}</button>
                            <button type="button"
                                class="btn-cancel btn-animated classes-file-delete-btn"
                                data-file-name="${escapeHtml(name)}">${escapeHtml(i18n.t("ui.reuse.delete"))}</button>
                        </div>
                    </li>
                `;
                })
                .join("")}
        </ul>
    `;
}

/**
 * Handles save/open file interactions for the classroom notepad.
 * Returns true when the click was consumed.
 *
 * @param {MouseEvent} event
 * @param {object} deps
 * @returns {Promise<boolean>}
 */
export async function handleFileActions(
    event,
    {
        snapshot,
        apiFetch,
        i18n,
        showToast,
        openPopup,
        escapeHtml: esc,
        isTeacherView,
    },
) {
    if (!(event.target instanceof Element)) return false;

    if (event.target.closest(".classes-notepad-save-file-btn")) {
        if (!snapshot) return true;
        const result = await openPopup({
            title: i18n.t("module.study.classes.save_notepad_file"),
            body: `
                <label class="stack">
                    ${esc(i18n.t("module.study.classes.notepad_filename"))}
                    <input type="text" class="classes-save-filename-input"
                        value="notes-${new Date().toISOString().slice(0, 10)}.txt" />
                </label>
            `,
            actions: [
                {
                    id: "open",
                    label: i18n.t("ui.reuse.open"),
                    variant: "confirm",
                },
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "save",
                    label: i18n.t("ui.reuse.save"),
                    variant: "confirm",
                },
            ],
        });
        if (result !== "save") return true;
        const input = document.querySelector(".classes-save-filename-input");
        const filename = String(
            input instanceof HTMLInputElement ? input.value : "",
        ).trim();
        if (!filename) return true;
        const notepadHost = document.querySelector(".classes-notepad-host");
        const notepadTextarea = notepadHost?.querySelector("textarea");
        const content =
            notepadTextarea instanceof HTMLTextAreaElement
                ? notepadTextarea.value
                : "";
        const saved = await saveNotepadFile(
            apiFetch,
            snapshot.id,
            filename,
            content,
        );
        showToast(
            i18n.t(
                saved
                    ? "module.study.classes.notepad_file_saved"
                    : "module.study.classes.notepad_file_save_failed",
            ),
            { variant: saved ? "success" : "error" },
        );
        return true;
    }

    if (event.target.closest(".classes-notepad-open-file-btn")) {
        if (!snapshot) return true;
        const files = await listNotepadFiles(apiFetch, snapshot.id);
        let selectedFilename = null;

        const action = await openPopup({
            title: i18n.t("module.study.classes.open_notepad_file"),
            body: renderFilePickerBody(files, i18n),
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
            ],
            onAction: (actionId, overlay) => {
                const openBtn = overlay.querySelector(
                    ".classes-file-open-btn.classes-file-picker-selected",
                );
                if (openBtn instanceof HTMLElement) {
                    selectedFilename = openBtn.dataset.fileName ?? null;
                }
                return true;
            },
            onMount: (overlay) => {
                overlay.addEventListener("click", async (evt) => {
                    const openBtn = evt.target.closest(
                        ".classes-file-open-btn",
                    );
                    if (openBtn instanceof HTMLElement) {
                        selectedFilename = openBtn.dataset.fileName ?? null;
                        overlay.dispatchEvent(
                            new CustomEvent("popup-action", {
                                detail: { actionId: "open" },
                                bubbles: true,
                            }),
                        );
                        return;
                    }
                    const deleteBtn = evt.target.closest(
                        ".classes-file-delete-btn",
                    );
                    if (deleteBtn instanceof HTMLElement) {
                        const name = deleteBtn.dataset.fileName ?? "";
                        const deleted = await deleteNotepadFile(
                            apiFetch,
                            snapshot.id,
                            name,
                        );
                        showToast(
                            i18n.t(
                                deleted
                                    ? "module.study.classes.notepad_file_deleted"
                                    : "module.study.classes.notepad_file_save_failed",
                            ),
                            { variant: deleted ? "success" : "error" },
                        );
                        if (deleted) {
                            const fresh = await listNotepadFiles(
                                apiFetch,
                                snapshot.id,
                            );
                            const list =
                                overlay.querySelector(".classes-file-list");
                            if (list instanceof HTMLElement) {
                                const tmpl = document.createElement("div");
                                tmpl.innerHTML = renderFilePickerBody(
                                    fresh,
                                    i18n,
                                );
                                list.replaceWith(
                                    tmpl.firstElementChild ?? tmpl,
                                );
                            }
                        }
                        return;
                    }
                    const renameBtn = evt.target.closest(
                        ".classes-file-rename-btn",
                    );
                    if (renameBtn instanceof HTMLElement) {
                        const oldName = renameBtn.dataset.fileName ?? "";
                        const renameResult = await openPopup({
                            title: i18n.t(
                                "module.study.classes.notepad_filename",
                            ),
                            body: `
                                <label class="stack">
                                    ${esc(i18n.t("module.study.classes.notepad_filename"))}
                                    <input type="text" class="classes-rename-filename-input"
                                        value="${esc(oldName)}" />
                                </label>
                            `,
                            actions: [
                                {
                                    id: "cancel",
                                    label: i18n.t("ui.reuse.cancel"),
                                    variant: "cancel",
                                },
                                {
                                    id: "rename",
                                    label: i18n.t("ui.reuse.save"),
                                    variant: "confirm",
                                },
                            ],
                        });
                        if (renameResult !== "rename") return;
                        const renameInput = document.querySelector(
                            ".classes-rename-filename-input",
                        );
                        const newName = String(
                            renameInput instanceof HTMLInputElement
                                ? renameInput.value
                                : "",
                        ).trim();
                        if (!newName || newName === oldName) return;
                        const renamed = await renameNotepadFile(
                            apiFetch,
                            snapshot.id,
                            oldName,
                            newName,
                        );
                        showToast(
                            i18n.t(
                                renamed
                                    ? "module.study.classes.notepad_file_saved"
                                    : "module.study.classes.notepad_file_save_failed",
                            ),
                            { variant: renamed ? "success" : "error" },
                        );
                        if (renamed) {
                            const fresh = await listNotepadFiles(
                                apiFetch,
                                snapshot.id,
                            );
                            const list =
                                overlay.querySelector(".classes-file-list");
                            if (list instanceof HTMLElement) {
                                const tmpl = document.createElement("div");
                                tmpl.innerHTML = renderFilePickerBody(
                                    fresh,
                                    i18n,
                                );
                                list.replaceWith(
                                    tmpl.firstElementChild ?? tmpl,
                                );
                            }
                        }
                    }
                });
            },
        });
        if ((action !== "open" && action !== "cancel") || !selectedFilename) {
            return true;
        }
        const content = await loadNotepadFile(
            apiFetch,
            snapshot.id,
            selectedFilename,
        );
        if (content === null) {
            showToast(i18n.t("module.study.classes.notepad_file_save_failed"), {
                variant: "error",
            });
            return true;
        }
        const notepadHost = document.querySelector(".classes-notepad-host");
        const notepadTextarea = notepadHost?.querySelector("textarea");
        if (notepadTextarea instanceof HTMLTextAreaElement) {
            notepadTextarea.value = content;
            notepadTextarea.dispatchEvent(
                new Event("input", { bubbles: true }),
            );
        }
        return true;
    }

    return false;
}
