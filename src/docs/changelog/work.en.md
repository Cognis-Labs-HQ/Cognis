# Strengthen sharing and secret ownership

## Move encrypted secrets into the required authentication keyring adapter

The keyring client, persistence store, and API route now belong to a required Authentication adapter. Legacy preference migration and plaintext chat-room key retrieval were removed, so secret consumers resolve keys exclusively through the encrypted keyring.

## Keep sharing responsibilities within their owning adapters

The User Share adapter now enforces recipient uniqueness, while SMTP remains solely responsible for queued email rate limiting. The Share gateway only orchestrates these adapter-owned policies.
