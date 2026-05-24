# TFA-Gateway

## Zweck

Verwaltet Zwei-Faktor-Methoden, Login-Prüfung, Wiederherstellungscodes und Erzwingungsstatus.

## Verantwortlichkeiten

- Entdeckt und lädt TFA-Adapter aus `src/adapters/tfa/*`.
- Stellt Endpunkte für Setup, Aktivieren/Deaktivieren und Präferenzen bereit.
- Führt Login-Challenge-Prüfung über konfigurierte Methoden aus.
- Erzeugt Wiederherstellungscodes und verfolgt deren Nutzungsstatus.
- Meldet den Erzwingungsstatus, damit die UI bei Bedarf Setup erzwingt.

## Wichtige API-Endpunkte

- `GET /api/v1/tfa/methods`
- `POST /api/v1/tfa/methods/:id/setup/begin`
- `POST /api/v1/tfa/methods/:id/setup/verify`
- `POST /api/v1/tfa/methods/:id/setup/cancel`
- `POST /api/v1/tfa/methods/:id/enable`
- `POST /api/v1/tfa/methods/:id/disable`
- `PUT /api/v1/tfa/methods/preferences`
- `GET /api/v1/tfa/recovery-codes`
- `POST /api/v1/tfa/recovery-codes/rotate`
- `GET /api/v1/tfa/status`
