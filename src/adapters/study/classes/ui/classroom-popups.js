import { createFormBuilder } from "/static/reuse/form-builder.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { fetchProfileAvatarBlobUrl } from "/static/gateways/social/reuse/profile-avatar.js";

export async function openMemberProfilePreview({
    memberButton,
    i18n,
    apiFetch,
    openPopup,
}) {
    const handle = String(memberButton?.dataset?.studentHandle ?? "").trim();
    const fallbackName = String(
        memberButton?.dataset?.studentName ?? "",
    ).trim();
    const fallbackAvatarKey = String(
        memberButton?.dataset?.studentAvatarKey ?? "",
    ).trim();
    let profile = null;
    if (handle) {
        const profileResponse = await apiFetch(
            `/api/v1/social/users/${encodeURIComponent(handle)}/profile`,
        ).catch(() => null);
        if (profileResponse?.ok) {
            profile = (await profileResponse.json()).data ?? null;
        }
    }
    const displayName =
        String(profile?.displayName ?? "").trim() ||
        String(profile?.handle ?? "").trim() ||
        fallbackName ||
        i18n.t("module.study.classes.profile_unknown");
    const avatarKey =
        String(profile?.avatarKey ?? "").trim() || fallbackAvatarKey;
    const avatarBlobUrl = avatarKey
        ? await fetchProfileAvatarBlobUrl(avatarKey)
        : null;
    const bio = String(profile?.bio ?? "").trim();
    await openPopup({
        title: i18n.t("module.study.classes.profile_preview"),
        body: `
            <div class="stack">
                <div style="display:flex;align-items:center;gap:12px;">
                    ${
                        avatarBlobUrl
                            ? `<img src="${escapeHtml(avatarBlobUrl)}" alt="" style="width:52px;height:52px;border-radius:999px;object-fit:cover;border:1px solid var(--border);" />`
                            : `<span style="width:52px;height:52px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;background:var(--surface-2);border:1px solid var(--border);font-weight:700;">${escapeHtml(displayName.slice(0, 2).toUpperCase())}</span>`
                    }
                    <div class="stack" style="gap:2px;">
                        <strong>${escapeHtml(displayName)}</strong>
                        ${
                            handle
                                ? `<span style="color:var(--text-muted);">@${escapeHtml(handle)}</span>`
                                : ""
                        }
                    </div>
                </div>
                ${
                    bio
                        ? `<p style="margin:0;color:var(--text-muted);">${escapeHtml(bio)}</p>`
                        : ""
                }
            </div>
        `,
        actions: [
            {
                id: "close",
                label: i18n.t("ui.reuse.close"),
                variant: "confirm",
            },
        ],
    });
}

export async function openClassSettingsPopup({
    snapshot,
    i18n,
    apiFetch,
    openPopup,
    showToast,
    refreshContent,
}) {
    if (!snapshot) return;
    const rawLimit = Number(snapshot?.classroom?.studentLimit);
    const currentLimit =
        Number.isInteger(rawLimit) && rawLimit > 0 ? rawLimit : 20;
    const currentName = String(snapshot?.name ?? "").trim();
    const formBuilder = createFormBuilder(
        { i18n, escapeHtml },
        {
            formId: "classes-settings-form",
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [
                {
                    name: "className",
                    labelKey: "module.study.classes.class_name_label",
                    type: "text",
                    required: true,
                    value: currentName,
                    attributes: { maxlength: 120 },
                },
                {
                    name: "studentLimit",
                    labelKey: "module.study.classes.class_cap_label",
                    type: "number",
                    required: true,
                    value: String(currentLimit),
                    attributes: { min: 1, max: 100, step: 1 },
                },
            ],
        },
    );
    let controller = null;
    let nextClassName = currentName;
    let nextStudentLimit = currentLimit;
    const action = await openPopup({
        title: i18n.t("module.study.classes.class_settings"),
        body: formBuilder.render(),
        variant: "confirm",
        actions: [
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
        closeProtection: true,
        onOpen: (overlay) => {
            const form = overlay.querySelector("#classes-settings-form");
            controller =
                form instanceof HTMLFormElement
                    ? formBuilder.attach(form)
                    : null;
        },
        onAction: (actionId) => {
            if (actionId !== "save") return true;
            if (!controller?.validateAll(true)) return false;
            const values = controller.getValues();
            nextClassName = String(values.className ?? "").trim();
            const parsedLimit = Number(values.studentLimit ?? "");
            nextStudentLimit =
                Number.isInteger(parsedLimit) &&
                parsedLimit >= 1 &&
                parsedLimit <= 100
                    ? parsedLimit
                    : currentLimit;
            return Boolean(nextClassName);
        },
    });
    if (action !== "save") return;
    const updates = [];
    if (nextClassName !== currentName) {
        updates.push(
            apiFetch(
                `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ name: nextClassName }),
                },
            ),
        );
    }
    if (nextStudentLimit !== currentLimit) {
        updates.push(
            apiFetch(
                `/api/v1/study/classrooms/${encodeURIComponent(snapshot.id)}/layout`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ studentLimit: nextStudentLimit }),
                },
            ),
        );
    }
    if (!updates.length) return;
    const responses = await Promise.all(updates);
    const success = responses.every((response) => response.ok);
    showToast(
        i18n.t(
            success
                ? "module.study.classes.class_settings_saved"
                : "module.study.classes.class_settings_failed",
        ),
        { variant: success ? "success" : "error" },
    );
    if (success) {
        await refreshContent();
    }
}
