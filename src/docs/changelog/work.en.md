# Refine share management

## Focus management on one share

The Shares page now opens a compact editor containing only the selected share's form. It keeps the share method fixed, updates only that database record, and no longer opens twice during client-side navigation.

## Align share controls

The Shares page no longer adds vertical space outside its card, and share buttons consistently use the cancel treatment for their potentially access-reducing action.

## Restore shared content routes

Registered gateway and module pages now load their own dashboard entry point and complete stylesheet bundle on a browser refresh as well as during in-app navigation. Shares, Meetings, and Whiteboards therefore retain their top bar, footer, layout, and component styling.

## Keep Meeting shares valid for their configured lifetime

Meeting shares now remain resolvable across meeting instances and ended sessions. Access continues until the share itself expires, is rejected, or is revoked, while repeated authentication flows reuse the already resolved share session.
