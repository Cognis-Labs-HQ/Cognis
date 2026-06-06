/**
 * Classes page — framework for per-language class management.
 *
 * For teachers: lists their assigned classes per language, supports language
 * filtering, and provides per-class student management (members, join requests,
 * invitations) and entry points to the class chat room.
 *
 * For teachers: provides a form to request creation of a new classroom for a language.
 * Requests are queued for admin approval when manual approval is enabled.
 *
 * @module app/classes
 */

import { apiFetch } from "/static/reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { openPopup } from "/static/reuse/popup.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { isTeacherScope } from "/static/reuse/access-role.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.study.classes.page_title");

    let classes = [];
    let availableStudyLanguages = [];
    let requireTeacherManualApproval = true;
    let isTeacher = isTeacherScope();
    let selectedLanguageFilter = "";
    let managingClassId = "";
    let managePanelMembers = [];
    let managePanelRequests = [];
    let pendingTeacherRequests = [];

    if (!isTeacher) {
        try {
            const accountId = localStorage.getItem("cognis_account");
            if (accountId) {
                const response = await apiFetch(
                    `/api/v1/users/${encodeURIComponent(accountId)}/info`,
                );
                if (response.ok) {
                    const payload = await response.json();
                    const refreshedRole = String(
                        payload?.data?.role ?? "",
                    ).trim();
                    localStorage.setItem("cognis_role", refreshedRole);
                    isTeacher = isTeacherScope();
                }
            }
        } catch {
            isTeacher = false;
        }
    }

    if (!isTeacher) {
        navigateTo("/dashboard");
        return;
    }

    async function loadClasses() {
        if (!isTeacher) return;
        try {
            const languageParam = selectedLanguageFilter
                ? `?language=${encodeURIComponent(selectedLanguageFilter)}`
                : "";
            const response = await apiFetch(
                `/api/v1/study/classes${languageParam}`,
            );
            if (response.ok) {
                const payload = await response.json();
                classes = payload?.data ?? [];
            }
        } catch {
            classes = [];
        }
    }

    async function loadStudyLanguages() {
        try {
            const response = await apiFetch(
                "/api/v1/study/registered-languages",
            );
            if (response.ok) {
                const payload = await response.json();
                availableStudyLanguages = Array.isArray(payload?.data)
                    ? payload.data
                    : [];
            }
        } catch {
            availableStudyLanguages = [];
        }
    }

    async function loadTeacherApplicationPolicy() {
        try {
            const response = await apiFetch("/api/v1/system/security");
            if (!response.ok) return;
            const payload = await response.json();
            requireTeacherManualApproval =
                payload?.data?.requireTeacherManualApproval !== false;
        } catch {
            requireTeacherManualApproval = true;
        }

        async function loadPendingTeacherRequests() {
            try {
                const response = await apiFetch(
                    "/api/v1/study/teacher-requests?scope=mine",
                );
                if (!response.ok) {
                    pendingTeacherRequests = [];
                    return;
                }
                const payload = await response.json();
                pendingTeacherRequests = Array.isArray(payload?.data)
                    ? payload.data
                    : [];
            } catch {
                pendingTeacherRequests = [];
            }
        }
    }

    async function loadManagePanel(classId) {
        try {
            const [membersResponse, requestsResponse] = await Promise.all([
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(classId)}/members`,
                ),
                apiFetch(
                    `/api/v1/study/classes/${encodeURIComponent(classId)}/join-requests`,
                ),
            ]);
            managePanelMembers = membersResponse.ok
                ? ((await membersResponse.json())?.data ?? [])
                : [];
            managePanelRequests = requestsResponse.ok
                ? ((await requestsResponse.json())?.data ?? [])
                : [];
        } catch {
            managePanelMembers = [];
            managePanelRequests = [];
        }
    }

    await Promise.all([
        loadClasses(),
        loadStudyLanguages(),
        loadTeacherApplicationPolicy(),
        loadPendingTeacherRequests(),
    ]);

    function buildFilterLanguages() {
        return [...new Set(classes.map((cls) => cls.languageCode))].sort();
    }

    function renderFilterRow(allLanguages) {
        if (!allLanguages.length) return "";
        const allPill = `
          <button
            type="button"
            class="classes-filter-pill${selectedLanguageFilter === "" ? " active" : ""}"
            data-filter-language=""
          >${escapeHtml(i18n.t("module.study.classes.all_languages"))}</button>
        `;
        const pills = allLanguages
            .map(
                (language) => `
          <button
            type="button"
            class="classes-filter-pill${selectedLanguageFilter === language ? " active" : ""}"
            data-filter-language="${escapeHtml(language)}"
          >${escapeHtml(language)}</button>
        `,
            )
            .join("");
        return `<div class="classes-filter-row">${allPill}${pills}</div>`;
    }

    function renderMemberItems(members) {
        if (!members.length) {
            return `<li class="classes-member-item"><span>${escapeHtml(i18n.t("module.study.classes.no_members"))}</span></li>`;
        }
        return members
            .map(
                (member) => `
              <li class="classes-member-item">
                <span>${escapeHtml(member.studentAccountId)}</span>
                <span class="classes-status-badge member">${escapeHtml(i18n.t("module.study.classes.members_section"))}</span>
              </li>
            `,
            )
            .join("");
    }

    function renderManagePanel(classId) {
        if (managingClassId !== classId) return "";
        const memberItems = renderMemberItems(managePanelMembers);

        const requestItems = managePanelRequests.length
            ? managePanelRequests
                  .map(
                      (request) => `
              <li class="classes-member-item">
                <span>${escapeHtml(request.studentAccountId)}</span>
                <span class="classes-status-badge pending">${escapeHtml(i18n.t("module.study.classes.join_pending"))}</span>
                <div class="classes-actions">
                  <button
                    type="button"
                    class="btn-confirm btn-animated classes-approve-btn"
                    data-class-id="${escapeHtml(classId)}"
                    data-student-id="${escapeHtml(request.studentAccountId)}"
                  >${escapeHtml(i18n.t("module.study.classes.approve"))}</button>
                  <button
                    type="button"
                    class="btn-cancel btn-animated classes-reject-btn"
                    data-class-id="${escapeHtml(classId)}"
                    data-student-id="${escapeHtml(request.studentAccountId)}"
                  >${escapeHtml(i18n.t("module.study.classes.reject"))}</button>
                </div>
              </li>
            `,
                  )
                  .join("")
            : `<li class="classes-member-item"><span>${escapeHtml(i18n.t("module.study.classes.no_join_requests"))}</span></li>`;

        return `
          <div class="classes-manage-panel">
            <div>
              <h4 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.members_section"))}</h4>
              <input
                type="text"
                class="classes-search-input classes-members-search"
                placeholder="${escapeHtml(i18n.t("module.study.classes.search_students"))}"
                data-class-id="${escapeHtml(classId)}"
              />
              <ul class="classes-member-list">${memberItems}</ul>
            </div>
            <div>
              <h4 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.join_requests"))}</h4>
              <ul class="classes-member-list">${requestItems}</ul>
            </div>
            <button
              type="button"
              class="btn-confirm btn-animated classes-invite-btn"
              data-class-id="${escapeHtml(classId)}"
            >${escapeHtml(i18n.t("module.study.classes.invite_student"))}</button>
          </div>
        `;
    }

    function renderClassList() {
        const allLanguages = buildFilterLanguages();
        const filterRow = renderFilterRow(allLanguages);
        const pendingItems = pendingTeacherRequests.length
            ? `<ul class="classes-list">
                  ${pendingTeacherRequests
                      .map(
                          (request) => `
                    <li class="classes-item">
                      <span class="classes-language">${escapeHtml(request.className || request.languageCode)}</span>
                      <span class="classes-status-badge pending">${escapeHtml(i18n.t("module.study.classes.join_pending"))}</span>
                    </li>
                  `,
                      )
                      .join("")}
              </ul>`
            : "";
        if (!classes.length && !pendingTeacherRequests.length) {
            return `
              ${filterRow}
              <p class="classes-empty">${escapeHtml(i18n.t("module.study.classes.empty"))}</p>
            `;
        }
        const items = classes
            .map(
                (cls) => `
          <li class="classes-item">
            <span class="classes-language">${escapeHtml(cls.languageCode)}</span>
            <span class="classes-member-count">(${escapeHtml(String(cls.memberCount ?? 0))} ${escapeHtml(i18n.t("module.study.classes.members_section"))})</span>
            <div class="classes-actions">
              <button
                type="button"
                class="btn-confirm btn-animated classes-chat-btn"
                data-class-id="${escapeHtml(cls.id)}"
              >${escapeHtml(i18n.t("module.study.classes.open_chat"))}</button>
              <button
                type="button"
                class="classes-meeting-btn"
                data-class-id="${escapeHtml(cls.id)}"
                disabled
                title="${escapeHtml(i18n.t("ui.reuse.coming_soon"))}"
              >${escapeHtml(i18n.t("module.study.classes.open_meeting"))}</button>
              <button
                type="button"
                class="btn-confirm btn-animated classes-manage-btn"
                data-class-id="${escapeHtml(cls.id)}"
              >${escapeHtml(i18n.t("module.study.classes.manage_students"))}</button>
            </div>
            ${renderManagePanel(cls.id)}
          </li>
        `,
            )
            .join("");
        const classItems = items ? `<ul class="classes-list">${items}</ul>` : "";
        return `${filterRow}${pendingItems}${classItems}`;
    }

    function renderRequestForm() {
        const options = availableStudyLanguages
            .map((language) => {
                const languageCode = String(language?.code ?? "").trim();
                if (!languageCode) return "";
                const languageName = String(language?.name ?? "").trim();
                const languageFlag = String(language?.flag ?? "").trim();
                const label = `${languageFlag ? `${languageFlag} ` : ""}${languageName || languageCode}`;
                return `<option value="${escapeHtml(languageCode)}">${escapeHtml(label)}</option>`;
            })
            .filter(Boolean)
            .join("");
        const languageDisabledAttr = options ? "" : " disabled";
        return `
          <div class="classes-request-form">
            <h3 class="classes-section-heading">${escapeHtml(i18n.t("module.study.classes.create_class"))}</h3>
            <div class="classes-request-row">
              <select class="theme-select classes-language-select" aria-label="${escapeHtml(i18n.t("ui.reuse.language"))}"${languageDisabledAttr}>
                ${options}
              </select>
              <button type="button" class="btn-confirm btn-animated classes-create-class-btn" aria-label="${escapeHtml(i18n.t("module.study.classes.create_class"))}" title="${escapeHtml(i18n.t("module.study.classes.create_class"))}"${languageDisabledAttr}>
                +
              </button>
            </div>
          </div>
        `;
    }

    async function openCreateClassPopup(defaultLanguageCode = "") {
        let selectedLanguageCode = defaultLanguageCode;
        let reason = "";
        const languageOptions = availableStudyLanguages
            .map((language) => {
                const languageCode = String(language?.code ?? "").trim();
                if (!languageCode) return "";
                const languageName = String(language?.name ?? "").trim();
                const languageFlag = String(language?.flag ?? "").trim();
                const label = `${languageFlag ? `${languageFlag} ` : ""}${languageName || languageCode}`;
                const selected =
                    selectedLanguageCode === languageCode ? " selected" : "";
                return `<option value="${escapeHtml(languageCode)}"${selected}>${escapeHtml(label)}</option>`;
            })
            .filter(Boolean)
            .join("");
        const reasonField = requireTeacherManualApproval
            ? `<label class="stack">
                    ${escapeHtml(i18n.t("module.study.classes.teacher_application_reason"))}
                    <textarea id="classes-teacher-reason" class="theme-select" rows="5" required></textarea>
                </label>`
            : "";
        const action = await openPopup({
            title: i18n.t("module.study.classes.create_class"),
            body: `
                <label class="stack">
                    ${escapeHtml(i18n.t("ui.reuse.language"))}
                    <select id="classes-teacher-language" class="theme-select">${languageOptions}</select>
                </label>
                ${reasonField}
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
                    label: i18n.t("module.study.classes.submit_application"),
                    variant: "confirm",
                },
            ],
            closeProtection: true,
            onAction: (actionId, overlay) => {
                if (actionId !== "submit") return true;
                const languageSelect = overlay.querySelector(
                    "#classes-teacher-language",
                );
                selectedLanguageCode = languageSelect?.value?.trim() ?? "";
                if (!selectedLanguageCode) return false;
                if (!requireTeacherManualApproval) return true;
                const reasonInput = overlay.querySelector(
                    "#classes-teacher-reason",
                );
                reason = reasonInput?.value?.trim() ?? "";
                return Boolean(reason);
            },
        });
        if (action !== "submit") return null;
        return {
            languageCode: selectedLanguageCode,
            reason: requireTeacherManualApproval ? reason : "",
        };
    }

    const classListElement = {
        id: "class-list",
        title: i18n.t("module.study.classes.page_title"),
        render() {
            return `<div class="classes-section">${
                (isTeacher ? renderClassList() : "") + renderRequestForm()
            }</div>`;
        },
        onRender() {
            const section = root.querySelector(".classes-section");
            if (!(section instanceof HTMLElement)) return;
            if (section.dataset.bound === "true") return;
            section.dataset.bound = "true";

            function refreshSection() {
                section.innerHTML =
                    (isTeacher ? renderClassList() : "") + renderRequestForm();
            }

            section.addEventListener(
                "click",
                async (event) => {
                    if (!(event.target instanceof Element)) return;

                    const filterButton = event.target.closest(
                        "[data-filter-language]",
                    );
                    if (filterButton instanceof HTMLElement) {
                        selectedLanguageFilter =
                            filterButton.dataset.filterLanguage ?? "";
                        await loadClasses();
                        refreshSection();
                        return;
                    }

                    const manageButton = event.target.closest(
                        ".classes-manage-btn",
                    );
                    if (manageButton instanceof HTMLElement) {
                        const classId = manageButton.dataset.classId ?? "";
                        if (managingClassId === classId) {
                            managingClassId = "";
                            refreshSection();
                        } else {
                            managingClassId = classId;
                            await loadManagePanel(classId);
                            refreshSection();
                        }
                        return;
                    }

                    const chatButton =
                        event.target.closest(".classes-chat-btn");
                    if (chatButton instanceof HTMLElement) {
                        const classId = chatButton.dataset.classId ?? "";
                        navigateTo(
                            `/messages?class=${encodeURIComponent(classId)}`,
                        );
                        return;
                    }

                    const approveButton = event.target.closest(
                        ".classes-approve-btn",
                    );
                    if (approveButton instanceof HTMLElement) {
                        const classId = approveButton.dataset.classId ?? "";
                        const studentId = approveButton.dataset.studentId ?? "";
                        const response = await apiFetch(
                            `/api/v1/study/classes/${encodeURIComponent(classId)}/join-requests/${encodeURIComponent(studentId)}/approve`,
                            { method: "POST" },
                        );
                        showToast(
                            i18n.t(
                                response.ok
                                    ? "module.study.classes.request_approved"
                                    : "module.study.classes.request_review_failed",
                            ),
                            { variant: response.ok ? "success" : "error" },
                        );
                        if (response.ok) {
                            await Promise.allSettled([
                                loadClasses(),
                                loadManagePanel(classId),
                            ]);
                            refreshSection();
                        }
                        return;
                    }

                    const rejectButton = event.target.closest(
                        ".classes-reject-btn",
                    );
                    if (rejectButton instanceof HTMLElement) {
                        const classId = rejectButton.dataset.classId ?? "";
                        const studentId = rejectButton.dataset.studentId ?? "";
                        const response = await apiFetch(
                            `/api/v1/study/classes/${encodeURIComponent(classId)}/join-requests/${encodeURIComponent(studentId)}/reject`,
                            { method: "POST" },
                        );
                        showToast(
                            i18n.t(
                                response.ok
                                    ? "module.study.classes.request_rejected"
                                    : "module.study.classes.request_review_failed",
                            ),
                            { variant: response.ok ? "success" : "error" },
                        );
                        if (response.ok) {
                            await loadManagePanel(classId);
                            refreshSection();
                        }
                        return;
                    }

                    const inviteButton = event.target.closest(
                        ".classes-invite-btn",
                    );
                    if (inviteButton instanceof HTMLElement) {
                        const classId = inviteButton.dataset.classId ?? "";
                        let inviteAccountId = "";
                        const inviteAction = await openPopup({
                            title: i18n.t(
                                "module.study.classes.invite_student",
                            ),
                            body: `
                                <label class="stack">
                                    ${escapeHtml(i18n.t("module.study.classes.invite_student"))}
                                    <input
                                        id="classes-invite-input"
                                        type="text"
                                        class="theme-select"
                                        placeholder="${escapeHtml(i18n.t("module.study.classes.invite_placeholder"))}"
                                    />
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
                                    id: "invite",
                                    label: i18n.t(
                                        "module.study.classes.invite_student",
                                    ),
                                    variant: "confirm",
                                },
                            ],
                            closeProtection: true,
                            onAction: (actionId, overlay) => {
                                if (actionId !== "invite") return true;
                                const input = overlay.querySelector(
                                    "#classes-invite-input",
                                );
                                inviteAccountId = input?.value?.trim() ?? "";
                                return true;
                            },
                        });
                        if (inviteAction !== "invite" || !inviteAccountId)
                            return;
                        const response = await apiFetch(
                            `/api/v1/study/classes/${encodeURIComponent(classId)}/invite`,
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                    accountId: inviteAccountId,
                                }),
                            },
                        );
                        if (response.ok) {
                            showToast(
                                i18n.t("module.study.classes.invite_success"),
                                { variant: "success" },
                            );
                            await Promise.allSettled([
                                loadClasses(),
                                loadManagePanel(classId),
                            ]);
                            refreshSection();
                        } else if (response.status === 404) {
                            showToast(
                                i18n.t("module.study.classes.invite_not_found"),
                                { variant: "error" },
                            );
                        } else {
                            showToast(
                                i18n.t("module.study.classes.invite_failed"),
                                { variant: "error" },
                            );
                        }
                        return;
                    }

                    const createClassButton = event.target.closest(
                        ".classes-create-class-btn",
                    );
                    if (!createClassButton) return;
                    const languageSelect = section.querySelector(
                        ".classes-language-select",
                    );
                    const popupInput = await openCreateClassPopup(
                        languageSelect?.value?.trim() ?? "",
                    );
                    if (!popupInput?.languageCode) return;

                    try {
                        const response = await apiFetch(
                            "/api/v1/study/teacher-requests",
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({
                                    languageCode: popupInput.languageCode,
                                    reason: popupInput.reason,
                                }),
                            },
                        );
                        if (response.ok) {
                            showToast(
                                i18n.t("module.study.classes.request_sent"),
                                { variant: "success" },
                            );
                            await Promise.allSettled([
                                loadClasses(),
                                loadPendingTeacherRequests(),
                            ]);
                            refreshSection();
                        } else {
                            showToast(
                                i18n.t("module.study.classes.request_failed"),
                                { variant: "error" },
                            );
                        }
                    } catch {
                        showToast(
                            i18n.t("module.study.classes.request_failed"),
                            { variant: "error" },
                        );
                    }
                },
                { signal },
            );

            section.addEventListener(
                "input",
                async (event) => {
                    if (!(event.target instanceof HTMLInputElement)) return;
                    if (
                        !event.target.classList.contains(
                            "classes-members-search",
                        )
                    )
                        return;
                    const classId = event.target.dataset.classId ?? "";
                    const searchQuery = event.target.value.trim();
                    try {
                        const searchParam = searchQuery
                            ? `?search=${encodeURIComponent(searchQuery)}`
                            : "";
                        const response = await apiFetch(
                            `/api/v1/study/classes/${encodeURIComponent(classId)}/members${searchParam}`,
                        );
                        if (response.ok) {
                            managePanelMembers =
                                (await response.json())?.data ?? [];
                            const panel = section.querySelector(
                                ".classes-manage-panel",
                            );
                            if (panel) {
                                const memberList = panel.querySelector(
                                    ".classes-member-list",
                                );
                                if (memberList) {
                                    memberList.innerHTML =
                                        renderMemberItems(managePanelMembers);
                                }
                            }
                        }
                    } catch {
                        // search failure is non-fatal; current list remains visible
                    }
                },
                { signal },
            );
        },
        gridSize: { default: [6, 4], min: [2, 2], max: "full" },
    };

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [classListElement],
        preferenceKey: "classes-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.study.classes.page_title"),
            subtitle: i18n.t("module.study.classes.page_subtitle"),
        },
    });

    await composer.init();
}

await mountWhenDirect(mount);
