/**
 * Avatar utilities: initials-based fallback avatar generation.
 *
 * Public exports:
 *   getInitialsText(handle) — returns a 1-2 letter initials string for the given handle.
 *   pickInitialsColor(handle) — returns a deterministic hex color string for the given handle.
 *   generateInitialsDataUrl(handle, size) — canvas PNG data URL (kept for environments where
 *     a data: URI is acceptable; prefer CSS initials for CSP-restricted pages).
 *
 * Usage:
 *   import { getInitialsText, pickInitialsColor } from '../reuse/avatar-utils.js';
 *   span.textContent = getInitialsText('@alice_smith');        // → "AS"
 *   div.style.background = pickInitialsColor('@alice_smith');  // → "#3b82f6"
 *
 * @param {string} handle — the user's handle (leading '@' is stripped automatically).
 */

const INITIALS_PALETTE = [
  '#2a7f62',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#06b6d4',
  '#10b981',
  '#ef4444',
  '#f97316',
  '#6366f1',
];

export function getInitialsText(handle) {
  if (!handle) return '?';
  const clean = handle.replace(/^@/, '');
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

export function pickInitialsColor(handle) {
  let hash = 0;
  for (const ch of (handle ?? '')) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return INITIALS_PALETTE[Math.abs(hash) % INITIALS_PALETTE.length];
}

export function generateInitialsDataUrl(handle, size = 64) {
  const initials = getInitialsText(handle);
  const color = pickInitialsColor(handle);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(size * 0.38)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(initials, size / 2, size / 2);
  return canvas.toDataURL('image/png');
}
