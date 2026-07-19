import { buildImageElement } from "./elements.js";

export function createClipboardImageHandler({
    commitCreatedElement,
    getImageUploadMaxBytes,
    notifyImageRejected,
    uploadImage,
}) {
    async function createImageElementFromDataUrl(dataUrl) {
        let renderUrl = dataUrl;
        if (typeof uploadImage === "function") {
            try {
                const uploaded = await uploadImage(dataUrl);
                renderUrl = uploaded?.url || dataUrl;
            } catch {
                renderUrl = dataUrl;
            }
        }
        const image = new Image();
        image.addEventListener(
            "load",
            () => {
                commitCreatedElement(
                    buildImageElement(
                        [24, 24],
                        renderUrl,
                        calculateImageDimensions(image),
                    ),
                );
            },
            { once: true },
        );
        image.addEventListener(
            "error",
            () => {
                commitCreatedElement(buildImageElement([24, 24], renderUrl));
            },
            { once: true },
        );
        image.src = dataUrl;
    }

    return function handleClipboardImagePaste(event) {
        if (event.defaultPrevented) return;
        if (eventTargetAcceptsTextInput(event)) return;
        const imageFile = findClipboardImageFile(event);
        if (!imageFile) return;
        event.preventDefault();
        if (imageFile.size > getImageUploadMaxBytes()) {
            notifyImageRejected();
            return;
        }
        const reader = new FileReader();
        reader.addEventListener("load", () => {
            if (typeof reader.result !== "string") return;
            void createImageElementFromDataUrl(reader.result);
        });
        reader.readAsDataURL(imageFile);
    };
}

function calculateImageDimensions(image) {
    const maxWidth = 480;
    const maxHeight = 360;
    const naturalWidth = Math.max(1, image.naturalWidth || image.width || 240);
    const naturalHeight = Math.max(
        1,
        image.naturalHeight || image.height || 180,
    );
    const scale = Math.min(
        1,
        maxWidth / naturalWidth,
        maxHeight / naturalHeight,
    );
    return {
        width: Math.round(naturalWidth * scale),
        height: Math.round(naturalHeight * scale),
    };
}

function eventTargetAcceptsTextInput(event) {
    const target = event.target;
    return Boolean(
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable,
    );
}

function findClipboardImageFile(event) {
    const files = [...(event.clipboardData?.files ?? [])];
    const directFile = files.find((file) => file.type.startsWith("image/"));
    if (directFile) return directFile;
    const items = [...(event.clipboardData?.items ?? [])];
    return (
        items.find((item) => item.type.startsWith("image/"))?.getAsFile?.() ??
        null
    );
}
