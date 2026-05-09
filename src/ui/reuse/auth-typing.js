/**
 * Shared typing-showcase helpers for unauthenticated auth pages.
 *
 * Public exports:
 *   DEFAULT_AUTH_TYPING_KEYS        — Core i18n keys used by the login/register typing pool.
 *   loadAuthTypingSamples(i18n)     — Resolves core + contributed typing samples into display strings.
 *   runTypingShowcase(samples, opt) — Animates the `#typing-text` element with the provided samples.
 *
 * Usage:
 *   import {
 *     DEFAULT_AUTH_TYPING_KEYS,
 *     loadAuthTypingSamples,
 *     runTypingShowcase,
 *   } from '../../reuse/auth-typing.js';
 *
 *   const samples = await loadAuthTypingSamples(i18n, {
 *     fallbackKeys: DEFAULT_AUTH_TYPING_KEYS,
 *   });
 *   runTypingShowcase(samples);
 *
 * @param {{ t: (key: string) => string }} i18n
 * @param {{ fallbackKeys?: string[] }} [options]
 * @returns {Promise<string[]>}
 */

export const DEFAULT_AUTH_TYPING_KEYS = [
    "ui.app.login.typing.sample.1",
    "ui.app.login.typing.sample.2",
    "ui.app.login.typing.sample.3",
    "ui.app.login.typing.sample.4",
    "ui.app.login.typing.sample.6",
];

let activeShowcaseRun = 0;

export async function loadAuthTypingSamples(
    i18n,
    { fallbackKeys = DEFAULT_AUTH_TYPING_KEYS } = {},
) {
    const keys = [...fallbackKeys];
    try {
        const response = await fetch("/api/v1/ui/auth-typing-messages");
        if (response.ok) {
            const payload = await response.json();
            for (const entry of payload?.data ?? []) {
                if (typeof entry?.textKey === "string") {
                    keys.push(entry.textKey);
                }
            }
        }
    } catch {
        // Public typing-message contributions are best-effort.
    }
    const translated = keys
        .map((key) => ({ key, value: i18n.t(key) }))
        .filter(
            ({ key, value }) =>
                typeof value === "string" && value.length > 0 && value !== key,
        )
        .map(({ value }) => value);
    return Array.from(new Set(translated));
}

/**
 * @param {string[]} samples
 * @param {{ targetSelector?: string }} [options]
 * @returns {void}
 */
export function runTypingShowcase(
    samples,
    { targetSelector = "#typing-text" } = {},
) {
    const orderedSamples = Array.isArray(samples)
        ? (() => {
              const usable = samples.filter(Boolean);
              if (usable.length < 2) return usable;
              const startIndex = Math.floor(Math.random() * usable.length);
              return usable.map(
                  (_, index) => usable[(startIndex + index) % usable.length],
              );
          })()
        : [];
    activeShowcaseRun += 1;
    const runId = activeShowcaseRun;
    void (async () => {
        while (runId === activeShowcaseRun) {
            for (const sample of orderedSamples) {
                for (
                    let charIndex = 0;
                    charIndex <= sample.length;
                    charIndex += 1
                ) {
                    const displayElement =
                        document.querySelector(targetSelector);
                    if (!displayElement || runId !== activeShowcaseRun) return;
                    displayElement.textContent = sample.slice(0, charIndex);
                    await new Promise((resolve) =>
                        window.setTimeout(resolve, 85),
                    );
                }

                await new Promise((resolve) =>
                    window.setTimeout(resolve, 60000),
                );

                for (
                    let charIndex = sample.length;
                    charIndex >= 0;
                    charIndex -= 1
                ) {
                    const displayElement =
                        document.querySelector(targetSelector);
                    if (!displayElement || runId !== activeShowcaseRun) return;
                    displayElement.textContent = sample.slice(0, charIndex);
                    await new Promise((resolve) =>
                        window.setTimeout(resolve, 40),
                    );
                }

                await new Promise((resolve) => window.setTimeout(resolve, 350));
            }
            if (orderedSamples.length === 0) return;
        }
    })();
}
