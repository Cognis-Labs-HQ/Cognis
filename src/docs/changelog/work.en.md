# Whiteboard Refresh

## Direct page refreshes finish loading

The whiteboard page now uses the shared direct-mount helper, so refreshing a whiteboard URL clears the loading state the same way SPA navigation does.

## Drawing previews render correctly

Pen previews now use the extracted element renderer, preventing runtime errors after the whiteboard element rendering helpers moved into their own module.
