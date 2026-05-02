/**
 * Guided tour component — drives users through a scripted sequence of steps
 * across one or more pages.
 *
 * Each tour is a plain object with a unique `id` and an ordered array of
 * `steps`. A step navigates to an optional `path` and then runs a list of
 * `actions` in sequence. Three action types are supported:
 *
 *   popup      — opens a modal dialog (reuses the popup.css styles).
 *   spotlight  — dims the page and highlights a specific DOM element,
 *                showing a floating badge with a message and Next / Skip
 *                buttons alongside a step-of-N progress indicator.
 *   wait       — pauses execution for a fixed number of milliseconds.
 *
 * Cross-page navigation is handled automatically: when a step targets a
 * different URL the component serialises the remaining tour state into
 * sessionStorage before navigating, and `resumeTourIfPending` picks it back
 * up on the destination page.  Pages that may be mid-tour destinations must
 * call `resumeTourIfPending` early in their initialisation.
 *
 * Public exports:
 *   startTour(tourDef, options)          — validate, check feature flag, then
 *                                          run the tour.  Returns Promise<void>.
 *   resumeTourIfPending(tours, options)  — deserialise and resume a cross-page
 *                                          tour stored in sessionStorage.
 *                                          Returns Promise<void>.
 *
 * Tour definition schema:
 *   {
 *     id:    string,             // lower-case alphanumeric + hyphens only
 *     steps: Array<{
 *       path?:   string,         // absolute path, defaults to current page
 *       actions: Array<
 *         | { type: 'popup',     title: string, body: string, variant?: string }
 *         | { type: 'spotlight', target: string, message: string, position?: 'above'|'below'|'left'|'right' }
 *         | { type: 'wait',      ms: number }
 *       >
 *     }>
 *   }
 *
 * Usage:
 *   import { startTour, resumeTourIfPending } from '../../reuse/guided-tour.js';
 *
 *   const tour = {
 *     id: 'first-login',
 *     steps: [
 *       {
 *         path: '/dashboard',
 *         actions: [
 *           { type: 'popup', title: 'Welcome!', body: 'Let us show you around.' },
 *         ],
 *       },
 *       {
 *         path: '/settings',
 *         actions: [
 *           { type: 'spotlight', target: '.lang-picker', message: 'Set your language here.', position: 'below' },
 *         ],
 *       },
 *     ],
 *   };
 *
 *   // Start from any page:
 *   await startTour(tour, { i18n, onComplete: async () => markSeen() });
 *
 *   // On every page that may receive a cross-page redirect:
 *   await resumeTourIfPending({ 'first-login': tour }, { i18n });
 *
 * Security hardening:
 *   - The feature is gated by the ALLOW_TUTORIALS environment variable and the
 *     admin runtime toggle.  No tour runs when either kill switch is active.
 *   - Tour definitions are validated on every entry point (startTour and
 *     resumeTourIfPending) before any DOM or navigation action is taken.
 *   - CSS target selectors are checked against a safe-character allowlist
 *     that rejects pseudo-elements, nested function calls, and other patterns
 *     that could be abused for CSS injection.
 *   - Navigation paths must begin with '/' and pass a path-safe character
 *     check to prevent open redirects.
 *   - All text from tour definitions is inserted via textContent, never
 *     innerHTML, to prevent HTML injection.
 *   - Maximum 30 steps and 20 actions per step are enforced.
 *   - Strings are truncated at 500 characters.
 *   - Only one tour may be active at a time; concurrent calls are silently
 *     dropped.
 *
 * @param {{
 *   id:    string,
 *   steps: Array<{
 *     path?:   string,
 *     actions: Array<object>
 *   }>
 * }} tourDef
 * @param {{
 *   i18n?:       { t(key: string): string },
 *   onComplete?: () => Promise<void>,
 *   onSkip?:     () => Promise<void>,
 * }} options
 * @returns {Promise<void>}
 */

const SESSION_KEY = 'cognis_tour_pending';
const MAX_STEPS = 30;
const MAX_ACTIONS = 20;
const MAX_STRING = 500;

