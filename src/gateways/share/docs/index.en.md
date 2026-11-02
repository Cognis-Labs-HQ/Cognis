# Share browser client

Adapter navbar providers are declared by the owning adapter and follow its enabled state. Sender discovery uses `notify:listSenders`, without receiving the Notification Gateway implementation. Periodic Share maintenance stops on gateway disable and resumes on activation.

The Share browser client lets modules retrieve the current authenticated share-guest profile through the Share gateway's public browser contract.

## Usage examples

Import `uiCtx`, require `share:uiClient`, and call `getGuestProfile()`. Inspect the returned `Response` before reading its `{ data }` JSON payload.

## Technical specification

The client owns `/api/v1/share/guest-profile`, returns the original `Response`, and relies on the host API client for authentication and connection handling. Its provider is active only with the Share gateway, so dependent routes must declare `share:uiClient` when they require it during mount.

Browser components that render a Share action require `share:uiGateway` and call `mountTrigger(container, options)`. The gateway owns the localized icon-and-label markup, consequence styling, guest-session suppression, and teardown handle; consumers supply only their container and activation callback.

## Reliable Sharing and Tests

Calendar and Flashcards sharing hooks tolerate unrelated resource providers returning no result, so both link and account shares can be created and resolved with all providers enabled. Share loading, account-share status and Calendar guest pages use responsive minimum sizes rather than requiring eight grid columns. Guest pages remain usable on narrow screens. Share maintenance runs sequentially, coalesces overlapping requests, ends a failed pass and retries at the next fifteen-minute interval. Disable stops subsequent work; reactivation resumes scheduling.

Guest Flashcard practice uses a temporary mode selection and disables account enhancements and persisted layout settings. It does not read or write account practice preferences.
