import {
    renderImagePreview,
    bindImagePreviews,
} from "/static/reuse/image-preview.js";
import { reportClientError } from "/static/reuse/error-reporting.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchLibraryImageUrl,
    uploadLibraryImage,
    discardLibraryImage,
} from "/static/gateways/study/library-client.js";

export function renderReferenceImages(entry, layer) {
    return (layer?.fields ?? [])
        .filter(({ type }) => type === "imageList")
        .map(
            (field) =>
                `<div class="library-reference-images">${(entry.fields?.[field.id] ?? []).map((_value, index) => renderImagePreview({ alt: entry.label, large: true, imageAttributes: { "data-library-image-entry": entry.id, "data-library-image-field": field.id, "data-library-image-index": index } })).join("")}</div>`,
        )
        .join("");
}

export async function loadReferenceImages(
    root,
    { signal, objectUrls, errorMessage, requestId },
) {
    bindImagePreviews(root, { signal });
    await Promise.all(
        [...root.querySelectorAll("[data-library-image-entry]")].map(
            async (image) => {
                try {
                    const url = await fetchLibraryImageUrl(
                        image.dataset.libraryImageEntry,
                        image.dataset.libraryImageField,
                        image.dataset.libraryImageIndex,
                        { signal, requestId },
                    );
                    if (signal?.aborted || !image.isConnected) {
                        URL.revokeObjectURL(url);
                        return;
                    }
                    objectUrls.add(url);
                    image.src = url;
                } catch {
                    if (!signal?.aborted)
                        showToast(errorMessage, { variant: "error" });
                }
            },
        ),
    );
}

export function bindReferenceImageUploads(form, entry, i18n, signal) {
    bindImagePreviews(form, { signal });
    for (const field of form.querySelectorAll("[data-library-image-upload]")) {
        const fieldId = field.dataset.imageField;
        const stored = form.elements[`field:${fieldId}`];
        const original = entry.fields?.[fieldId] ?? [];
        stored.libraryFieldValue = [...original];
        const picker = field.querySelector('input[type="file"]');
        const files = field.querySelector("[data-library-image-files]");
        const urls = new Map();
        const uploaded = new Set();
        const errorToast = () =>
            showToast(i18n.t("adapter.study.library.images_upload_error"), {
                variant: "error",
            });
        const discard = async (value) => {
            try {
                await discardLibraryImage(value, { keepalive: true });
                uploaded.delete(value);
            } catch (error) {
                reportClientError({
                    component: "study-library",
                    operation: "discardImage",
                    code: error?.message,
                });
                if (!signal?.aborted) errorToast();
            }
        };
        const render = () => {
            files.innerHTML = stored.libraryFieldValue
                .map((value, index) =>
                    renderImagePreview({
                        src: urls.get(value),
                        alt: entry.label || i18n.t("ui.reuse.image_preview"),
                        removeId: index,
                        disabled: picker.disabled,
                        removeLabel: i18n.t("ui.reuse.delete"),
                        imageAttributes: { "data-image-preview": index },
                    }),
                )
                .join("");
        };
        render();
        for (const [index, value] of original.entries()) {
            void fetchLibraryImageUrl(entry.id, fieldId, index, {
                signal,
                requestId: entry.previewRequestId,
            })
                .then((url) => {
                    if (
                        signal?.aborted ||
                        !stored.libraryFieldValue.includes(value)
                    ) {
                        URL.revokeObjectURL(url);
                        return;
                    }
                    urls.set(value, url);
                    render();
                })
                .catch((error) => {
                    if (signal?.aborted) return;
                    reportClientError({
                        component: "study-library",
                        operation: "previewImage",
                        code: error?.message,
                    });
                    showToast(
                        i18n.t("adapter.study.library.images_load_error"),
                        { variant: "error" },
                    );
                });
        }
        files.addEventListener(
            "click",
            async (event) => {
                const button = event.target.closest(
                    "[data-image-preview-remove]",
                );
                if (!button || picker.disabled) return;
                event.preventDefault();
                const [value] = stored.libraryFieldValue.splice(
                    Number(button.dataset.imagePreviewRemove),
                    1,
                );
                if (urls.has(value)) URL.revokeObjectURL(urls.get(value));
                urls.delete(value);
                picker.value = "";
                render();
                form.dispatchEvent(new Event("change", { bubbles: true }));
                if (uploaded.has(value)) await discard(value);
            },
            { signal },
        );
        picker.addEventListener(
            "change",
            async () => {
                if (picker.disabled) return;
                picker.disabled = true;
                field.dataset.uploading = "true";
                render();
                try {
                    for (const file of picker.files) {
                        if (file.size > 5 * 1024 * 1024)
                            throw new Error("image_upload_too_large");
                        const result = await uploadLibraryImage(file, signal);
                        uploaded.add(result.value);
                        if (signal?.aborted) {
                            await discard(result.value);
                            return;
                        }
                        urls.set(result.value, URL.createObjectURL(file));
                        stored.libraryFieldValue.push(result.value);
                    }
                    showToast(i18n.t("adapter.study.library.images_uploaded"), {
                        variant: "success",
                    });
                } catch (error) {
                    if (!signal?.aborted) {
                        reportClientError({
                            component: "study-library",
                            operation: "uploadImage",
                            code: error?.message,
                        });
                        errorToast();
                    }
                } finally {
                    delete field.dataset.uploading;
                    picker.disabled = false;
                    picker.value = "";
                    render();
                    form.dispatchEvent(new Event("change", { bubbles: true }));
                }
            },
            { signal },
        );
        signal?.addEventListener(
            "abort",
            () => {
                for (const url of urls.values()) URL.revokeObjectURL(url);
                urls.clear();
                for (const value of uploaded) void discard(value);
            },
            { once: true },
        );
    }
}
