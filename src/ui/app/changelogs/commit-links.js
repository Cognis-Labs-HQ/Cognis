const MARKDOWN_COMMIT_LINK_PATTERN =
    /\[[^\]]*\]\((https:\/\/github\.com\/Cognis-Labs-HQ\/Cognis\/commit\/([0-9a-f]{7,40}))\)/gi;
const BARE_COMMIT_URL_PATTERN =
    /(?<!\]\()https:\/\/github\.com\/Cognis-Labs-HQ\/Cognis\/commit\/([0-9a-f]{7,40})/gi;

export function linkShortCommitRefs(markdown) {
    return markdown
        .replace(MARKDOWN_COMMIT_LINK_PATTERN, (match, url, commitRef) => {
            return `[${commitRef.slice(0, 7)}](${url})`;
        })
        .replace(BARE_COMMIT_URL_PATTERN, (url, commitRef) => {
            return `[${commitRef.slice(0, 7)}](${url})`;
        });
}
