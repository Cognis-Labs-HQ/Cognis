# Provider-neutral Focus Control

**Feature Branch:** feature-define-provider-neutral-focus-control-contract

## Focus any declared collaboration surface

Added secure manifest contracts, staged flows, composer-owned controls, and synchronized overlay lifecycle support without coupling pages to providers.

## Focus any collaborative pane

Focusable composer elements now display a fullscreen icon, and active focus sessions can follow presenters or switch directly between declared collaborative surfaces such as meeting chat and a provider-created whiteboard.

## Movable meeting picture-in-picture

Focus providers can declare picture-in-picture mode, whose resizable meeting pane can be moved while other dashboard content remains available.

## Stable primary navigation

Primary navigation now keeps its application-defined order. Drag controls and user-specific ordering were removed to keep the page shell simple and reliable.

## External component pages

External modules can explicitly expose eligible SPA pages and other components can request them by immutable module UUID and stable route ID without importing provider code or guessing asset paths.

## Built-in pages use the broker

Cognis dashboard and Study pages now publish stable UUID-owned component page declarations, so built-in and external pages use the same request and Focus Control path.

## Authenticated module strings

Protected marketplace string bundles now use the authenticated API client, and module documentation clarifies that periods—not underscores or hyphens—separate words in localization keys.

## Recommendations stay current

Cached marketplace responses now retain Cognis recommendations after page refreshes, and the Modules page polls Cognis every fifteen seconds while mounted.

## Balanced module cards

The Modules grid now reserves more room for each card and arranges lifecycle actions in balanced rows, preventing controls from crowding or overlapping at common desktop widths.

## Navigation stays alphabetical

Dashboard navigation entries are sorted alphabetically whenever a module or another UI provider adds an entry, and the compact navigation drawer is redrawn from the updated order.

## Targeted component windows

Component-page discovery no longer mounts UI. An explicit, user-activated spawn capability opens a navigation-protected window inside the caller-owned stage and returns a discardable handle with automatic cleanup on abort and before every SPA route change.

## Stable user menu

The Cognis shell now reconciles user-menu contributions as providers load, removing duplicate destination entries caused by concurrent external-page and navbar refreshes.

## Validate and retain private repository scanning

Marketplace source settings now retain the private-repository scan preference after restarts. Enabling it validates that the configured PAT can list private repositories and read repository contents before saving, while catalog refreshes report missing credentials, denied private-repository access, and denied content access without discarding cached modules.

## Guard component-page entry evaluation

The component-page broker now evaluates provider entry modules through the same reference-counted import guard as SPA navigation. Entry modules that call `mountWhenDirect(mount)` cannot replace the host page during import; the guard is released before the broker mounts the component into its requested window.

## Move and resize meeting PiP windows

Focus Control PiP panes now use a reusable floating-window controller. Meeting panes can be dragged by their header and resized while remaining constrained to the visible viewport, with all interaction resources released when the pane closes.

## Load PiP support and suppress embedded chrome

The page-entry host now registers the floating-window capability before external pages mount, so Jitsi Meet can reliably create its movable meeting PiP. Page composers mounted inside component windows automatically omit nested topbars, navigation, language and theme controls, footers, preference loading, and account enhancements.

## Explain private-repository PAT permissions

Module Source fields now include information tooltips with the exact GitHub fine-grained and classic PAT requirements. External-module documentation now identifies the required resource owner, repository selection, read-only Metadata and Contents permissions, approval and SSO requirements, and clarifies that no selectable GitHub Organization permission is needed.

## Keep slider labels independent from help buttons

Form Builder now renders information-tooltip buttons beside, rather than inside, the field label associated with an input. Clicking the private-repository slider therefore toggles the checkbox, while the adjacent information button remains an independent help control.

## Restore slider interaction and source-form balance

Slider tracks are now explicit input labels, so clicking anywhere on the private-repository switch reliably toggles its checkbox without activating adjacent help. Module Source popup fields again use their intended grid spans, keeping credential controls aligned and balanced.

## Discover private repositories through the authenticated GitHub account

