import { profileFetch as apiFetch } from "./offline-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { openImageCropPopup } from "./crop-popup.js";
import { sourceRectToCoverObjectPositionPercent } from "./image-crop.js";

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
    saveBannerLayoutPreference,
    refreshPage,
    updateNavbarAvatar,
    i18n,
    openPopup,
    isCurrent,
}) {
    const pendingUploads = new Set();

    const log = (message, error) =>
        console.error(message, {
            component: "social-profile",
            operation: "updateHeroMedia",
            errorName: error?.name,
        });

    async function removeImage(kind) {
        if (!isCurrent() || pendingUploads.has(kind)) return;
        pendingUploads.add(kind);
        try {
            const response = await apiFetch(`/api/v1/social/profile/${kind}`, {
                method: "DELETE",
            });
            if (!isCurrent()) return;
            if (!response.ok) throw new Error("profile_image_delete_failed");
            setState({
                [`${kind}BlobUrl`]: null,
                profile: { ...getState().profile, [`${kind}Key`]: null },
            });
            refreshPage();
            if (kind === "avatar")
                void updateNavbarAvatar().catch((error) =>
                    log("[profile] navbar refresh failed", error),
                );
        } catch (error) {
            if (error?.code === "missing_translation") throw error;
            log("[profile] image deletion failed", error);
            if (isCurrent())
                showToast(i18n.t("ui.app.profile.remove_image_failed"), {
                    variant: "error",
                });
        } finally {
            pendingUploads.delete(kind);
        }
    }

    async function handleProfileImageUpload({ kind, file, aspectRatio }) {
        if (!isCurrent() || pendingUploads.has(kind)) return false;
        pendingUploads.add(kind);
        let delivered = false;
        try {
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
            if (!isCurrent() || !cropResult) return false;
            const uploadBlob = preserveOriginalGif ? file : cropResult;
            if (!(uploadBlob instanceof Blob)) return false;
            const endpoint =
                kind === "avatar"
                    ? "/api/v1/social/profile/avatar"
                    : "/api/v1/social/profile/banner";
            const contentType = preserveOriginalGif
                ? file.type || "application/octet-stream"
                : "image/png";
            const body = await uploadBlob.arrayBuffer();
            if (!isCurrent()) return false;
            const response = await apiFetch(endpoint, {
                method: "PUT",
                headers: { "content-type": contentType },
                body,
            });
            if (!isCurrent()) return false;
            if (!response.ok) {
                showToast(i18n.t("ui.app.profile.upload_failed"), {
                    variant: "error",
                });
                return false;
            }
            let responseData = {};
            delivered = true;
            try {
                const receipt = await response.json();
                responseData = receipt?.data ?? {};
            } catch (error) {
                console.error(
                    "[profile] unable to read optional upload response",
                    {
                        component: "social-profile",
                        operation: "read-profile-image-upload-response",
                        kind,
                        errorName: error?.name,
                    },
                );
            }

            if (!isCurrent()) return delivered;
            const currentState = getState();
            let nextBannerPanX = 50;
            let nextBannerPanY = 50;
            if (kind === "avatar") {
                setState({
                    avatarBlobUrl: URL.createObjectURL(uploadBlob),
                    profile: responseData.profile ?? currentState.profile,
                });
            } else {
                if (
                    preserveOriginalGif &&
                    isCropResultWithSourceRect(cropResult)
                ) {
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

            refreshPage();
            if (kind === "banner") {
                try {
                    await saveBannerLayoutPreference({
                        height:
                            currentState.bannerHeight === "full"
                                ? "full"
                                : "half",
                        panX: nextBannerPanX,
                        panY: nextBannerPanY,
                    });
                } catch (error) {
                    console.error("[profile] unable to save banner layout", {
                        component: "social-profile",
                        operation: "save-banner-layout",
                        errorName: error?.name,
                    });
                }
            }

            if (kind === "avatar") {
                if (isCurrent())
                    void updateNavbarAvatar().catch((error) =>
                        log("[profile] navbar refresh failed", error),
                    );
            }
            return true;
        } catch (error) {
            if (error?.code === "missing_translation") throw error;
            if (!delivered) throw error;
            console.error("[profile] uploaded image view refresh failed", {
                operation: "refreshAfterUpload",
                errorName: error?.name,
            });
            return true;
        } finally {
            pendingUploads.delete(kind);
        }
    }

    return {
        doRemoveAvatar: () => removeImage("avatar"),
        doRemoveBanner: () => removeImage("banner"),
        handleProfileImageUpload,
    };
}
