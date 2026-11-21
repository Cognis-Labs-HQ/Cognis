# Usage

Practical procedures for OpenID Connect.

## Prerequisites

The bundled OIDC adapter has no installed protocol client. createAdapter() returns an adapter with a null client; integration must explicitly supply a validated client through setClient(). Configuration alone does not enable sign-in.

## Examples

Obtain a valid provider access token through your client application and submit it using the configured Cognis authentication provider. Test with a non-administrator identity first.

## Expected Results

With no injected client, authentication returns null even when the configuration form is complete. Test successful authentication only in an integration that supplies the client.

## Troubleshooting

Check client integration first. Discovery, assertion signatures and remote transport are the injected client's responsibility; editing role mappings does not supply that client.
