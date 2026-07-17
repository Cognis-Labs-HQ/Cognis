# Error Popup Navigation

## Post-load crashes stay on the page

Closing the runtime error popup no longer navigates away from a page that had already loaded successfully before a button or other post-load action crashed. Route load and route mount failures still return users to the previous route when needed.
