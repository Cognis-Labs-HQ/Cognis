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

## Sicherheit

Die Zustandsabfrage verlangt eine Anmeldung. Richtlinienverwaltung verlangt Verwaltungsrechte; Erstellen und Auflisten von Einladungen folgen der geltenden Regel. Zurückgehaltene externe Identitäten bleiben serverseitig.

## Referenz

### Technische Spezifikation

| Seite / Bereich                     | Anleitung            | Zugriff             |
| ----------------------------------- | -------------------- | ------------------- |
| `/invite`                           | Einladungsanleitung  | Angemeldeter Nutzer |
| `/administration` · `#registration` | Registrierungsregeln | Administrator       |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).
