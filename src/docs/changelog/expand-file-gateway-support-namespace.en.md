# File Namespaces & Quotas

## Files gateway now organizes all content into namespaces with enforced ACLs and quotas

Every file operation is now scoped to a namespace — an isolated content area owned by a specific component (`profile`, `chats`, `classes`) or by core (`default`, `user`). Namespaces declare an ACL ceiling (`private-owner`, `private-group`, or `component-managed`) that bounds what any object stored inside them may expose, and per-object grants (owner, collaborator group, or public-read) can never exceed that ceiling. Cross-component access to a namespace is denied unless the namespace explicitly allow-lists the calling component (core is always permitted).

## Per-namespace and global storage quotas

A new file quota adapter tracks admin-configurable default storage quotas per namespace plus a single global default, snapshotting them into per-user overrides at account-creation time so a user's quota reflects what applied when they registered. Admins can adjust an individual user's quotas afterward from the Users page's new "Storage Quotas" action. Writes that would exceed either quota are rejected with a `413 quota_exceeded` error.

## Profile avatars and banners migrated to the new "profile" namespace

The social/profile adapter's avatar and banner uploads now go through the files gateway's namespaced `files:store`/`files:delete` capabilities against a broadly-readable `profile` namespace, replacing the old generic, un-namespaced file bucket routes. The `social/messages` and `study/classes` adapters register foundational `chats` and `classes` namespaces respectively, ready for future attachment features.
