export function createAdminSection({ i18n, escapeHtml }) {
    const dataReady = Promise.resolve();

    function renderContent() {
        return `
      <div class="security-settings-form">
        <p class="security-field-hint">${escapeHtml(i18n.t("ui.app.invite.page_subtitle"))}</p>
        <div class="security-field-row">
          <a class="btn-confirm btn-animated" href="/invite">${escapeHtml(i18n.t("ui.reuse.menu.invite"))}</a>
        </div>
      </div>
    `;
    }

    return {
        id: "registration",
        label: i18n.t("ui.reuse.menu.registration"),
        dataReady,
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-registration-layout",
            heading: i18n.t("ui.reuse.menu.registration"),
            elements: [
                {
                    id: "registration-settings",
                    label: i18n.t("ui.reuse.menu.registration"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
        },
    };
}
