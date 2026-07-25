import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { openImageCropPopup } from "/static/adapters/social/profile/crop-popup.js";
import { sourceRectToCoverObjectPositionPercent } from "/static/adapters/social/profile/image-crop.js";

function clampBannerPanPercent(value) {
    return Math.min(100, Math.max(0, Number(value) || 0));
}

function sourceRectToPanPercent(sourceRect, imageWidth, imageHeight) {
    const panPosition = sourceRectToCoverObjectPositionPercent(
        sourceRect,
        imageWidth,
        imageHeight,
    );
    return {
        panX: clampBannerPanPercent(panPosition.panX),
        panY: clampBannerPanPercent(panPosition.panY),
    };
}

export function isGifFile(file) {
    if (!(file instanceof File)) return false;
    if (file.type.toLowerCase() === "image/gif") return true;
    return /\.gif$/i.test(file.name);
}

export function shouldPreserveOriginalGif(kind, file) {
    return kind === "banner" && isGifFile(file);
}

export function isCropResultWithSourceRect(cropResult) {
    if (!cropResult || typeof cropResult !== "object") return false;
    if (!("sourceRect" in cropResult)) return false;
    const sourceRect = cropResult.sourceRect;
    if (!sourceRect || typeof sourceRect !== "object") return false;
    return (
        Number.isFinite(Number(cropResult.imageWidth)) &&
        Number.isFinite(Number(cropResult.imageHeight)) &&
        Number.isFinite(Number(sourceRect.sourceX)) &&
        Number.isFinite(Number(sourceRect.sourceY)) &&
        Number.isFinite(Number(sourceRect.sourceWidth)) &&
        Number.isFinite(Number(sourceRect.sourceHeight))
    );
}

export function createProfileImageUploadActions({
    getState,
    setState,
    loadOwnProfile,
    saveBannerLayoutPreference,
    refreshPage,
    updateNavbarAvatar,
    i18n,
    openPopup,
}) {
    async function doRemoveAvatar() {
        await apiFetch("/api/v1/social/profile/avatar", { method: "DELETE" });
        const currentState = getState();
        if (currentState.avatarBlobUrl) {
            URL.revokeObjectURL(currentState.avatarBlobUrl);
        }
        setState({ avatarBlobUrl: null, profile: await loadOwnProfile() });
        refreshPage();
        updateNavbarAvatar().catch(() => {});
    }

    async function doRemoveBanner() {
        await apiFetch("/api/v1/social/profile/banner", { method: "DELETE" });
        const currentState = getState();
        if (currentState.bannerBlobUrl) {
            URL.revokeObjectURL(currentState.bannerBlobUrl);
        }
        setState({ bannerBlobUrl: null, profile: await loadOwnProfile() });
        refreshPage();
    }

    function revokeProfileBlobUrls() {
        const currentState = getState();
        if (currentState.avatarBlobUrl) {
            URL.revokeObjectURL(currentState.avatarBlobUrl);
        }
        if (currentState.bannerBlobUrl) {
            URL.revokeObjectURL(currentState.bannerBlobUrl);
        }
        setState({
            avatarBlobUrl: null,
            bannerBlobUrl: null,
        });
    }

    async function handleProfileImageUpload({ kind, file, aspectRatio }) {
        const preserveOriginalGif = shouldPreserveOriginalGif(kind, file);
        const cropResult = await openImageCropPopup({
            file,
            kind,
            aspectRatio,
            outputMode: preserveOriginalGif ? "sourceRect" : "blob",
            openPopupDialog: openPopup,
            translate: (key) => i18n.t(key),
            escapeHtmlText: escapeHtml,
        });
        if (!cropResult) return false;
        const uploadBlob = preserveOriginalGif ? file : cropResult;
        if (!(uploadBlob instanceof Blob)) return false;
        const endpoint =
            kind === "avatar"
                ? "/api/v1/social/profile/avatar"
                : "/api/v1/social/profile/banner";
        const contentType = preserveOriginalGif
            ? file.type || "application/octet-stream"
            : "image/png";
        const response = await apiFetch(endpoint, {
            method: "PUT",
            headers: { "content-type": contentType },
            body: await uploadBlob.arrayBuffer(),
        });
        if (!response.ok) {
            showToast(i18n.t("ui.app.profile.upload_failed"), {
                variant: "error",
            });
            return false;
        }
        // The media write is complete once the server returns a successful
        // status. Treat the response payload as optional so an empty or
        // otherwise unreadable success response cannot turn that completed
        // upload into an error toast in the file-input handler.
        let responseData = {};
        try {
            responseData = (await response.json())?.data ?? {};
        } catch {
            // Keep the local preview when the optional response body is absent.
        }

        const currentState = getState();
        if (kind === "avatar") {
            if (currentState.avatarBlobUrl) {
                URL.revokeObjectURL(currentState.avatarBlobUrl);
            }
            setState({
                avatarBlobUrl: URL.createObjectURL(uploadBlob),
                profile: responseData.profile ?? currentState.profile,
            });
        } else {
            if (currentState.bannerBlobUrl) {
                URL.revokeObjectURL(currentState.bannerBlobUrl);
            }
            let nextBannerPanX = 50;
            let nextBannerPanY = 50;
            if (preserveOriginalGif && isCropResultWithSourceRect(cropResult)) {
                const panPosition = sourceRectToPanPercent(
                    cropResult.sourceRect,
                    cropResult.imageWidth,
                    cropResult.imageHeight,
                );
                nextBannerPanX = panPosition.panX;
                nextBannerPanY = panPosition.panY;
            }
            setState({
                bannerBlobUrl: URL.createObjectURL(uploadBlob),
                bannerPanX: nextBannerPanX,
                bannerPanY: nextBannerPanY,
                profile: responseData.profile ?? currentState.profile,
            });
        }

        // Render the local blob before any follow-up request so a slow or
        // failed preference/profile refresh cannot hide a successful upload.
        refreshPage();
        if (kind === "banner") {
            try {
                await saveBannerLayoutPreference({
                    height:
                        currentState.bannerHeight === "full" ? "full" : "half",
                    panX: nextBannerPanX,
                    panY: nextBannerPanY,
                });
            } catch {
                // The banner upload already succeeded. Preference persistence
                // must not make the caller report the upload itself as failed.
            }
        }

        if (kind === "avatar") {
            updateNavbarAvatar().catch(() => {});
        }
        return true;
    }

    return {
        doRemoveAvatar,
        doRemoveBanner,
        revokeProfileBlobUrls,
        handleProfileImageUpload,
    };
}
