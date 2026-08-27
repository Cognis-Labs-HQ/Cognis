# Reliable Module Updates

## Updates defer dependency checks

Module updates now replace the checkout while the module is disabled and defer dependency readiness checks to the normal enable flow. This prevents an installed module's temporary runtime state from causing a valid same-version commit update to fail with HTTP 422, while activation still requires every declared dependency.
