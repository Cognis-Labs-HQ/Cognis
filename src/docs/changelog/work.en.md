# Whiteboard Fixes

## Theme-aware auto strokes refresh immediately

Whiteboard objects created with the automatic stroke color now resolve their color during rendering, so they switch between the light and dark theme colors as soon as the app theme changes and the canvas background repaints at the same time.

## Whiteboard rename requests are validated safely

The rename flow now keeps a reliable board id, trims the submitted title, and returns explicit validation errors for malformed rename requests instead of surfacing generic bad request failures.
