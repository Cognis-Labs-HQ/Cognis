import { escapeHtml } from "/static/reuse/escape-html.js";

export async function openCreateClassPopup({
    i18n,
    apiFetch,
    openPopup,
    requireTeacherManualApproval,
}) {
    let selectedLanguageCode = "";
    let className = "";
    let studentLimit = 20;
    let reason = "";
    let joinMode = "on_request";
    let selectedAction = null;
    const languagesResponse = await apiFetch(
        "/api/v1/study/registered-languages",
    );
    const languagesPayload = languagesResponse.ok
        ? await languagesResponse.json()
        : { data: [] };
    const languageOptions = (
        Array.isArray(languagesPayload?.data) ? languagesPayload.data : []
    )
        .map((language) => {
            const languageCode = String(language?.code ?? "").trim();
            if (!languageCode) return "";
            const languageName = String(language?.name ?? "").trim();
            return `<option value="${escapeHtml(languageCode)}">${escapeHtml(languageName || languageCode)}</option>`;
        })
        .filter(Boolean)
        .join("");
    const languageNameByCode = new Map(
        (Array.isArray(languagesPayload?.data) ? languagesPayload.data : [])
            .map((language) => [
                String(language?.code ?? "").trim(),
                String(language?.name ?? "").trim(),
            ])
            .filter(([languageCode]) => Boolean(languageCode)),
    );
    const teacherDisplayName =
        String(localStorage.getItem("cognis_display_name") ?? "").trim() ||
        String(localStorage.getItem("cognis_handle") ?? "").trim() ||
        String(localStorage.getItem("cognis_username") ?? "").trim() ||
        "Teacher";
    const buildDefaultClassName = (languageCode) => {
        const languageName =
            languageNameByCode.get(String(languageCode ?? "").trim()) ||
            String(languageCode ?? "").trim() ||
            "Language";
        return `${teacherDisplayName}'s ${languageName} class`;
    };
    const initialLanguageCode = String(
        languagesPayload?.data?.[0]?.code ?? "",
    ).trim();
    selectedLanguageCode = initialLanguageCode;
    className = buildDefaultClassName(initialLanguageCode);
    const approvalReasonField = requireTeacherManualApproval
        ? `<label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.teacher_application_reason"))}
                <textarea id="classes-create-reason" class="theme-select" rows="5"></textarea>
            </label>`
        : "";
    const action = await openPopup({
        title: i18n.t("module.study.classes.create_class"),
        body: `
            <label class="stack">
                ${escapeHtml(i18n.t("ui.reuse.language"))}
                <select id="classes-create-language" class="theme-select">${languageOptions}</select>
            </label>
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.class_name_label"))}
                <input id="classes-create-name" class="theme-select" type="text" value="${escapeHtml(className)}" maxlength="120" />
            </label>
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.class_cap_label"))}
                <input id="classes-create-student-limit" class="theme-select" type="number" min="1" max="100" step="1" value="20" />
            </label>
            <label class="stack">
                ${escapeHtml(i18n.t("module.study.classes.join_mode_label"))}
                <select id="classes-create-join-mode" class="theme-select">
                    <option value="open">${escapeHtml(i18n.t("module.study.classes.join_mode_open"))}</option>
                    <option value="on_request" selected>${escapeHtml(i18n.t("module.study.classes.join_mode_on_request"))}</option>
                    <option value="invite_only">${escapeHtml(i18n.t("module.study.classes.join_mode_invite_only"))}</option>
                </select>
            </label>
            ${approvalReasonField}
        `,
        variant: "confirm",
        actions: [
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "cancel",
            },
            {
                id: "submit",
                label: i18n.t("module.study.classes.create_class"),
                variant: "confirm",
            },
        ],
        closeProtection: true,
        onAction: (actionId, overlay) => {
            if (actionId !== "submit") return true;
            const languageSelect = overlay.querySelector(
                "#classes-create-language",
            );
            const joinModeSelect = overlay.querySelector(
                "#classes-create-join-mode",
            );
            const classNameInput = overlay.querySelector(
                "#classes-create-name",
            );
            const studentLimitInput = overlay.querySelector(
                "#classes-create-student-limit",
            );
            const reasonInput = overlay.querySelector("#classes-create-reason");
            if (actionId === "submit") {
                const languageSelectForName = overlay.querySelector(
                    "#classes-create-language",
                );
                const currentLanguageCode = String(
                    languageSelectForName?.value ?? "",
                ).trim();
                if (
                    classNameInput instanceof HTMLInputElement &&
                    !classNameInput.value.trim()
                ) {
                    classNameInput.value =
                        buildDefaultClassName(currentLanguageCode);
                }
            }
            selectedLanguageCode = String(languageSelect?.value ?? "").trim();
            joinMode = String(joinModeSelect?.value ?? "on_request").trim();
            className = String(classNameInput?.value ?? "").trim();
            const parsedStudentLimit = Number(studentLimitInput?.value);
            studentLimit =
                Number.isInteger(parsedStudentLimit) &&
                parsedStudentLimit > 0 &&
                parsedStudentLimit <= 100
                    ? parsedStudentLimit
                    : 20;
            reason = String(reasonInput?.value ?? "").trim();
            selectedAction = actionId;
            if (!selectedLanguageCode) return false;
            if (!className) return false;
            if (requireTeacherManualApproval && !reason) return false;
            return true;
        },
        onOpen: (overlay) => {
            const languageSelect = overlay.querySelector(
                "#classes-create-language",
            );
            const nameInput = overlay.querySelector("#classes-create-name");
            if (
                languageSelect instanceof HTMLSelectElement &&
                nameInput instanceof HTMLInputElement
            ) {
                languageSelect.addEventListener("change", () => {
                    if (!nameInput.value.trim()) {
                        nameInput.value = buildDefaultClassName(
                            languageSelect.value,
                        );
                    }
                });
            }
        },
    });
    if (action !== "submit" || selectedAction !== "submit") {
        return null;
    }
    return {
        languageCode: selectedLanguageCode,
        className,
        studentLimit,
        joinMode,
        reason,
    };
}