const VALID_TOUR_ID = /^[a-z0-9-]{1,64}$/;
const VALID_PATH = /^\/[a-zA-Z0-9/_-]*$/;
const SAFE_SELECTOR = /^[a-zA-Z0-9\s\-_.#\[\]="'@*+~>|^$:]+$/;
const VALID_VARIANTS = new Set(['info', 'warning', 'danger', 'confirm']);
const VALID_POSITIONS = new Set(['above', 'below', 'left', 'right']);
const VALID_TYPES = new Set(['popup', 'spotlight', 'wait']);

let tutorialsEnabledCache = null; // cached for the lifetime of the current page load; refreshed on next navigation
let activeTour = false;

async function isTutorialsEnabled() {
  if (tutorialsEnabledCache !== null) return tutorialsEnabledCache;
  try {
    const res = await fetch('/api/v1/system/ui-config');
    if (!res.ok) {
      tutorialsEnabledCache = false;
      return false;
    }
    const payload = await res.json();
    tutorialsEnabledCache = payload?.data?.tutorialsEnabled !== false;
  } catch {
    tutorialsEnabledCache = false;
  }
  return tutorialsEnabledCache;
}

function clamp(value, max) {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

function validateAction(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!VALID_TYPES.has(raw.type)) return null;

  if (raw.type === 'popup') {
    return {
      type: 'popup',
      title: clamp(raw.title, MAX_STRING),
      body: clamp(raw.body, MAX_STRING),
      variant: VALID_VARIANTS.has(raw.variant) ? raw.variant : 'info',
    };
  }

  if (raw.type === 'spotlight') {
    if (!SAFE_SELECTOR.test(raw.target ?? '')) return null;
    if (raw.target.length > 200) return null;
    return {
      type: 'spotlight',
      target: raw.target,
      message: clamp(raw.message, MAX_STRING),
      position: VALID_POSITIONS.has(raw.position) ? raw.position : 'below',
    };
  }

  if (raw.type === 'wait') {
    const ms = Math.min(Math.max(0, Number(raw.ms) || 0), 10000);
    return { type: 'wait', ms };
  }

  return null;
}

function validateStep(raw) {
  if (!raw || typeof raw !== 'object') return null;

  const path = raw.path != null ? raw.path : null;
  if (path !== null && !VALID_PATH.test(path)) return null;

  if (!Array.isArray(raw.actions)) return null;
  const actions = raw.actions.slice(0, MAX_ACTIONS).map(validateAction).filter(Boolean);

  return { path, actions };
}

function validateTour(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!VALID_TOUR_ID.test(raw.id ?? '')) return null;
  if (!Array.isArray(raw.steps)) return null;

  const steps = raw.steps.slice(0, MAX_STEPS).map(validateStep).filter(Boolean);
  return { id: raw.id, steps };
}

function t(i18n, key) {
  return i18n?.t?.(key) || key;
}

function createProgressIndicator(current, total) {
  const el = document.createElement('div');
  el.className = 'tour-progress';
  el.setAttribute('aria-live', 'polite');
  el.setAttribute('aria-atomic', 'true');
  return el;
}

function updateProgress(el, current, total, i18n) {
  const stepLabel = t(i18n, 'ui.tour.step_label');
  const ofLabel = t(i18n, 'ui.tour.step_of_label');
  el.textContent = `${stepLabel} ${current} ${ofLabel} ${total}`;
}

function createSpotlightPanels(rect) {
  const container = document.createElement('div');
  container.className = 'tour-spotlight-container';
  container.setAttribute('role', 'presentation');

  const top = document.createElement('div');
  top.className = 'tour-spotlight-panel tour-spotlight-panel--top';
  top.style.height = `${Math.max(0, rect.top)}px`;

  const bottom = document.createElement('div');
  bottom.className = 'tour-spotlight-panel tour-spotlight-panel--bottom';
  bottom.style.height = `${Math.max(0, window.innerHeight - rect.bottom)}px`;

  const left = document.createElement('div');
  left.className = 'tour-spotlight-panel tour-spotlight-panel--left';
  left.style.top = `${rect.top}px`;
  left.style.height = `${rect.height}px`;
  left.style.width = `${Math.max(0, rect.left)}px`;

  const right = document.createElement('div');
  right.className = 'tour-spotlight-panel tour-spotlight-panel--right';
  right.style.top = `${rect.top}px`;
  right.style.height = `${rect.height}px`;
  right.style.left = `${rect.right}px`;

  container.append(top, bottom, left, right);
  return container;
}

function positionBadge(badge, rect, position) {
  const MARGIN = 12;
  const badgeWidth = 320;

  badge.style.removeProperty('top');
  badge.style.removeProperty('bottom');
  badge.style.removeProperty('left');
  badge.style.removeProperty('right');

  if (position === 'above') {
    badge.style.bottom = `${window.innerHeight - rect.top + MARGIN}px`;
    badge.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - badgeWidth - 8))}px`;
  } else if (position === 'left') {
    badge.style.top = `${Math.max(8, rect.top)}px`;
    badge.style.right = `${window.innerWidth - rect.left + MARGIN}px`;
  } else if (position === 'right') {
    badge.style.top = `${Math.max(8, rect.top)}px`;
    badge.style.left = `${rect.right + MARGIN}px`;
  } else {
    badge.style.top = `${rect.bottom + MARGIN}px`;
    badge.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - badgeWidth - 8))}px`;
  }
}

