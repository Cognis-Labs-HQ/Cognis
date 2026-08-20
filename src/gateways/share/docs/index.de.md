# Share-Browserclient

Der Share-Browserclient ermöglicht Modulen, das aktuell authentifizierte Freigabegastprofil über den öffentlichen Browservertrag des Share-Gateways abzurufen.

## Verwendungsbeispiele

`uiCtx` importieren, `share:uiClient` anfordern und `getGuestProfile()` aufrufen. Vor dem Lesen der JSON-Nutzdaten `{ data }` die zurückgegebene `Response` prüfen.

## Technische Spezifikation

Der Client besitzt `/api/v1/share/guest-profile`, gibt die ursprüngliche `Response` zurück und verwendet den Host-API-Client für Authentifizierung und Verbindungsbehandlung. Sein Anbieter ist nur mit dem Share-Gateway aktiv; abhängige Routen müssen `share:uiClient` deklarieren, wenn sie ihn beim Einhängen benötigen.
