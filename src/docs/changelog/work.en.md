# Refine share management

## Preserve account access through owned and received shares

Opening a Whiteboard share as its creator or a Meeting user share as its recipient now keeps the authenticated account session during in-app navigation as well as after a refresh. The destination mounts its full account page, retains complete navigation, and no longer enters the restricted guest experience.

## Keep destination page controls and styles isolated

Whiteboard and Share pages keep layout editing disabled. Each in-app navigation now rebuilds the page action dock, discards actions not contributed by the destination, loads its complete stylesheet bundle, and removes route styles that no longer apply.

## Focus management on one share

The Shares page now opens a compact editor containing only the selected share's form. It keeps the share method fixed, updates only that database record, and no longer opens twice during client-side navigation.

## Align share controls

The Shares page no longer adds vertical space outside its card, and share buttons consistently use the cancel treatment for their potentially access-reducing action.

## Restore shared content routes

Registered gateway and module pages now load their own dashboard entry point and complete stylesheet bundle on a browser refresh as well as during in-app navigation. Shares, Meetings, and Whiteboards therefore retain their top bar, footer, layout, and component styling.

## Keep Meeting shares valid for their configured lifetime

Meeting shares now remain resolvable across meeting instances and ended sessions. Access continues until the share itself expires, is rejected, or is revoked, while repeated authentication flows reuse the already resolved share session.
