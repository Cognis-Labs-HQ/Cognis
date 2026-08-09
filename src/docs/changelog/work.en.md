# Refine share management

## Simplify authenticated and guest share behavior

User-share notifications retain the designated account session, while password-protected public links prompt without unlocking or saving into an account keyring before entering guest mode. Empty update fields preserve existing values, and module-owned share dialogs now consistently use the corrected password and deletion wording.

## Secure user shares and clarify sharing controls

User shares continue to require the designated account instead of creating transferable guest access. Share actions now use neutral styling, permission choices clearly distinguish Read-Only from Read & Write, password dialogs provide concise recipient guidance, and removed guest shares exit cleanly without repeated redirects or notices.

## Restore share updates and seamless page transitions

The focused share editor now submits expiration changes consistently and presents its update action with the standard confirm treatment. In-app navigation keeps the current page styled until the destination has fully mounted, preventing flashes of unstyled outgoing content.

## Filter and remove shares immediately

The Total, Sent, and Received summary pills now filter the Shares table. Successfully rejected or deleted shares disappear immediately, and each destructive row action uses the standard cancel treatment without competing button classes.

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
