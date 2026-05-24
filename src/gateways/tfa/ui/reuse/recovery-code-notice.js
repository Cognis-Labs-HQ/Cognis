const RECOVERY_CODE_NOTICE_STORAGE_KEY = "cognis_recovery_code_notice";

export function persistRecoveryCodeUsageNotice(loginData) {
    if (!loginData || loginData.usedRecoveryCode !== true) {
        return;
    }
    const remainingCount = Number.isFinite(loginData.recoveryCodesRemaining)
        ? Number(loginData.recoveryCodesRemaining)
        : null;
    sessionStorage.setItem(
        RECOVERY_CODE_NOTICE_STORAGE_KEY,
        JSON.stringify({
            usedRecoveryCode: true,
            recoveryCodesRemaining: remainingCount,
        }),
    );
}

export function renderRecoveryCodeUsageToasts({ i18n, showToast }) {
    const rawNotice = sessionStorage.getItem(RECOVERY_CODE_NOTICE_STORAGE_KEY);
    if (!rawNotice) {
        return;
    }
    sessionStorage.removeItem(RECOVERY_CODE_NOTICE_STORAGE_KEY);
    let notice = null;
    try {
        notice = JSON.parse(rawNotice);
    } catch {
        notice = null;
    }
    if (notice?.usedRecoveryCode !== true) {
        return;
    }
    const remainingCount = Number.isFinite(notice.recoveryCodesRemaining)
        ? Number(notice.recoveryCodesRemaining)
        : null;
    showToast(i18n.t("ui.app.login.tfa.recovery_code_used"), {
        variant: "info",
    });
    if (remainingCount === null) {
        return;
    }
    if (remainingCount <= 1) {
        showToast(
            i18n
                .t("ui.app.login.tfa.recovery_code_remaining_critical")
                .replace("{count}", String(remainingCount)),
            {
                variant: "error",
                permanent: true,
                linkHref: "/settings#security",
                linkLabel: i18n.t(
                    "ui.app.login.tfa.recovery_code_open_security",
                ),
            },
        );
        return;
    }
    if (remainingCount === 2) {
        showToast(
            i18n
                .t("ui.app.login.tfa.recovery_code_remaining_low")
                .replace("{count}", String(remainingCount)),
            {
                variant: "warning",
            },
        );
    }
}
