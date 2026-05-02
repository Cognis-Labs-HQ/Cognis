/**
 * Creates a reusable "unsaved changes" floating toolbar controller.
 *
 * The floating toolbar element must contain:
 *   - A button with data-action="save"   → triggers onSave
 *   - A button with data-action="discard" → triggers onDiscard
 *
 * Usage:
 *   const bar = createUnsavedChangesBar(floatingEl, {
 *     onSave:    async () => { ... write prefs ... },
 *     onDiscard: ()     => { ... revert each tracker ... },
 *   });
 *
 *   // Tell the bar which field is dirty:
 *   bar.markDirty('font', true);
 *   bar.markDirty('font', false);
 *
 * @param {HTMLElement|null} floatingEl
 * @param {{ onSave?: () => Promise<void>, onDiscard?: () => void }} options
 * @returns {{ markDirty(id: string, dirty: boolean): void, isAnyDirty(): boolean, sync(): void }}
 */
export function createUnsavedChangesBar(floatingEl, { onSave, onDiscard } = {}) {
  const dirtyMap = new Map();

  function isAnyDirty() {
    for (const v of dirtyMap.values()) {
      if (v) return true;
    }
    return false;
  }

  function sync() {
    if (!floatingEl) return;
    floatingEl.hidden = !isAnyDirty();
  }

  function markDirty(id, dirty) {
    dirtyMap.set(id, dirty);
    sync();
  }

  floatingEl?.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
    await onSave?.();
  });

  floatingEl?.querySelector('[data-action="discard"]')?.addEventListener('click', () => {
    onDiscard?.();
    dirtyMap.clear();
    sync();
  });

  return { markDirty, isAnyDirty, sync };
}
