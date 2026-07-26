/**
 * Resolves which release entries still need presenting from the dedicated
 * changelog state document.
 *
 * @param {Array<{ slug?: string }>} releaseEntries
 * @param {string} releaseVersion
 * @param {{ seenSlugs?: string[], lastVersion?: string|null }|null} changelogState
 * @returns {{ unseenEntries: Array<{ slug?: string }>, versionChanged: boolean }}
 */
export function resolveReleaseChangelogStatus(
    releaseEntries,
    releaseVersion,
    changelogState,
) {
    const seenSlugs = Array.isArray(changelogState?.seenSlugs)
        ? changelogState.seenSlugs
              .filter(
                  (slug) => typeof slug === "string" && slug.trim().length > 0,
              )
              .map((slug) => slug.trim())
        : [];
    return {
        unseenEntries: releaseEntries.filter(
            (entry) => !seenSlugs.includes(String(entry?.slug ?? "").trim()),
        ),
        versionChanged:
            releaseVersion.length > 0 &&
            releaseVersion !== String(changelogState?.lastVersion ?? ""),
    };
}
