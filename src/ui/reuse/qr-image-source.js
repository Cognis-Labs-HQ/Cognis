/**
 * Converts an SVG QR payload into a browser-safe image source.
 *
 * Public exports:
 *   createQrImageSource(qrSvg) — creates an object URL for SVG markup and
 *   returns cleanup helpers for popup and modal teardown.
 *
 * Usage:
 *   import { createQrImageSource } from '/static/reuse/qr-image-source.js';
 *
 *   const qrImage = createQrImageSource(svgMarkup);
 *   image.src = qrImage.src;
 *   qrImage.revoke();
 *
 * @param {string} qrSvg - Raw SVG markup string returned by a QR generator.
 * @returns {{ src: string, revoke: () => void }} Image source and cleanup callback.
 */
export function createQrImageSource(qrSvg) {
    if (typeof qrSvg !== "string" || !qrSvg.trim()) {
        return { src: "", revoke: () => {} };
    }
    try {
        const qrBlob = new Blob([qrSvg], { type: "image/svg+xml" });
        const qrBlobUrl = URL.createObjectURL(qrBlob);
        return {
            src: qrBlobUrl,
            revoke: () => URL.revokeObjectURL(qrBlobUrl),
        };
    } catch {
        return { src: "", revoke: () => {} };
    }
}
