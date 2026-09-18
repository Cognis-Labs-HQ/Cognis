import { createFormBuilder } from "/static/reuse/form-builder.js";
import { createFormDirtyTracker } from "/static/reuse/unsaved-changes.js";

export function createAdminSection({
    i18n,
    apiFetch,
    escapeHtml,
    onDirtyChange,
}) {
    let invitationPolicy = null;
    let policyTracker = null;
    let policyForm = null;
    let policyFormBinding = null;
    let policyChangeHandler = null;
    const isOwner = localStorage.getItem("cognis_role") === "owner";

    const dataReady = apiFetch("/api/v1/registration/policy").then(
        async (response) => {
            if (!response.ok) return;
            invitationPolicy = (await response.json())?.data ?? null;
        },
    );

    function createPolicyForm() {
        return createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "registration-policy-form",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "founderInvitesEnabled",
                        labelKey: "gateway.registration.allow_founder_invites",
                        type: "checkbox",
                        value: String(
                            invitationPolicy?.founderInvitesEnabled === true,
                        ),
                        inputClassName: "choice-checkbox",
                    },
                    {
                        name: "adminInvitesEnabled",
                        labelKey: "gateway.registration.allow_admin_invites",
                        type: "checkbox",
                        value: String(
                            invitationPolicy?.adminInvitesEnabled === true,
                        ),
                        inputClassName: "choice-checkbox",
                    },
                ],
            },
        );
    }

    function readPolicyForm() {
        return {
            founderInvitesEnabled:
                policyForm?.elements.namedItem("founderInvitesEnabled")
                    ?.checked === true,
            adminInvitesEnabled:
                policyForm?.elements.namedItem("adminInvitesEnabled")
                    ?.checked === true,
        };
    }

    function resetPolicyTracker() {
        policyTracker?.destroy();
        policyFormBinding?.detach?.();
        if (policyForm && policyChangeHandler) {
            policyForm.removeEventListener("change", policyChangeHandler);
        }
        if (!policyForm) return;
        const formBuilder = createPolicyForm();
        policyFormBinding = formBuilder.attach(policyForm);
        policyTracker = createFormDirtyTracker(policyForm, { quiet: true });
        policyChangeHandler = () => {
            policyTracker.sync();
            onDirtyChange?.("registration", policyTracker.isAnyDirty());
        };
        policyForm.addEventListener("change", policyChangeHandler);
        onDirtyChange?.("registration", false);
    }

    function renderContent() {
        const policyFormHtml =
            isOwner && invitationPolicy ? createPolicyForm().render() : "";
        return `
      ${policyFormHtml}
      <div class="stack">
        <p>${escapeHtml(i18n.t("ui.app.invite.page_subtitle"))}</p>
        <div class="controls">
          <a class="btn-neutral btn-animated" href="/invite">${escapeHtml(i18n.t("ui.reuse.invite"))}</a>
        </div>
      </div>
    `;
    }

    return {
        id: "registration",
        label: i18n.t("ui.reuse.registration"),
        dataReady,
        isDirty: () => policyTracker?.isAnyDirty() === true,
        async save() {
            if (!policyForm || !policyTracker?.isAnyDirty()) return;
            const nextPolicy = readPolicyForm();
            const response = await apiFetch("/api/v1/registration/policy", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(nextPolicy),
            });
            if (!response.ok)
                throw new Error("registration_policy_save_failed");
            invitationPolicy = nextPolicy;
            resetPolicyTracker();
        },
        discard() {
            if (!policyForm || !invitationPolicy) return;
            policyForm.elements.namedItem("founderInvitesEnabled").checked =
                invitationPolicy.founderInvitesEnabled === true;
            policyForm.elements.namedItem("adminInvitesEnabled").checked =
                invitationPolicy.adminInvitesEnabled === true;
            resetPolicyTracker();
        },
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-registration-layout",
            heading: i18n.t("ui.reuse.registration"),
            elements: [
                {
                    id: "registration-settings",
                    label: i18n.t("ui.reuse.registration"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
            onRender: (root) => {
                policyForm = root.querySelector("#registration-policy-form");
                resetPolicyTracker();
            },
        },
    };
}
