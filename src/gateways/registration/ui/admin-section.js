import { createFormBuilder } from "/static/reuse/form-builder.js";
import { createFormDirtyTracker } from "/static/reuse/unsaved-changes.js";

export function createAdminSection({
    i18n,
    apiFetch,
    escapeHtml,
    onDirtyChange,
}) {
    let invitationPolicy = null;
    let publicRegistrationEnabled = false;
    let policyTracker = null;
    let policyForm = null;
    let policyFormBinding = null;
    let policyChangeHandler = null;
    const isOwner = localStorage.getItem("cognis_role") === "owner";

    const dataReady = Promise.all([
        apiFetch("/api/v1/registration/policy"),
        apiFetch("/api/v1/gateways/registration/adapters"),
    ]).then(async ([policyResponse, adaptersResponse]) => {
        if (policyResponse.ok) {
            invitationPolicy = (await policyResponse.json())?.data ?? null;
        }
        if (adaptersResponse.ok) {
            const adapters = (await adaptersResponse.json())?.data ?? [];
            publicRegistrationEnabled =
                adapters.find((adapter) => adapter.id === "public")?.enabled ===
                true;
        }
    });

    function createPolicyForm() {
        const booleanOptions = (enabled) => [
            {
                value: "true",
                label: i18n.t("ui.reuse.yes"),
                selected: enabled,
            },
            {
                value: "false",
                label: i18n.t("ui.reuse.no"),
                selected: !enabled,
            },
        ];
        return createFormBuilder(
            { i18n, escapeHtml },
            {
                formId: "registration-policy-form",
                includeSubmitButton: false,
                fields: [
                    {
                        name: "publicRegistrationEnabled",
                        labelKey:
                            "gateway.registration.public_registration_enabled",
                        type: "radio",
                        value: String(publicRegistrationEnabled),
                        options: booleanOptions(publicRegistrationEnabled),
                    },
                    {
                        name: "founderInvitesEnabled",
                        labelKey: "gateway.registration.allow_founder_invites",
                        type: "radio",
                        value: String(
                            invitationPolicy?.founderInvitesEnabled === true,
                        ),
                        options: booleanOptions(
                            invitationPolicy?.founderInvitesEnabled === true,
                        ),
                    },
                    {
                        name: "adminInvitesEnabled",
                        labelKey: "gateway.registration.allow_admin_invites",
                        type: "radio",
                        value: String(
                            invitationPolicy?.adminInvitesEnabled === true,
                        ),
                        options: booleanOptions(
                            invitationPolicy?.adminInvitesEnabled === true,
                        ),
                    },
                ],
            },
        );
    }

    function readPolicyForm() {
        const values = policyFormBinding?.getValues() ?? {};
        return {
            publicRegistrationEnabled:
                values.publicRegistrationEnabled === "true",
            founderInvitesEnabled: values.founderInvitesEnabled === "true",
            adminInvitesEnabled: values.adminInvitesEnabled === "true",
        };
    }

    function setRadioValue(fieldName, enabled) {
        policyForm
            ?.querySelectorAll(`input[name="${fieldName}"]`)
            .forEach((radio) => {
                radio.checked = radio.value === String(enabled);
            });
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
        <p>${escapeHtml(i18n.t("gateway.registration.invite.page_subtitle"))}</p>
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
            if (
                nextPolicy.publicRegistrationEnabled !==
                publicRegistrationEnabled
            ) {
                const action = nextPolicy.publicRegistrationEnabled
                    ? "enable"
                    : "disable";
                const adapterResponse = await apiFetch(
                    `/api/v1/gateways/registration/adapters/public/${action}`,
                    { method: "POST" },
                );
                if (!adapterResponse.ok)
                    throw new Error("public_registration_save_failed");
            }
            const response = await apiFetch("/api/v1/registration/policy", {
                method: "PUT",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    founderInvitesEnabled: nextPolicy.founderInvitesEnabled,
                    adminInvitesEnabled: nextPolicy.adminInvitesEnabled,
                }),
            });
            if (!response.ok)
                throw new Error("registration_policy_save_failed");
            publicRegistrationEnabled = nextPolicy.publicRegistrationEnabled;
            invitationPolicy = nextPolicy;
            resetPolicyTracker();
        },
        discard() {
            if (!policyForm || !invitationPolicy) return;
            setRadioValue(
                "publicRegistrationEnabled",
                publicRegistrationEnabled,
            );
            setRadioValue(
                "founderInvitesEnabled",
                invitationPolicy.founderInvitesEnabled === true,
            );
            setRadioValue(
                "adminInvitesEnabled",
                invitationPolicy.adminInvitesEnabled === true,
            );
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
