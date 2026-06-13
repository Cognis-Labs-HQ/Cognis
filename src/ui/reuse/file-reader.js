/**
 * App-wide file type registry used by classroom material rendering and any
 * other surface that needs to open a file.
 *
 * Public exports:
 *   - registerFileType(ext, mimeType) — adapters call this to declare support for a file extension.
 *   - canRender(filename, mimeType) — returns true when at least one registered type matches.
 *   - renderFileContent(blob, filename, mimeType, container, options) — renders file into a container element.
 *   - showUnsupportedToast(filename) — shows a toast for unrenderable types.
 *
 * @example
 * ```js
 * import { canRender, renderFileContent } from "/static/reuse/file-reader.js";
 * if (canRender("notes.md", "text/markdown")) {
 *   await renderFileContent(blob, "notes.md", "text/markdown", div, { signal });
 * }
 * ```
 *
 * @param {string} ext File extension (without leading dot, e.g. "md").
 * @param {string} mimeType MIME type string, e.g. "text/markdown".
 * @returns {void}
 */
import { showToast } from "/static/reuse/toast.js";
import { renderMarkdown } from "/static/reuse/markdown-renderer.js";

/** @type {Map<string, string>} ext → mimeType */
const registeredTypes = new Map();

/**
 * Registers a file extension as renderable.
 * @param {string} ext
 * @param {string} mimeType
 */
export function registerFileType(ext, mimeType) {
    registeredTypes.set(String(ext).toLowerCase().replace(/^\./, ""), mimeType);
}

/**
 * Returns true when the filename's extension or the explicit mimeType is
 * registered as a renderable type.
 * @param {string} filename
 * @param {string} [mimeType]
 * @returns {boolean}
 */
export function canRender(filename, mimeType) {
    const name = String(filename ?? "");
    const dotIndex = name.lastIndexOf(".");
    const ext =
        dotIndex > 0 && dotIndex < name.length - 1
            ? name.slice(dotIndex + 1).toLowerCase()
            : "";
    if (registeredTypes.has(ext)) return true;
    if (mimeType) {
        for (const registered of registeredTypes.values()) {
            if (registered === mimeType) return true;
        }
    }
    return false;
}

function resolveEffectiveMimeType(filename, mimeType) {
    const name = String(filename ?? "");
    const dotIndex = name.lastIndexOf(".");
    const ext =
        dotIndex > 0 && dotIndex < name.length - 1
            ? name.slice(dotIndex + 1).toLowerCase()
            : "";
    if (mimeType && mimeType !== "application/octet-stream") return mimeType;
    return registeredTypes.get(ext) ?? mimeType ?? "";
}

/**
 * Renders the contents of a Blob into the given container element.
 * Text / markdown files are rendered via the markdown renderer.
 * Images are rendered as a native <img>.
 * Unsupported types result in a toast and an empty container.
 *
 * @param {Blob} blob
 * @param {string} filename
 * @param {string} mimeType
 * @param {HTMLElement} container
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<void>}
 */
export async function renderFileContent(
    blob,
    filename,
    mimeType,
    container,
    options = {},
) {
    const effective = resolveEffectiveMimeType(filename, mimeType);
    const isText =
        effective.startsWith("text/") || effective === "application/json";
    const isImage = effective.startsWith("image/");

    if (isText) {
        const text = await blob.text();
        container.innerHTML = renderMarkdown(text);
        return;
    }

    if (isImage) {
        const objectUrl = URL.createObjectURL(blob);
        const img = document.createElement("img");
        img.src = objectUrl;
        img.alt = String(filename ?? "");
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.style.objectFit = "contain";
        options.signal?.addEventListener("abort", () =>
            URL.revokeObjectURL(objectUrl),
        );
        container.innerHTML = "";
        container.appendChild(img);
        return;
    }

    showUnsupportedToast(filename);
    container.innerHTML = "";
}

/**
 * Shows a toast indicating the file type is not supported.
 * @param {string} filename
 */
export function showUnsupportedToast(filename) {
    showToast(
        `Cannot render "${String(filename ?? "file")}" — unsupported file type.`,
        { variant: "error" },
    );
}

// Pre-register types that are always supported by the browser itself.
registerFileType("txt", "text/plain");
registerFileType("md", "text/markdown");
registerFileType("markdown", "text/markdown");
registerFileType("jpg", "image/jpeg");
registerFileType("jpeg", "image/jpeg");
registerFileType("png", "image/png");
registerFileType("gif", "image/gif");
registerFileType("webp", "image/webp");
registerFileType("svg", "image/svg+xml");
registerFileType("avif", "image/avif");
