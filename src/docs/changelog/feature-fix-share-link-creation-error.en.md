# Share Forms Restored

## Share forms load in production

The production UI build now includes adapter-provided share method page modules, so both link and user share popups display their forms instead of an unavailable-method error.

## Consistent whiteboard sharing

The whiteboard now opens the same gateway-owned, drop-in share popup used by other pages, including both link and user sharing. Presence avatars are constrained to the toolbar so profile images can no longer cover the drawing canvas.

The profile image element used by page presence now receives its presentation from the shared presence stylesheet itself. It therefore remains a toolbar avatar instead of rendering as an unstyled image layer over the whiteboard canvas.
