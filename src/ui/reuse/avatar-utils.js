/**
 * Avatar utilities: initials-based fallback avatar generation.
 *
 * Public exports:
 *   generateInitialsDataUrl(handle, size) — returns a PNG data URL (canvas-rendered circle
 *     with the user's uppercased initials on a deterministic solid background colour).
 *
 * Usage:
 *   import { generateInitialsDataUrl } from '../reuse/avatar-utils.js';
 *   imgEl.src = generateInitialsDataUrl('@alice_smith', 64);
 *   // → a data:image/png;base64,… URL showing "AS" on a coloured circle
 *
 * @param {string} handle — the user's handle (leading '@' is stripped automatically).
 * @param {number} [size=64] — canvas square size in pixels; result is a round image.
 * @returns {string} PNG data URL.
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

function getInitials(handle) {
  if (!handle) return '?';
  const clean = handle.replace(/^@/, '');
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return clean.slice(0, 2).toUpperCase();
}

function pickColor(handle) {
  let hash = 0;
  for (const ch of (handle ?? '')) {
    hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  }
  return INITIALS_PALETTE[Math.abs(hash) % INITIALS_PALETTE.length];
}

export function generateInitialsDataUrl(handle, size = 64) {
  const initials = getInitials(handle);
  const color = pickColor(handle);
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
