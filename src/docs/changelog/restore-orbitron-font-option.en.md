# Orbitron Font Restored

**Feature Branch:** copilot/restore-orbitron-font-option

## Orbitron Font Now Renders Correctly

The Orbitron font was showing in the font picker but not rendering because the font was never loaded into the browser. A Google Fonts import has been added to the base stylesheet so Orbitron (and the other application fonts Audiowide, Rajdhani, Exo 2, and Inter) are now properly loaded and available for selection in Settings. The Content Security Policy has also been updated to permit loading stylesheets from Google Fonts and font files from Google's font CDN.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/f5e3113eb90b58fc10f5ea1d5355b10358d6051e
