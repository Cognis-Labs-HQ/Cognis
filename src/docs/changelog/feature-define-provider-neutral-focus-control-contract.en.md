# Provider-neutral Focus Control

## Focus any declared collaboration surface

Added secure manifest contracts, staged flows, composer-owned controls, and synchronized overlay lifecycle support without coupling pages to providers.

## Focus any collaborative pane

Focusable composer elements now display a fullscreen icon, and active focus sessions can follow presenters or switch directly between declared collaborative surfaces such as meeting chat and a provider-created whiteboard.

## Movable meeting picture-in-picture

Focus providers can declare picture-in-picture mode, whose resizable meeting pane can be moved while other dashboard content remains available.

## Reliable navigation reordering

One toggle now enables navigation editing for the whole bar. Dragged entries are placed at the indicated drop position and the resulting order is persisted.

## Loading loop removed

Applying the saved navigation order now changes the DOM only when the order actually differs. The observer therefore no longer triggers an endless sequence of its own mutations, keeping the page shell responsive while it loads.