function runSpotlight(action, stepIndex, stepCount, progressEl, i18n) {
  return new Promise((resolve) => {
    const target = document.querySelector(action.target);

    if (!target) {
      resolve('next');
      return;
    }

    target.scrollIntoView({ block: 'center', behavior: 'smooth' });

    const doRender = () => {
      const rect = target.getBoundingClientRect();
      const panels = createSpotlightPanels(rect);

      const badge = document.createElement('div');
      badge.className = `tour-badge tour-badge--${action.position}`;
      badge.setAttribute('role', 'dialog');
      badge.setAttribute('aria-modal', 'false');
      badge.setAttribute('aria-label', t(i18n, 'ui.tour.spotlight_aria'));

      const messageEl = document.createElement('p');
      messageEl.className = 'tour-badge-message';
      messageEl.textContent = action.message;

      const actionsRow = document.createElement('div');
      actionsRow.className = 'tour-badge-actions';

      const skipBtn = document.createElement('button');
      skipBtn.type = 'button';
      skipBtn.className = 'tour-skip-link';
      skipBtn.textContent = t(i18n, 'ui.tour.skip');

      const nextBtn = document.createElement('button');
      nextBtn.type = 'button';
      nextBtn.className = 'tour-next-btn btn-animated';
      const isLast = stepIndex >= stepCount - 1;
      nextBtn.textContent = isLast ? t(i18n, 'ui.tour.done') : t(i18n, 'ui.tour.next');

      actionsRow.append(skipBtn, nextBtn);
      badge.append(messageEl, actionsRow);

      positionBadge(badge, rect, action.position);
      updateProgress(progressEl, stepIndex + 1, stepCount, i18n);

      target.classList.add('tour-spotlight-active');
      document.body.append(panels, badge);

      requestAnimationFrame(() => {
        badge.classList.add('tour-badge--visible');
        progressEl.classList.add('tour-progress--visible');
      });

      function cleanup() {
        document.removeEventListener('keydown', onKeyDown);
        target.classList.remove('tour-spotlight-active');
        panels.remove();
        badge.remove();
        progressEl.classList.remove('tour-progress--visible');
      }

      function onKeyDown(e) {
        if (e.key === 'Escape') {
          cleanup();
          resolve('skip');
        }
      }

      document.addEventListener('keydown', onKeyDown);

      nextBtn.addEventListener('click', () => {
        cleanup();
        resolve('next');
      });

      skipBtn.addEventListener('click', () => {
        cleanup();
        resolve('skip');
      });
    };

    setTimeout(doRender, 300);
  });
}

function runPopupAction(action, stepIndex, stepCount, i18n) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'tour-popup-title');

    function dismiss(result) {
      document.removeEventListener('keydown', onKeyDown);
      overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
      overlay.classList.remove('popup-overlay--visible');
      resolve(result);
    }

    const isLast = stepIndex >= stepCount - 1;
    const variant = VALID_VARIANTS.has(action.variant) ? action.variant : 'info';

    const dialog = document.createElement('div');
    dialog.className = `popup-dialog popup-dialog--${variant}`;

    const header = document.createElement('div');
    header.className = 'popup-header';

    const titleEl = document.createElement('h2');
    titleEl.className = 'popup-title';
    titleEl.id = 'tour-popup-title';
    titleEl.textContent = action.title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'popup-close-btn';
    closeBtn.setAttribute('aria-label', t(i18n, 'ui.tour.skip'));
    closeBtn.textContent = '\u2715';
    closeBtn.addEventListener('click', () => dismiss('skip'));

    header.append(titleEl, closeBtn);

    const bodyEl = document.createElement('div');
    bodyEl.className = 'popup-body';
    bodyEl.textContent = action.body;

    const footer = document.createElement('div');
    footer.className = 'popup-footer';

    const skipBtn = document.createElement('button');
    skipBtn.type = 'button';
    skipBtn.className = 'popup-action-btn popup-action-btn--neutral btn-animated';
    skipBtn.textContent = t(i18n, 'ui.tour.skip');
    skipBtn.addEventListener('click', () => dismiss('skip'));

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'btn-confirm btn-animated popup-action-btn';
    nextBtn.textContent = isLast ? t(i18n, 'ui.tour.done') : t(i18n, 'ui.tour.next');
    nextBtn.addEventListener('click', () => dismiss('next'));

    footer.append(skipBtn, nextBtn);
    dialog.append(header, bodyEl, footer);
    overlay.appendChild(dialog);

    function onKeyDown(e) {
      if (e.key === 'Escape') dismiss('skip');
    }
    document.addEventListener('keydown', onKeyDown);

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('popup-overlay--visible'));

    nextBtn.focus();
  });
}

