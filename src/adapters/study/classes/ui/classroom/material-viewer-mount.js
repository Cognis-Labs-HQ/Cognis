import { createImageViewer } from "/static/adapters/file-reader/image/image-viewer.js";

/**
 * Mounts an image viewer into the `.classes-material-image-host` element
 * found in root, if one exists and the preview state contains a URL.
 * Returns the viewer instance (or null when no host / URL is present) so
 * the caller can destroy it on the next DOM refresh.
 *
 * @param {HTMLElement} root
 * @param {{ previewState: { url?: string }, isTeacher: boolean, classId: string, apiFetch: Function, signal?: AbortSignal }} options
 * @returns {{ applyViewport(v: object): void, destroy(): void } | null}
 */
export function mountMaterialImageViewer(root, options) {
    const imageHost = root.querySelector(".classes-material-image-host");
    if (!(imageHost instanceof HTMLElement)) return null;
    const { previewState, isTeacher, classId, apiFetch, signal } = options;
    if (!previewState.url) return null;
    return createImageViewer(imageHost, previewState.url, {
        isTeacher,
        classId,
        apiFetch,
        signal,
    });
}
