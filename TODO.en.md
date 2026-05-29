# Ignored Automated Feedback

## Code Review — PR #45 third-pass (2026-05-29)

### settings-section.js drag-drop handler — mutation before rerender

**Reviewer suggestion:** Remove the `pendingPreferredIds.filter(...)` mutation at lines 461-463 because "the deactivation toast logic starting at line 466 already handles building the correct method list and the `rerender()` call will reflect the updated state."

**Reason ignored:** The suggestion is based on a misreading of the code. The `allMethods` list built at line 466 is used only to look up the display name for the toast; it does not update `pendingPreferredIds`. Removing the filter mutation would mean `pendingPreferredIds` still contains the deactivated method after the drag, causing `rerender()` to show an incorrect UI state where the method appears as preferred even though it was dragged to the available table.

### gateway.ts TfaAdapterFactory JSDoc — suggested `*/` relocation

**Reviewer suggestion:** Move the closing `*/` of the JSDoc block to after the type definition so the type itself is inside the documentation block.

**Reason ignored:** JSDoc syntax requires the `*/` to precede the declaration it documents — placing it after `TfaAdapterFactory`'s closing `) => TfaMethodAdapter;` would include the type syntax inside the comment string, making the declaration invisible to the TypeScript compiler.

# Deferred Feedback Items

- [ ] `src/gateways/calendar/ui/app.js` automated review suggested replacing `mountWhenDirect(mount)` with `await mount(document.querySelector('#app'))`. Not applied because this page is dynamically loaded by the SPA router and direct mounting on import would double-mount during router navigation.
- [ ] `src/gateways/calendar/ui/app/index.js` automated review suggested restoring calendar selection logic (setting `selectedCalendarId`, clearing `selectedEventId`, calling `syncRouteSelection()` and `composer.refresh()`) alongside the edit action in the toolbar click handler. Not applied because the explicit user instruction was to make clicking a calendar open the edit popup as the sole click behavior, which directly conflicts with preserving the select-to-filter behavior.
