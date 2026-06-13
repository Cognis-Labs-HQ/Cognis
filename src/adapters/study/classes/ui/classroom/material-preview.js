export function createClassroomMaterialPreviewManager({
    apiFetch,
    getFiles,
    getClassId,
    signal = null,
}) {
    let activeMaterialPreviewKey = "";
    let activeMaterialPreviewUrl = "";
    let activeMaterialPreviewContentType = "";
    let activeMaterialPreviewFailed = false;
    let activeMaterialPreviewText = null;

    function revokeActiveMaterialPreview() {
        if (activeMaterialPreviewUrl) {
            URL.revokeObjectURL(activeMaterialPreviewUrl);
        }
        activeMaterialPreviewUrl = "";
        activeMaterialPreviewContentType = "";
        activeMaterialPreviewFailed = false;
        activeMaterialPreviewKey = "";
        activeMaterialPreviewText = null;
    }

    async function loadActiveMaterialPreview(materialKey, files = null) {
        const normalizedMaterialKey = String(materialKey ?? "").trim();
        if (!normalizedMaterialKey) {
            revokeActiveMaterialPreview();
            return;
        }
        if (
            normalizedMaterialKey === activeMaterialPreviewKey &&
            (activeMaterialPreviewUrl || activeMaterialPreviewFailed)
        ) {
            return;
        }
        const fileList = Array.isArray(files) ? files : getFiles();
        const matchedFile = Array.isArray(fileList)
            ? fileList.find(
                  (fileRef) =>
                      String(fileRef?.key ?? "").trim() ===
                      normalizedMaterialKey,
              )
            : null;
        revokeActiveMaterialPreview();
        activeMaterialPreviewKey = normalizedMaterialKey;
        activeMaterialPreviewContentType = String(
            matchedFile?.contentType ?? "",
        ).trim();
        const classId = String(getClassId?.() ?? "").trim();
        const fileUrl = classId
            ? `/api/v1/study/classes/${encodeURIComponent(classId)}/materials/files/${normalizedMaterialKey}`
            : `/api/v1/files/${normalizedMaterialKey}`;
        const response = await apiFetch(fileUrl, {
            suppressConnectionRecoveryToast: true,
        }).catch(() => null);
        if (!response?.ok) {
            activeMaterialPreviewFailed = true;
            return;
        }
        const previewBlob = await response.blob().catch(() => null);
        if (!(previewBlob instanceof Blob)) {
            activeMaterialPreviewFailed = true;
            return;
        }
        if (activeMaterialPreviewKey !== normalizedMaterialKey) {
            return;
        }
        activeMaterialPreviewUrl = URL.createObjectURL(previewBlob);
        activeMaterialPreviewContentType =
            previewBlob.type || activeMaterialPreviewContentType;
        activeMaterialPreviewFailed = false;
        const effectiveMime = activeMaterialPreviewContentType.toLowerCase();
        const keyLower = normalizedMaterialKey.toLowerCase();
        const isTextFile =
            effectiveMime.startsWith("text/") ||
            keyLower.endsWith(".txt") ||
            keyLower.endsWith(".md") ||
            keyLower.endsWith(".markdown");
        if (isTextFile) {
            activeMaterialPreviewText = await previewBlob
                .text()
                .catch(() => null);
        }
    }

    if (signal) {
        signal.addEventListener(
            "abort",
            () => {
                revokeActiveMaterialPreview();
            },
            { once: true },
        );
    }

    return {
        loadActiveMaterialPreview,
        revokeActiveMaterialPreview,
        getState: () => ({
            url: activeMaterialPreviewUrl,
            contentType: activeMaterialPreviewContentType,
            failed: activeMaterialPreviewFailed,
            textContent: activeMaterialPreviewText,
        }),
    };
}
