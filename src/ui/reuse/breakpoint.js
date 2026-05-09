/**
 * Generic viewport breakpoint detection and watching.
 *
 * Resolves breakpoints by checking the document element width against a
 * caller-supplied threshold map.  Tiers are resolved from smallest to largest
 * so the first tier whose threshold the current width does not exceed wins.
 * If the width exceeds all thresholds the tier name "default" is returned.
 *
 * Public exports:
 *   getCurrentBreakpoint(breakpoints) — synchronously returns the current tier name.
 *   watchBreakpoint(breakpoints, callback) — fires callback(tier) on tier changes,
 *     returns a dispose() function to stop watching.
 *
 * Usage:
 *   const tier = getCurrentBreakpoint({ phone: 480, tablet: 900 });
 *   // → 'phone' | 'tablet' | 'default'
 *
 *   const dispose = watchBreakpoint({ phone: 480, tablet: 900 }, (tier) => {
 *     console.log('breakpoint changed to', tier);
 *   });
 *   // Later:
 *   dispose();
 *
 * @param {{ [tier: string]: number }} breakpoints  - Map of tier name to max-width threshold in pixels.
 * @returns {string} The current tier name or 'default' when no threshold is matched.
 */

/**
 * @param {{ [tier: string]: number }} breakpoints
 * @returns {string}
 */
export function getCurrentBreakpoint(breakpoints) {
  const width = document.documentElement.getBoundingClientRect().width;
  const sorted = Object.entries(breakpoints).sort(([, a], [, b]) => a - b);
  for (const [tier, maxWidth] of sorted) {
    if (width <= maxWidth) return tier;
  }
  return 'default';
}

/**
 * @param {{ [tier: string]: number }} breakpoints
 * @param {(tier: string) => void} callback
 * @returns {{ dispose: () => void }}
 */
export function watchBreakpoint(breakpoints, callback) {
  let currentTier = getCurrentBreakpoint(breakpoints);

  const observer = new ResizeObserver(() => {
    const nextTier = getCurrentBreakpoint(breakpoints);
    if (nextTier !== currentTier) {
      currentTier = nextTier;
      callback(currentTier);
    }
  });

  observer.observe(document.documentElement);

  return {
    dispose() {
      observer.disconnect();
    },
  };
}
