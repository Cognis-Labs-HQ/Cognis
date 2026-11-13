const EMOJI_CATALOG_URLS = [
    "/static/gateways/social/emojis/common.json",
    "/static/gateways/social/emojis/extended.json",
];

export async function fetchEmojiCatalog() {
    const responses = await Promise.all(
        EMOJI_CATALOG_URLS.map((url) => fetch(url)),
    );
    if (responses.some((response) => !response.ok)) return [];
    return (
        await Promise.all(responses.map((response) => response.json()))
    ).flat();
}
