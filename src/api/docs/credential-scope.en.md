# Scoped Route Admission

Account guards now accept only session-purpose credentials. A mixed resource route must explicitly obtain `share:getGuestClaims(request)`, then apply its resource and capability authorization. Missing or invalid guest admission falls back only to normal account authentication, never to account authorization with guest claims. A module route that performs this complete admission in its handler omits outer account-role metadata; management routes keep it. Only provider and app-route discovery accept live guest credentials for rendering, with existing role visibility filters. The no-store identity endpoint returns only verified subject, role, provider, purpose and setup state.

## Usage

`await ctx.getCapability("share:getGuestClaims")(request)`

## Contract

`Promise<{ sub: string; role: "user"; providerId: string; purpose: "share"; setupPending: false } | null>`
