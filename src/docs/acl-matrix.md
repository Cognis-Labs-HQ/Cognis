# Cognis ACL Matrix

| Capability | user | teacher | moderator | admin |
|---|---:|---:|---:|---:|
| Self-register | ✅ | ✅ | ✅ | ✅ |
| View/edit own profile | ✅ | ✅ | ✅ | ✅ |
| Upload own avatar / banner | ✅ | ✅ | ✅ | ✅ |
| Create posts (when not hidden) | ✅ | ✅ | ✅ | ✅ |
| Follow / unfollow users | ✅ | ✅ | ✅ | ✅ |
| Block / unblock users | ✅ | ✅ | ✅ | ✅ |
| Upload / download files | ✅ | ✅ | ✅ | ✅ |
| View learning content | ✅ | ✅ | ✅ | ✅ |
| Submit content for review | ✅ | ✅ | ✅ | ✅ |
| Access teacher-specific APIs | ❌ | ✅ | ❌ | ✅ |
| Delete any user's post | ❌ | ❌ | ✅ | ✅ |
| Delete arbitrary files | ❌ | ❌ | ❌ | ✅ |
| View any profile regardless of visibility | ❌ | ❌ | ❌ | ✅ |
| Configure file size limits | ❌ | ❌ | ❌ | ✅ |
| Review / approve global content | ❌ | ❌ | ❌ | ✅ |
| Install module (zip) | ❌ | ❌ | ❌ | ✅ |
| Enable / disable non-core module | ❌ | ❌ | ❌ | ✅ |
| Toggle core module | ❌ | ❌ | ❌ | ❌ |
| Manage auth provider config | ❌ | ❌ | ❌ | ✅ |
| System diagnostics endpoints | ❌ | ❌ | ❌ | ✅ |

## Role notes

- **user** — default role granted on self-registration. Equivalent to the student role for all platform purposes.
- **teacher** — elevated API access for instructor features. Granted at account creation by an admin; not self-assignable.
- **moderator** — community moderation rights (delete any post). No access to system or admin configuration.
- **admin** — full platform access. Admin accounts are created out-of-band; self-registration always issues `user`.
