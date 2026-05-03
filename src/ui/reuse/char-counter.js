/**
 * Character counter: attaches a live count display to a text input or textarea.
 *
 * Public exports:
 *   attachCharCounter(inputEl, limit) — adds a counter element after `inputEl` and
 *     enforces the character limit by trimming input on the `input` event.
 *
 * Usage:
 *   import { attachCharCounter } from '../reuse/char-counter.js';
 *   const textarea = document.getElementById('bio');
 *   attachCharCounter(textarea, 200);
 *
 * @param {HTMLInputElement|HTMLTextAreaElement} inputEl — the input to attach to.
 * @param {number} limit — the maximum number of characters allowed.
 * @returns {HTMLElement} the counter element that was inserted after inputEl.
 */

export function attachCharCounter(inputEl, limit) {
  const counter = document.createElement('span');
  counter.className = 'char-counter';

  function update() {
    if (inputEl.value.length > limit) {
      inputEl.value = inputEl.value.slice(0, limit);
    }
    const remaining = limit - inputEl.value.length;
    counter.textContent = `${inputEl.value.length} / ${limit}`;
    counter.classList.toggle('char-counter--near-limit', remaining <= Math.ceil(limit * 0.1));
    counter.classList.toggle('char-counter--at-limit', remaining === 0);
  }

  inputEl.addEventListener('input', update);
  inputEl.after(counter);
  update();
  return counter;
}
