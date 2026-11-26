# Usage

Practical procedures for SAML Sign In.

## Prerequisites

The bundled SAML adapter has no installed protocol client. createAdapter() returns an adapter with a null client; integration must explicitly supply a validated client through setClient(). Configuration alone does not enable sign-in.

## Examples

Save the SAML provider configuration, then test with a signed assertion from a normal organization account. Check the mapped email and administrator groups.

## Expected Results

With no injected client, authentication returns null even when the configuration form is complete. Test successful authentication only in an integration that supplies the client.

## Troubleshooting

Check client integration first. Discovery, assertion signatures and remote transport are the injected client's responsibility; editing role mappings does not supply that client.
