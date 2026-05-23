# Orbitron Font Restored

## Orbitron Font Now Renders Correctly

The Orbitron font was showing in the font picker but not rendering because the font was never loaded into the browser. A Google Fonts import has been added to the base stylesheet so Orbitron (and the other application fonts Audiowide, Rajdhani, Exo 2, and Inter) are now properly loaded and available for selection in Settings. The Content Security Policy has also been updated to permit loading stylesheets from Google Fonts and font files from Google's font CDN.
