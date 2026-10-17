import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchLibraryImageUrl,
    uploadLibraryImage,
} from "/static/gateways/study/ui/library-client.js";

export function renderReferenceImages(entry, layer) {
    return (layer?.fields ?? [])
        .filter(({ type }) => type === "imageList")
        .map(
            (field) =>
                `<div class="library-reference-images">${(entry.fields?.[field.id] ?? []).map((_value, index) => `<img loading="lazy" alt="${escapeHtml(entry.label)}" data-library-image-entry="${escapeHtml(entry.id)}" data-library-image-field="${escapeHtml(field.id)}" data-library-image-index="${index}">`).join("")}</div>`,
        )
        .join("");
}

export async function loadReferenceImages(
    root,
    { signal, objectUrls, errorMessage, requestId },
) {
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
    for (const field of form.querySelectorAll("[data-library-image-upload]")) {
        const stored = form.elements[`field:${field.dataset.imageField}`];
        stored.libraryFieldValue = [
            ...(entry.fields?.[field.dataset.imageField] ?? []),
        ];
        const picker = field.querySelector('input[type="file"]');
        const files = field.querySelector("[data-library-image-files]");
        const render = () => {
            files.innerHTML = stored.libraryFieldValue
                .map(
                    (_value, index) =>
                        `<button class="btn-cancel" type="button" data-remove-image="${index}" ${picker.disabled ? "disabled" : ""} aria-label="${escapeHtml(i18n.t("ui.reuse.delete"))}">${index + 1} ×</button>`,
                )
                .join("");
        };
        render();
        files.addEventListener(
            "click",
            (event) => {
                const button = event.target.closest("[data-remove-image]");
                if (!button || picker.disabled) return;
                stored.libraryFieldValue.splice(
                    Number(button.dataset.removeImage),
                    1,
                );
                render();
                form.dispatchEvent(new Event("change", { bubbles: true }));
            },
            { signal },
        );
        picker.addEventListener(
            "change",
            async () => {
                picker.disabled = true;
                field.dataset.uploading = "true";
                try {
                    for (const file of picker.files) {
                        if (file.size > 5 * 1024 * 1024)
                            throw new Error("image_upload_too_large");
                        const result = await uploadLibraryImage(file, signal);
                        if (signal?.aborted) return;
                        stored.libraryFieldValue.push(result.value);
                    }
                    form.dispatchEvent(new Event("change", { bubbles: true }));
                    showToast(i18n.t("adapter.study.library.images_uploaded"), {
                        variant: "success",
                    });
                } catch {
                    if (!signal?.aborted)
                        showToast(
                            i18n.t("adapter.study.library.images_upload_error"),
                            { variant: "error" },
                        );
                } finally {
                    delete field.dataset.uploading;
                    picker.disabled = false;
                    render();
                    form.dispatchEvent(new Event("change", { bubbles: true }));
                    picker.value = "";
                }
            },
            { signal },
        );
    }
}