Private GitHub source scans now combine the organization repository listing with the authenticated account's accessible private repositories, restricted back to the configured organization. Fine-grained PATs can therefore discover selected private module repositories even when GitHub omits them from the organization listing.

## Host meeting PiP presentation in Cognis

Cognis now owns and loads the complete floating-window stylesheet used by meeting providers. Activating a whiteboard immediately raises the meeting into a fixed, visible, movable, and resizable PiP above the component canvas, while cleanup restores the meeting element's original inline layout.

## Support borderless component windows

Component-page callers can request a borderless spawn that removes outer window spacing and fills the entire parent stage while preserving the provider's control over spacing inside its content.

## Fill borderless canvases and retain meeting PiP

Borderless component windows now also remove page-composer workspace and outer content-card spacing so canvases reach every parent edge without bottom clipping. Floating meeting windows move into the host layer outside the paint-contained component stage, keeping the meeting PiP visible above the canvas across the page.

## Add explicit floating-window controls

Floating windows now include a thin top drag toolbar and a lower-right SVG resize handle. The host owns both pointer interactions, removes browser scrollbars and native resize ambiguity, constrains resizing to the visible page viewport, and removes the controls during cleanup.

## Preserve live meetings when opening PiP

Floating windows now enter the browser top layer without moving the provider element between DOM parents. The meeting iframe and its live connection therefore remain intact when PiP opens and closes; unsupported browsers use a parent-constrained fallback that also avoids reparenting.

## Keep component scrolling on the main page

Component windows now grow vertically with their content instead of creating nested vertical overflow. Wheel input remains focused on the main page even while the pointer is over embedded content, and the resize handle is transparent so only its SVG raster is visible.

## Remove page margins for borderless components

Spawning a borderless component now removes the containing `app-page__main` margin for a true edge-to-edge surface. Cognis reference-counts borderless windows and restores the normal page margin when the final one closes.

## Resize PiP from either diagonal corner

Floating PiP windows now provide SVG resize handles in both the upper-left and lower-right corners. Dragging either handle resizes within the visible boundary while preserving the opposite corner and enforcing the configured minimum dimensions.

## Align the meeting-to-whiteboard height contract

Borderless component stages now expose an explicit state class and mount layout contract, remove spacing from the nested app-shell workspace, and stretch every composer layer through the widget. The integration documentation now defines the corresponding Jitsi Meet stage and Nextcloud Whiteboard composer/canvas responsibilities so the canvas reaches the component border without nested vertical scrolling.

## Expose reusable UI resources through ctx

Browser modules can now obtain every production utility under `src/ui/reuse/` and every common stylesheet under `src/ui/styles/reuse/` through the `ui:reuse` capability. Production builds preserve their logical resource URLs, while validated relative paths prevent traversal, test imports, and extension mismatches.

## Advertise the reuse capability during module enablement

The API now registers `ui:reuse` in the host UI capability-provider catalog. Modules that declare the capability can therefore pass enablement validation before the same provider initializes the browser ctx resource surface.

## Link module details to their source repositories

Module detail headers now show a hyperlink SVG followed by the module’s complete, sanitized source repository URL directly below its title. Only the visible URL is linked, while the SVG remains decorative; unsafe or credential-bearing URLs are never rendered. Marketplace cards remain compact and do not show repository links.

## Adapt PiP resize handles to light and dark themes

Both diagonal PiP resize SVGs now use explicit high-contrast colors for Cognis light and dark themes. Unconfigured pages also follow the browser’s dark color-scheme preference, while the SVG paths continue to inherit their handle color through `currentColor`.

## Focus sessions behave consistently

Focus surfaces may now use their optional default state, declared application routes resolve correctly, local dismissal no longer ends a shared session, and remotely ended sessions close without leaving stale content behind.

## Composer code stays readable

Grid sizing now lives in a focused, tested module, while the explanatory comments and spacing in page-composer initialization have been restored.

## Keep Dashboard first

Dashboard now remains the first primary-navigation entry while every other entry continues to be sorted alphabetically.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/48395e7f07a41221e2e866d9892493df3e98b841
