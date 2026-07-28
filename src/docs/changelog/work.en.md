# Strengthen sharing and secret ownership

## Move encrypted secrets into the required authentication keyring adapter

The keyring client, persistence store, and API route now belong to a required Authentication adapter. Legacy preference migration and plaintext chat-room key retrieval were removed, so secret consumers resolve keys exclusively through the encrypted keyring.

## Keep sharing responsibilities within their owning adapters

The User Share adapter now enforces recipient uniqueness, while SMTP remains solely responsible for queued email rate limiting. The Share gateway only orchestrates these adapter-owned policies.

## Align keyring bootstrap with capability architecture

The reusable browser keyring is contained in the required Authentication adapter. The required Authentication adapter now self-bootstraps its vault and route capabilities during gateway discovery, receives authentication through route context injection, and includes component-owned documentation.

## Restore source-size and dependency compliance

Large Calendar route and test files were split into focused modules, oversized touched files were brought below the 1,000-line limit, and Share dependency ceilings now match the tested workspace version.

## Contain the complete keyring in its Authentication adapter

The browser keyring now lives with the adapter’s store, routes, manifest, and documentation. The adapter registers its own static UI directory during discovery, and every consumer imports the adapter-owned browser surface.
