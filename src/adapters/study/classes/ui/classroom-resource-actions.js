/**
 * Handles save-materials, save-notebook, open-notebook, open-homework,
 * and materials-file-upload click/change interactions in the classroom.
 * Returns true if the event was handled.
 *
 * @param {Event} event
 * @param {object} deps
 * @returns {Promise<boolean>}
 */
const ALLOWED_CLASSROOM_FILE_EXTENSIONS = new Set([
    "",
    ".csv",
    ".doc",
    ".docx",
    ".gif",
    ".jpeg",
    ".jpg",
    ".json",
    ".md",
    ".pdf",
    ".png",
    ".ppt",
    ".pptx",
    ".svg",
    ".txt",
    ".webp",
    ".xls",
    ".xlsx",
]);

function formatFilenameToast(i18n, key, filename) {
    return i18n.t(key).replace("{filename}", filename);
}

export function getMaterialIcon(extension) {
    const ext = String(extension ?? "")
        .toLowerCase()
        .replace(/^\./, "");
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) {
        return "&#128444;";
    }
    if (ext === "pdf") {
        return "&#128196;";
    }
    if (["doc", "docx", "txt", "md"].includes(ext)) {
        return "&#128221;";
    }
    if (["xls", "xlsx", "csv"].includes(ext)) {
        return "&#128200;";
    }
    if (["ppt", "pptx"].includes(ext)) {
        return "&#128204;";
    }
    return "&#128196;";
}

function formatFileSize(bytes) {
    const num = Number(bytes ?? 0);
    if (!num) return "";
    if (num < 1024) return `${num} B`;
    if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
    return `${(num / (1024 * 1024)).toFixed(1)} MB`;
}

function buildUploadButtonLabel(i18n, escapeHtml) {
    return `
        <span class="classes-materials-upload-icon" aria-hidden="true">
            <img src="/static/assets/reuse/upload.svg" alt="" />
        </span>
        <span>${escapeHtml(i18n.t("module.study.classes.materials_upload"))}</span>
    `;
}

