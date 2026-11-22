# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Registrierung.

## Schnittstellen

`GET /api/v1/registration/state`

`GET /api/v1/registration/policy`

`PUT /api/v1/registration/policy`

`POST /api/v1/registration/invite`

`POST /api/v1/registration/redeem`

`GET /api/v1/registration/tokens`

`POST /api/v1/registration/tokens`

## Konfiguration

Einladungsregeln und aktivierte Anbieter bestimmen die Erstellung von Konten und Einladungen. Token und Registrierungszustand werden über den Datenbankdienst gespeichert.

## Verhalten

Die CLI-Beiträge `invite:create`, `invite:list` und `invite:state` rufen die angegebenen HTTP-Vorgänge auf. Die Einlösung prüft Token und Regeln vor der Kontoerstellung.

Einladungen werden über POST /api/v1/registration/redeem mit einem JSON-Objekt eingelöst, das token, username, password und optional email und displayName enthält. Das Gateway reicht die vollständigen Eingaben an den Einladungsprovider weiter. Dieser ist für Token-Validierung, Kontoerstellung und Speicherung der Einlösung verantwortlich; Fehler werden an die Fehlerbehandlung der Route weitergegeben. Die öffentliche Registrierung verwendet registration:public:isEnabled für die Verfügbarkeit und registration:public:register für die Ausführung. Deaktivierte Gateways weisen die Ausführung mit gateway_disabled zurück; ein nicht verfügbarer öffentlicher Provider mit public_disabled. Die Verfügbarkeit wird bei der Ausführung geprüft. Bootstrap registriert diese Fähigkeiten und erweitert vorhandene Abläufe gateAccountCreation und constructRegistrationUi über ctx. Aufrufer nutzen diese Schnittstellen, statt konkrete Adapter zu importieren.

## Sicherheit

Die Zustandsabfrage verlangt eine Anmeldung. Richtlinienverwaltung verlangt Verwaltungsrechte; Erstellen und Auflisten von Einladungen folgen der geltenden Regel. Zurückgehaltene externe Identitäten bleiben serverseitig.

## Referenz

### Technische Spezifikation

| Seite / Bereich                     | Anleitung            | Zugriff             |
| ----------------------------------- | -------------------- | ------------------- |
| `/invite`                           | Einladungsanleitung  | Angemeldeter Nutzer |
| `/administration` · `#registration` | Registrierungsregeln | Administrator       |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).
