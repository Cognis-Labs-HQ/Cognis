/**
  * Motion preference utilities — wraps the system-level prefers-reduced-motion
  * media query so pages can respect a user's motion sensitivity setting without
  * embedding the raw CSS media query string in application code.
  *
  * Public exports:
  *   prefersReducedMotion() — returns true when the user prefers reduced motion.
  *
  * Usage:
  *   import { prefersReducedMotion } from '../reuse/motion.js';
  *   el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  *
  * @returns {boolean} True when the user agent matches '(prefers-reduced-motion: reduce)'.
  */

export function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
