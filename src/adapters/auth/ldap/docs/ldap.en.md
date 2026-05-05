# LDAP Authentication Adapter

Authenticates users against an LDAP directory server.

## Configuration

| Key            | Description                                                  | Required |
| -------------- | ------------------------------------------------------------ | -------- |
| `host`         | LDAP server hostname                                         | Yes      |
| `port`         | LDAP server port                                             | Yes      |
| `bindDn`       | Bind DN for the service account                              | Yes      |
| `bindPassword` | Password for the bind DN                                     | Yes      |
| `baseDn`       | Base DN for user searches                                    | Yes      |
| `adminGroups`  | Comma-separated LDAP groups whose members receive admin role | No       |

Configure via `PUT /api/v1/gateways/auth/adapters/ldap/config` (admin only).