function buildLibraryFileMarkup(
    files,
    i18n,
    escapeHtml,
    autoSelectedKeys = new Set(),
) {
    if (!files.length) {
        return `<p class="classes-workspace-nothing-found">${escapeHtml(i18n.t("module.study.classes.materials_nothing_found"))}</p>`;
    }
    return `<ul class="classes-file-list">
        ${files
            .map((file) => {
                const key = String(file?.key ?? "").trim();
                const name = String(file?.name ?? "").trim();
                if (!key || !name) return "";
                const checked = autoSelectedKeys.has(key) ? " checked" : "";
                const dotIndex = key.lastIndexOf(".");
                const ext =
                    dotIndex > 0 && dotIndex < key.length - 1
                        ? key.slice(dotIndex + 1).toUpperCase()
                        : "";
                const sizeLabel = formatFileSize(file?.size);
                const dateLabel = file?.lastModified
                    ? new Date(file.lastModified).toLocaleDateString()
                    : "";
                const truncatedName =
                    name.length > 32 ? `${name.slice(0, 29)}…` : name;
                const metaParts = [ext, sizeLabel, dateLabel].filter(Boolean);
                return `<li class="classes-file-item">
                    <label class="classes-file-name" title="${escapeHtml(name)}">
                        <input type="checkbox" class="classes-library-select" value="${escapeHtml(key)}"${checked} />
                        <span class="classes-file-item-title">${escapeHtml(truncatedName)}</span>
                        ${metaParts.length ? `<span class="classes-file-item-meta">${escapeHtml(metaParts.join(" · "))}</span>` : ""}
                    </label>
                    <div class="classes-file-actions">
                        <button type="button" class="btn-cancel btn-animated classes-library-rename-btn" data-library-key="${escapeHtml(key)}">${escapeHtml(i18n.t("ui.reuse.save"))}</button>
                        <button type="button" class="btn-cancel btn-animated classes-library-delete-btn" data-library-key="${escapeHtml(key)}">${escapeHtml(i18n.t("ui.reuse.delete"))}</button>
                    </div>
                </li>`;
            })
            .join("")}
    </ul>`;
}

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

    if (event.target.closest(".classes-material-unlink-btn")) {
        if (!snapshot) return true;
        const unlinkButton = event.target.closest(
            ".classes-material-unlink-btn",
        );
        const materialIndex = Number(unlinkButton?.dataset.materialIndex ?? -1);
        const existingFiles = Array.isArray(classResources.files)
            ? [...classResources.files]
            : [];
        if (materialIndex < 0 || materialIndex >= existingFiles.length) {
            return true;
        }
        const confirmResult = await openPopup({
            title: i18n.t("module.study.classes.class_materials"),
            body: `<p>${escapeHtml(i18n.t("ui.reuse.confirm"))}</p>`,
            actions: [
                {
                    id: "cancel",
                    label: i18n.t("ui.reuse.cancel"),
                    variant: "cancel",
                },
                {
                    id: "unlink",
                    label: i18n.t("ui.reuse.remove"),
                    variant: "confirm",
                },
            ],
        });
        if (confirmResult !== "unlink") {
            return true;
        }
        existingFiles.splice(materialIndex, 1);
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ files: existingFiles }),
            },
        ).catch(() => null);
        if (response?.ok) {
            classResources.files = existingFiles;
            await loadSelectedClassMeta();
            refreshDom();
        }
        return true;
    }

    if (event.target.closest(".classes-material-add-btn")) {
        if (!snapshot) return true;
        if (root?.dataset.materialsPopupOpen === "true") {
            return true;
        }
        const listLibrary = async () => {
            const response = await apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/materials/library`,
            ).catch(() => null);
            if (!response?.ok) return [];
            const payload = await response.json().catch(() => ({ data: [] }));
            return Array.isArray(payload?.data) ? payload.data : [];
        };
        const uploadLibraryFiles = async (files) => {
            const uploadedKeys = [];
            for (const file of files) {
                const extensionStart = String(file.name ?? "").lastIndexOf(".");
                const ext =
                    extensionStart >= 0
                        ? String(file.name)
                              .slice(extensionStart)
                              .toLowerCase()
                              .replace(/[^.a-z0-9]/g, "")
                        : "";
                if (!ALLOWED_CLASSROOM_FILE_EXTENSIONS.has(ext)) {
                    continue;
                }
                const key = `teacher-materials/${encodeURIComponent(snapshot.teacherAccountId ?? "")}/${crypto.randomUUID()}${ext}`;
                const response = await apiFetch(`/api/v1/files/${key}`, {
                    method: "PUT",
                    headers: {
                        "content-type": file.type || "application/octet-stream",
                    },
                    body: await file.arrayBuffer(),
                }).catch(() => null);
                if (response?.ok) {
                    uploadedKeys.push(key);
                    showToast(
                        formatFilenameToast(
                            i18n,
                            "module.study.classes.materials_upload_success",
                            file.name,
                        ),
                        { variant: "success" },
                    );
                } else {
                    showToast(
                        formatFilenameToast(
                            i18n,
                            "module.study.classes.materials_upload_failed",
                            file.name,
                        ),
                        { variant: "error" },
                    );
                }
            }
            return uploadedKeys;
        };
        let libraryFiles = await listLibrary();
        let selectedKeys = [];
        const autoSelectedKeys = new Set();
        root.dataset.materialsPopupOpen = "true";
        let action = null;
        try {
            action = await openPopup({
                title: i18n.t("module.study.classes.teacher_materials"),
                body: `
                <div class="stack">
                    <button type="button" class="btn-animated classes-materials-upload-btn">${buildUploadButtonLabel(i18n, escapeHtml)}</button>
                    <div class="classes-library-file-list">${buildLibraryFileMarkup(libraryFiles, i18n, escapeHtml, autoSelectedKeys)}</div>
                </div>`,
                actions: [
                    {
                        id: "cancel",
                        label: i18n.t("ui.reuse.cancel"),
                        variant: "cancel",
                    },
                    {
                        id: "add",
                        label: i18n.t("ui.reuse.add"),
                        variant: "confirm",
                    },
                ],
                onOpen: (overlay) => {
                    const hiddenInput = document.createElement("input");
                    hiddenInput.type = "file";
                    hiddenInput.multiple = true;
                    hiddenInput.style.display = "none";
                    overlay.appendChild(hiddenInput);

                    hiddenInput.addEventListener("change", async () => {
                        if (!hiddenInput.files?.length) return;
                        const uploadedKeys = await uploadLibraryFiles(
                            Array.from(hiddenInput.files),
                        );
                        for (const key of uploadedKeys) {
                            autoSelectedKeys.add(key);
                        }
                        libraryFiles = await listLibrary();
                        const listWrap = overlay.querySelector(
                            ".classes-library-file-list",
                        );
                        if (listWrap instanceof HTMLElement) {
                            listWrap.innerHTML = buildLibraryFileMarkup(
                                libraryFiles,
                                i18n,
                                escapeHtml,
                                autoSelectedKeys,
                            );
                        }
                        hiddenInput.value = "";
                    });

                    overlay.addEventListener("click", async (clickEvent) => {
                        if (
                            clickEvent.target.closest(
                                ".classes-materials-upload-btn",
                            )
                        ) {
                            hiddenInput.value = "";
                            hiddenInput.click();
                            return;
                        }
                        const renameButton = clickEvent.target.closest(
                            ".classes-library-rename-btn[data-library-key]",
                        );
                        if (renameButton instanceof HTMLElement) {
                            const key = String(
                                renameButton.dataset.libraryKey ?? "",
                            ).trim();
                            if (!key) return;
                            await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/materials/library/rename`,
                                {
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({ key }),
                                },
                            ).catch(() => null);
                            libraryFiles = await listLibrary();
                            const listWrap = overlay.querySelector(
                                ".classes-library-file-list",
                            );
                            if (listWrap instanceof HTMLElement) {
                                listWrap.innerHTML = buildLibraryFileMarkup(
                                    libraryFiles,
                                    i18n,
                                    escapeHtml,
                                    autoSelectedKeys,
                                );
                            }
                            return;
                        }
                        const deleteButton = clickEvent.target.closest(
                            ".classes-library-delete-btn[data-library-key]",
                        );
                        if (deleteButton instanceof HTMLElement) {
                            const key = String(
                                deleteButton.dataset.libraryKey ?? "",
                            ).trim();
                            if (!key) return;
                            await apiFetch(
                                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/materials/library/delete`,
                                {
                                    method: "POST",
                                    headers: {
                                        "content-type": "application/json",
                                    },
                                    body: JSON.stringify({ key }),
                                },
                            ).catch(() => null);
                            autoSelectedKeys.delete(key);
                            libraryFiles = await listLibrary();
                            const listWrap = overlay.querySelector(
                                ".classes-library-file-list",
                            );
                            if (listWrap instanceof HTMLElement) {
                                listWrap.innerHTML = buildLibraryFileMarkup(
                                    libraryFiles,
                                    i18n,
                                    escapeHtml,
                                    autoSelectedKeys,
                                );
                            }
                        }
                    });
                },
                onAction: (actionId, overlay) => {
                    if (actionId !== "add") return true;
                    const checkedKeys = Array.from(
                        overlay.querySelectorAll(
                            ".classes-library-select:checked",
                        ),
                    ).map((checkbox) => String(checkbox.value ?? "").trim());
                    const merged = new Set([
                        ...autoSelectedKeys,
                        ...checkedKeys,
                    ]);
                    selectedKeys = [...merged].filter(Boolean);
                    return true;
                },
            });
        } finally {
            delete root.dataset.materialsPopupOpen;
        }
        if (action !== "add") return true;
        const existingFiles = Array.isArray(classResources.files)
            ? [...classResources.files]
            : [];
        const existingByKey = new Set(
            existingFiles.map((file) => String(file?.key ?? "").trim()),
        );
        for (const key of selectedKeys) {
            const keyText = String(key ?? "").trim();
            if (!keyText || existingByKey.has(keyText)) continue;
            const match = libraryFiles.find(
                (entry) => String(entry?.key ?? "").trim() === keyText,
            );
            existingFiles.push({
                key: keyText,
                name:
                    String(match?.name ?? "").trim() ||
                    decodeURIComponent(keyText.split("/").pop() ?? keyText),
                contentType:
                    String(match?.contentType ?? "").trim() || undefined,
            });
        }
        const response = await apiFetch(
            `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}/resources`,
            {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ files: existingFiles }),
            },
        ).catch(() => null);
        if (response?.ok) {
            classResources.files = existingFiles;
            await loadSelectedClassMeta();
            refreshDom();
        }
        return true;
    }

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
            const filename = String(file.name ?? "").trim();
            const extensionStart = filename.lastIndexOf(".");
            const ext =
                extensionStart >= 0
                    ? filename
                          .slice(extensionStart)
                          .toLowerCase()
                          .replace(/[^.a-z0-9]/g, "")
                    : "";
            if (!ALLOWED_CLASSROOM_FILE_EXTENSIONS.has(ext)) {
                showToast(
                    formatFilenameToast(
                        i18n,
                        "module.study.classes.materials_upload_failed",
                        file.name,
                    ),
                    { variant: "error" },
                );
                continue;
            }
            const uniqueId = crypto.randomUUID();
            const key = `classes/${encodeURIComponent(snapshot.id)}/${uniqueId}${ext}`;
            const uploadResponse = await apiFetch(`/api/v1/files/${key}`, {
                method: "PUT",
                headers: {
                    "content-type": file.type || "application/octet-stream",
                },
                body: await file.arrayBuffer(),
            }).catch(() => null);
            if (!uploadResponse?.ok) {
                showToast(
                    formatFilenameToast(
                        i18n,
                        "module.study.classes.materials_upload_failed",
                        file.name,
                    ),
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

    return false;
}
