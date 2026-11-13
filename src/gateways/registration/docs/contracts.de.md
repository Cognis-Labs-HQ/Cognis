# Registrierungsverträge

Das Registrierungs-Gateway verwaltet öffentliche Anmeldung und Einladungseinlösung und stellt Provider-Operationen über Gateway-Fähigkeiten und Routen bereit.

## Verwendungsbeispiele

Für die öffentliche Anmeldung wird die registrierte Fähigkeit aufgelöst. Das Ergebnis enthält username, enabled und die Rolle des Providers:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Technische Spezifikation

Einladungen werden über POST /api/v1/registration/redeem mit einem JSON-Objekt eingelöst, das token, username, password und optional email und displayName enthält. Das Gateway reicht die vollständigen Eingaben an den Einladungsprovider weiter. Dieser ist für Token-Validierung, Kontoerstellung und Speicherung der Einlösung verantwortlich; Fehler werden an die Fehlerbehandlung der Route weitergegeben. Die öffentliche Registrierung verwendet registration:public:isEnabled für die Verfügbarkeit und registration:public:register für die Ausführung. Deaktivierte Gateways weisen die Ausführung mit gateway_disabled zurück; ein nicht verfügbarer öffentlicher Provider mit public_disabled. Die Verfügbarkeit wird bei der Ausführung geprüft. Bootstrap registriert diese Fähigkeiten und erweitert vorhandene Abläufe gateAccountCreation und constructRegistrationUi über ctx. Aufrufer nutzen diese Schnittstellen, statt konkrete Adapter zu importieren.
