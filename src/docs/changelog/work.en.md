# Whiteboard Presence and Selection Fixes

## Presence Leaves Cleanly

Whiteboard page presence now marks visitors inactive when they hide, unload, or navigate away from the page, and guest avatar initials ignore leading hash characters.

## Canvas Drawing Is More Stable

The whiteboard canvas keeps its drawing surface dimensions stable while drawing and clears previous selections as soon as non-selection tools are used.

## Drawing Selection Uses Visible Content

Whiteboard hit-testing and box selection now target the visible drawing content instead of selecting by an element's full bounding area.

## Whiteboard Controls Improve Dark Mode

The line thickness dropdown now uses the themed select styling, and the native color input opts into light/dark browser color schemes where supported.
