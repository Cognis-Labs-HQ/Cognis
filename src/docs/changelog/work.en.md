# Reliable Module Configuration Setup

## Configure disabled modules before activation

When a module-owned configuration route is unavailable, Cognis now opens the settings form with its manifest defaults and activates the module only when the form is saved. The values are then written immediately through the mounted module route, allowing required API keys to be saved without exposing a 404 error or caching them in the browser.

## Complete required setup after empty enable responses

The activation flow now continues required-configuration setup when the enable endpoint correctly returns an empty success response. Settings remain available from the module detail cog and failed or cancelled required setup still rolls the module back to disabled.