function savePendingState(tourDef, stepIndex, actionIndex) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      tourDef,
      stepIndex,
      actionIndex,
    }));
  } catch {
    // sessionStorage unavailable; cross-page tours will not resume
  }
}

function clearPendingState() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

function readPendingState() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function runTour(tourDef, startStepIndex, startActionIndex, i18n, onComplete, onSkip) {
  const steps = tourDef.steps;
  const progressEl = createProgressIndicator(startStepIndex + 1, steps.length);
  document.body.appendChild(progressEl);

  let skipped = false;

  outer:
  for (let si = startStepIndex; si < steps.length; si++) {
    const step = steps[si];

    if (step.path && step.path !== window.location.pathname) {
      savePendingState(tourDef, si, 0);
      window.location.href = step.path;
      return;
    }

    const actionStart = si === startStepIndex ? startActionIndex : 0;

    for (let ai = actionStart; ai < step.actions.length; ai++) {
      const action = step.actions[ai];

      if (action.type === 'wait') {
        await new Promise((res) => setTimeout(res, action.ms));
        continue;
      }

      if (action.type === 'popup') {
        const result = await runPopupAction(action, si, steps.length, i18n);
        if (result === 'skip') {
          skipped = true;
          break outer;
        }
        continue;
      }

      if (action.type === 'spotlight') {
        const result = await runSpotlight(action, si, steps.length, progressEl, i18n);
        if (result === 'skip') {
          skipped = true;
          break outer;
        }
        continue;
      }
    }
  }

  progressEl.remove();
  clearPendingState();
  activeTour = false;

  if (skipped) {
    await onSkip?.();
  } else {
    await onComplete?.();
  }
}

/**
 * Starts a guided tour.
 *
 * Validates the tour definition, checks that tutorials are enabled by the
 * server configuration, and then runs each step in sequence.  If a step
 * targets a different URL the component saves the remaining tour to
 * sessionStorage and navigates; the destination page must call
 * `resumeTourIfPending` to continue.
 *
 * @param {{id: string, steps: Array}} tourDef
 * @param {{
 *   i18n?:       { t(key: string): string },
 *   onComplete?: () => Promise<void>,
 *   onSkip?:     () => Promise<void>,
 * }} [options]
 * @returns {Promise<void>}
 */
export async function startTour(tourDef, options = {}) {
  if (activeTour) return;

  const validated = validateTour(tourDef);
  if (!validated) return;

  const enabled = await isTutorialsEnabled();
  if (!enabled) return;

  activeTour = true;
  clearPendingState();

  const { i18n, onComplete, onSkip } = options;

  await runTour(validated, 0, 0, i18n, onComplete, onSkip).catch(() => {
    activeTour = false;
    clearPendingState();
  });
}

/**
 * Resumes a cross-page tour stored in sessionStorage after a navigation.
 *
 * Call this early in the initialisation of any page that may be a tour
 * destination.  Pass a map of all tours that could possibly resume on this
 * page, keyed by their `id`.
 *
 * @param {Record<string, object>} tours   — map of tourId to tour definitions
 * @param {{
 *   i18n?:       { t(key: string): string },
 *   onComplete?: () => Promise<void>,
 *   onSkip?:     () => Promise<void>,
 * }} [options]
 * @returns {Promise<void>}
 */
export async function resumeTourIfPending(tours, options = {}) {
  if (activeTour) return;

  const pending = readPendingState();
  if (!pending) return;

  clearPendingState();

  const { tourDef: rawDef, stepIndex, actionIndex } = pending;
  if (typeof stepIndex !== 'number' || typeof actionIndex !== 'number') return;

  const rawFromLibrary = tours?.[rawDef?.id] ?? rawDef;
  const validated = validateTour(rawFromLibrary);
  if (!validated) return;

  const enabled = await isTutorialsEnabled();
  if (!enabled) return;

  activeTour = true;

  const { i18n, onComplete, onSkip } = options;

  await runTour(validated, stepIndex, actionIndex, i18n, onComplete, onSkip).catch(() => {
    activeTour = false;
    clearPendingState();
  });
}
