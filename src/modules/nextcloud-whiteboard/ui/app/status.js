export function createWhiteboardStatusController({
    getI18n,
    getIntegrationCanvasMode,
    getShareContext,
    showToast,
}) {
    let syncStatus = "idle";
    let syncStatusMessage = "";

    function translate(key) {
        return getI18n()?.t(key) ?? key;
    }

    function reportClientError(error, fallbackKey) {
        console.error("[nextcloud-whiteboard] client error:", error);
        showToast(error?.message || translate(fallbackKey), {
            variant: "error",
        });
    }

    function sharePageFlag(name, fallback) {
        const shareContext = getShareContext();
        if (!shareContext?.page) return fallback;
        return shareContext.page[name] !== undefined
            ? Boolean(shareContext.page[name])
            : fallback;
    }

    function canManageShares() {
        return (
            !getIntegrationCanvasMode() &&
            sharePageFlag("showShareControls", !getShareContext())
        );
    }

    function updateSyncStatusBox() {
        const statusBox = document.getElementById("whiteboard-sync-status");
        if (!statusBox) return;
        statusBox.dataset.status = syncStatus;
        statusBox.title =
            syncStatusMessage ||
            translate("module.nextcloud_whiteboard.status_idle");
    }

    function setSyncStatus(status, messageKey) {
        syncStatus = status;
        syncStatusMessage = translate(messageKey);
        updateSyncStatusBox();
    }

    function setSyncStatusMessage(status, message) {
        syncStatus = status;
        syncStatusMessage = message;
        updateSyncStatusBox();
    }

    function getSyncStatus() {
        return {
            status: syncStatus,
            message: syncStatusMessage,
        };
    }

    function buildConnectionErrorMessage(error, serverUrl) {
        const rawMessage = String(error?.message ?? "").trim();
        const genericSocketFailure = /^(websocket error|xhr poll error)$/i.test(
            rawMessage,
        );
        if (!rawMessage || genericSocketFailure) {
            return translate(
                "module.nextcloud_whiteboard.connection_failed",
            ).replace("{server_url}", serverUrl);
        }
        return `${translate("module.nextcloud_whiteboard.connect_error")}: ${rawMessage}`;
    }

    return {
        buildConnectionErrorMessage,
        canManageShares,
        getSyncStatus,
        reportClientError,
        setSyncStatus,
        setSyncStatusMessage,
        sharePageFlag,
        translate,
        updateSyncStatusBox,
    };
}
