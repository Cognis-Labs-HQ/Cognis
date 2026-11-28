/**
 * Formats canonical Cognis commit links with concise visible references.
 *
 * Public exports:
 * - linkShortCommitReferences(markdown) — converts Cognis commit links to Markdown
 *   links labeled with their seven-character commit reference.
 *
 * Usage example:
 *   linkShortCommitReferences('https://github.com/Cognis-Labs-HQ/Cognis/commit/1234567890abcdef');
 *
 * @param {string} markdown Markdown that may contain canonical commit links.
 * @returns {string} Markdown with short commit labels and complete link targets.
 */
const MARKDOWN_COMMIT_LINK_PATTERN =
    /\[[^\]]*\]\((https:\/\/github\.com\/Cognis-Labs-HQ\/Cognis\/commit\/([0-9a-f]{7,40}))\)/gi;
const BARE_COMMIT_URL_PATTERN =
    /(?<!\]\()https:\/\/github\.com\/Cognis-Labs-HQ\/Cognis\/commit\/([0-9a-f]{7,40})/gi;

function linkShortCommitReferences(markdown) {
    return markdown
        .replace(
            MARKDOWN_COMMIT_LINK_PATTERN,
            (match, url, commitReference) => {
                return `[${commitReference.slice(0, 7)}](${url})`;
            },
        )
        .replace(BARE_COMMIT_URL_PATTERN, (url, commitReference) => {
            return `[${commitReference.slice(0, 7)}](${url})`;
        });
}
export { linkShortCommitReferences };
