import { escapeHtml } from "/static/reuse/escape-html.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";

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
    const createClassFields = [
        {
            name: "languageCode",
            labelKey: "ui.reuse.language",
            type: "select",
            required: true,
            value: selectedLanguageCode,
            options: (Array.isArray(languagesPayload?.data)
                ? languagesPayload.data
                : []
            )
                .map((language) => {
                    const languageCode = String(language?.code ?? "").trim();
                    if (!languageCode) return null;
                    const languageName = String(language?.name ?? "").trim();
                    return {
                        value: languageCode,
                        label: languageName || languageCode,
                    };
                })
                .filter(Boolean),
        },
        {
            name: "className",
            labelKey: "module.study.classes.class_name_label",
            type: "text",
            required: true,
            value: className,
            attributes: { maxlength: 120 },
        },
        {
            name: "studentLimit",
            labelKey: "module.study.classes.class_cap_label",
            type: "number",
            required: true,
            value: String(studentLimit),
            attributes: { min: 1, max: 100, step: 1 },
        },
        {
            name: "joinMode",
            labelKey: "module.study.classes.join_mode_label",
            type: "select",
            required: true,
            value: joinMode,
            options: [
                {
                    value: "open",
                    label: i18n.t("module.study.classes.join_mode_open"),
                },
                {
                    value: "on_request",
                    label: i18n.t("module.study.classes.join_mode_on_request"),
                },
                {
                    value: "invite_only",
                    label: i18n.t("module.study.classes.join_mode_invite_only"),
                },
            ],
        },
    ];
    if (requireTeacherManualApproval) {
        createClassFields.push({
            name: "reason",
            labelKey: "module.study.classes.teacher_application_reason",
            type: "textarea",
            required: true,
            value: reason,
            attributes: { rows: 5 },
        });
    }
    const createClassFormBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "classes-create-class-form",
            includeSubmitButton: false,
            submitLabelKey: "module.study.classes.create_class",
            fields: createClassFields,
        },
    );
    let createClassFormController = null;
    const action = await openPopup({
        title: i18n.t("module.study.classes.create_class"),
        body: createClassFormBuilder.render(),
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
            if (!createClassFormController?.validateAll(true)) {
                return false;
            }
            const fieldValues = createClassFormController.getValues();
            selectedLanguageCode = String(fieldValues.languageCode ?? "").trim();
            joinMode = String(fieldValues.joinMode ?? "on_request").trim();
            className = String(fieldValues.className ?? "").trim();
            const parsedStudentLimit = Number(fieldValues.studentLimit ?? "");
            studentLimit =
                Number.isInteger(parsedStudentLimit) &&
                parsedStudentLimit > 0 &&
                parsedStudentLimit <= 100
                    ? parsedStudentLimit
                    : 20;
            reason = String(fieldValues.reason ?? "").trim();
            selectedAction = actionId;
            if (!selectedLanguageCode) return false;
            if (!className) return false;
            if (requireTeacherManualApproval && !reason) return false;
            return true;
        },
        onOpen: (overlay) => {
            const popupForm = overlay.querySelector("#classes-create-class-form");
            createClassFormController =
                popupForm instanceof HTMLFormElement
                    ? createClassFormBuilder.attach(popupForm)
                    : null;
            const languageSelect = overlay.querySelector(
                '[name="languageCode"]',
            );
            const nameInput = overlay.querySelector('[name="className"]');
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
