# Usage

Practical procedures for LDAP Sign In.

## Prerequisites

Prepare the LDAP URL, bind credentials, user search base and filter in Authentication administration.

## Examples

Save the LDAP settings and run the connection test. Resolve bind or search errors, then test sign-in with a directory user before relying on group-based administrator access.

## Expected Results

The test reports connection and lookup status. Successful authentication links the directory identity to a Cognis account.

## Troubleshooting

Check TLS trust, bind permissions, search scope and the username filter. A successful connection alone does not prove that a particular user's password or group mapping is valid.
