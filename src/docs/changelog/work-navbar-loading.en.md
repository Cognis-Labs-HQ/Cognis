# Reliable navbar loading

## Loading loop removed

Applying the saved navigation order now changes the DOM only when the order actually differs. The observer therefore no longer triggers an endless sequence of its own mutations, keeping the page shell responsive while it loads.
