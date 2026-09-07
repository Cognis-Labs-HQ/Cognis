# File Namespaces & Quotas

**Feature Branch:** copilot/expand-file-gateway-support-namespace

## Files gateway now organizes all content into namespaces with enforced ACLs and quotas

Every file operation is now scoped to a namespace — an isolated content area owned by a specific component (`profile`, `chats`, `classes`) or by core (`default`, `user`). Namespaces declare an ACL ceiling (`private-owner`, `private-group`, or `component-managed`) that bounds what any object stored inside them may expose, and per-object grants (owner, collaborator group, or public-read) can never exceed that ceiling. Cross-component access to a namespace is denied unless the namespace explicitly allow-lists the calling component (core is always permitted).

## Per-namespace and global storage quotas

A new file quota adapter tracks admin-configurable default storage quotas per namespace plus a single global default, snapshotting them into per-user overrides at account-creation time so a user's quota reflects what applied when they registered. Admins can adjust an individual user's quotas afterward from the Users page's new "Storage Quotas" action. Writes that would exceed either quota are rejected with a `413 quota_exceeded` error.

## Profile avatars and banners migrated to the new "profile" namespace

The social/profile adapter's avatar and banner uploads now go through the files gateway's namespaced `files:store`/`files:delete` capabilities against a broadly-readable `profile` namespace, replacing the old generic, un-namespaced file bucket routes. The `social/messages` and `study/classes` adapters register foundational `chats` and `classes` namespaces respectively, ready for future attachment features.

## Quota administration routes no longer conflict with file object routes

The Files gateway now registers its quota administration handlers before the namespace object catch-all, so `/api/v1/files/admin/...` requests reliably reach the admin quota API instead of being interpreted as a file in an `admin` namespace.

## New users receive namespace quota snapshots on fresh installs

Account provisioning now seeds default quota rows for every registered namespace before snapshotting a user's quotas, preserving namespace quota enforcement even before an administrator opens the quota defaults screen.

## Restricted share links enforce recipients

Share token resolution now checks token recipients before issuing guest access or returning a payload. Recipient-restricted tokens require the requester to be the token owner or a named user recipient, preventing unrestricted link holders from bypassing the declared recipient list.

## Version docs remain localized

The component version documents now carry translated rule text consistently across supported languages.

## Commits

- [80305d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/80305d183fd1fc1e89c960dfb5c6712c87f188f8)
