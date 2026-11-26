/** Preserve stylesheet identity when compiling both host and component documents. */
export function rewriteHtmlAssets(html, manifest) {
    for (const [sourceUrl, emittedUrl] of Object.entries(manifest)) {
        html = sourceUrl.endsWith(".css")
            ? html.replaceAll(
                  `href="${sourceUrl}"`,
                  `href="${emittedUrl}" data-page-stylesheet-source="${sourceUrl}"`,
              )
            : html.replaceAll(sourceUrl, emittedUrl);
    }
    return html;
}
