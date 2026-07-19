# File namespace review hardening

## Quota administration routes no longer conflict with file object routes

The Files gateway now registers its quota administration handlers before the namespace object catch-all, so `/api/v1/files/admin/...` requests reliably reach the admin quota API instead of being interpreted as a file in an `admin` namespace.

## New users receive namespace quota snapshots on fresh installs

Account provisioning now seeds default quota rows for every registered namespace before snapshotting a user's quotas, preserving namespace quota enforcement even before an administrator opens the quota defaults screen.

## Restricted share links enforce recipients

Share token resolution now checks token recipients before issuing guest access or returning a payload. Recipient-restricted tokens require the requester to be the token owner or a named user recipient, preventing unrestricted link holders from bypassing the declared recipient list.

## Version docs remain localized

The component version documents now carry translated rule text consistently across supported languages.
