/**
 * Release changelog preferences sub-module for the Settings page.
 *
 * Manages the release changelog visibility preference toggle.
 *
 * Public exports:
 *   initReleaseChangelogPrefs(root, options) — initialises and manages the
 *   release-changelog settings control state within root.
 *
 * Usage:
 *   const releasePrefs = initReleaseChangelogPrefs(root, {
 *     existingPrefs,
 *     onDirtyChange: (dirty) => markDirty('release-notes', dirty),
 *   });
 *   releasePrefs.refresh();
 *
 * @param {Element} root
 * @param {{ existingPrefs?: object|null, onDirtyChange?: (dirty: boolean) => void }} options
 * @returns {{ refresh: () => void, getShowReleaseChangelogs: () => boolean, commit: () => void, discard: () => void }}
 */
export function initReleaseChangelogPrefs(
    root,
    { existingPrefs, onDirtyChange },
) {
    let savedShowReleaseChangelogs =
        existingPrefs?.releaseChangelogShow !== false;
    let currentShowReleaseChangelogs = savedShowReleaseChangelogs;

    function syncCheckboxState() {
        const checkbox = root.querySelector("#pref-release-changelog-show");
        if (!(checkbox instanceof HTMLInputElement)) return;
        checkbox.checked = currentShowReleaseChangelogs;
    }

    function bindCheckboxEvents() {
        const checkbox = root.querySelector("#pref-release-changelog-show");
        if (!(checkbox instanceof HTMLInputElement)) return;
        if (checkbox.dataset.dirtyHandlerBound === "true") return;
        checkbox.dataset.dirtyHandlerBound = "true";
        checkbox.addEventListener("change", () => {
            currentShowReleaseChangelogs = checkbox.checked;
            onDirtyChange?.(
                currentShowReleaseChangelogs !== savedShowReleaseChangelogs,
            );
        });
    }

    function refresh() {
        syncCheckboxState();
        bindCheckboxEvents();
    }

    function commit() {
        savedShowReleaseChangelogs = currentShowReleaseChangelogs;
        onDirtyChange?.(false);
    }

    function discard() {
        currentShowReleaseChangelogs = savedShowReleaseChangelogs;
        syncCheckboxState();
        onDirtyChange?.(false);
    }

    refresh();

    return {
        refresh,
        getShowReleaseChangelogs: () => currentShowReleaseChangelogs,
        commit,
        discard,
    };
}
