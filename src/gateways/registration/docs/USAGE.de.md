# Anwendung

Praktische Abläufe für Registrierung.

## Voraussetzungen

Inhaber verwalten Einladungsrichtlinien; Ausstellung hängt von Rolle und Anbietern ab.

## Beispiele

Prüfe die Richtlinie, erstelle eine erlaubte Einladung und löse sie mit der eingeladenen Adresse ein; öffentliche Formulare brauchen öffentliche Registrierung.

Für die öffentliche Anmeldung wird die registrierte Fähigkeit aufgelöst. Das Ergebnis enthält username, enabled und die Rolle des Providers:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Erwartete Ergebnisse

Kontoerstellung folgt Anbieter und Richtlinie; scheitert das Speichern, bleibt die Einladung nutzbar.

## Fehlerbehebung

Prüfe Ablauf, Adresse und Limits. Externe Anmeldung umgeht keine Registrierungsfreigabe.
