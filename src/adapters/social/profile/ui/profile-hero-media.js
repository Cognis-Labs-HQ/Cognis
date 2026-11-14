import { readProfileImage } from "./profile-api-loaders.js";

const kinds = ["avatar", "banner"];

/** Own two hero images; preserve only unchanged image nodes through composer renders. */
export function createProfileHeroMedia({ root, isCurrent, signal, onChange }) {
    const slots = new Map();
    const images = new Map();
    let generation = 0;

    function release(slot) {
        slot?.controller?.abort();
        if (slot?.blobUrl) URL.revokeObjectURL(slot.blobUrl);
    }

    function urls() {
        return Object.fromEntries(
            kinds.map((kind) => [
                `${kind}BlobUrl`,
                slots.get(kind)?.blobUrl ?? null,
            ]),
        );
    }

    function clear() {
        generation++;
        for (const slot of slots.values()) release(slot);
        slots.clear();
        images.clear();
        root.querySelectorAll(
            ".profile-hero-avatar-img, .profile-hero-banner-img",
        ).forEach((image) => image.remove());
        onChange(urls(), { refresh: false });
    }

    function replace(kind, blobUrl, profile) {
        generation++;
        const previous = slots.get(kind);
        if (previous?.blobUrl !== blobUrl) release(previous);
        slots.set(kind, {
            owner: profile?.accountId ?? profile?.handle,
            key: profile?.[`${kind}Key`],
            blobUrl,
        });
        onChange(urls());
    }

    async function read(profile) {
        const version = ++generation;
        const owner = profile?.accountId ?? profile?.handle;
        const current = () => isCurrent() && generation === version;
        const pending = kinds.map((kind) => {
            const key = profile?.[`${kind}Key`];
            let previous = slots.get(kind);
            previous?.controller?.abort();
            if (previous?.owner !== owner || previous?.key !== key || !key) {
                release(previous);
                previous = undefined;
                slots.delete(kind);
            }
            if (!key) return null;
            const controller = new AbortController();
            const slot = { ...previous, owner, key, controller };
            slots.set(kind, slot);
            return { kind, key, previous, slot, controller };
        });
        // A different key loses authorization to keep the former image immediately.
        onChange(urls());
        const outcomes = await Promise.all(
            pending.map(async (entry) => {
                if (!entry) return { state: "missing" };
                const { kind, key, previous, slot, controller } = entry;
                const result = await readProfileImage(key, {
                    signal: AbortSignal.any([signal, controller.signal]),
                    isCurrent: () => current() && slots.get(kind) === slot,
                    previous,
                });
                if (!current() || slots.get(kind) !== slot) {
                    if (result.blobUrl && result.blobUrl !== previous?.blobUrl)
                        URL.revokeObjectURL(result.blobUrl);
                    return { state: "stale" };
                }
                if (result.state === "available") {
                    if (slot.blobUrl && slot.blobUrl !== result.blobUrl)
                        URL.revokeObjectURL(slot.blobUrl);
                    Object.assign(slot, result);
                } else if (result.state !== "retryable") {
                    release(slot);
                    slots.delete(kind);
                }
                onChange(urls());
                return result;
            }),
        );
        return {
            current: current(),
            retryable: outcomes.some((item) => item.state === "retryable"),
        };
    }

    function prepare(markup) {
        const template = document.createElement("template");
        template.innerHTML = markup;
        for (const kind of kinds) {
            const selector = `.profile-hero-${kind}-img`;
            const previous = root.querySelector(selector);
            const next = template.content.querySelector(selector);
            if (
                !previous ||
                !next ||
                previous.getAttribute("src") !== next.getAttribute("src")
            ) {
                images.delete(kind);
                continue;
            }
            for (const attribute of next.attributes)
                if (attribute.name !== "src")
                    previous.setAttribute(attribute.name, attribute.value);
            images.set(kind, previous);
            const placeholder = document.createElement("span");
            placeholder.dataset.profileMediaSlot = kind;
            next.replaceWith(placeholder);
        }
        return template.innerHTML;
    }

    function reconcile() {
        for (const [kind, image] of images) {
            const placeholder = root.querySelector(
                `[data-profile-media-slot="${kind}"]`,
            );
            if (
                placeholder &&
                image.getAttribute("src") === slots.get(kind)?.blobUrl
            )
                placeholder.replaceWith(image);
        }
        images.clear();
    }

    return { read, replace, clear, prepare, reconcile };
}
