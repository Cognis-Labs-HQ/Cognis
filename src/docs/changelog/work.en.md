# Share View Fix

## Fixed whiteboard share display

Whiteboard share links now select the matching page renderer instead of the first renderer hook result, so the shared whiteboard app mounts instead of showing the generic unavailable shared-content fallback.

## Reduced canvas overflow

The whiteboard canvas now keeps its default size when content fits and only adds overflow space once elements genuinely pass the visible canvas bounds.
