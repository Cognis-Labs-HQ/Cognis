/**
 * Reports structured browser failures through a caller-selectable local logger.
 *
 * This deliberately avoids authenticated telemetry so it is safe for public
 * pages and for failures that occur before a user session exists.
 *
 * Public exports:
 *   reportClientError(meta, logger) — writes structured failure metadata to
 *                                     the supplied logger or `console.error`.
 *
 * Usage:
 *   reportClientError({ component: 'public-page', operation: 'load' });
 *
 * @param {Record<string, unknown>} meta - Structured failure metadata.
 * @param {(meta: Record<string, unknown>) => void} [logger=console.error] - Local error sink.
 * @returns {void}
 */
export function reportClientError(meta, logger = console.error) {
    logger(meta);
}
