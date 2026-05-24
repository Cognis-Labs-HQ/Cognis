# Error Page

## Navigable error page with animated gradient heading

A dedicated `/error` page is now available. Navigate to it directly with a
`?code=` query parameter (e.g. `/error?code=404`) or land on it automatically
when a URL is not recognised.

The page displays a large error code heading with a flowing animated gradient
that uses the same teal-to-navy colour blend as the global navigation bar. A
plain-language description of the error appears below the heading along with a
button to return to the dashboard.

When the user is signed in, the page renders inside the full dashboard shell
with the navigation bar, topbar, and footer. When the user is not signed in, it
is displayed as a full-screen message without shell chrome. The heading scales
responsively so it remains legible on small screens.
