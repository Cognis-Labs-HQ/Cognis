# Anwendung

Praktische Abläufe für Öffentliche Registrierung.

## Voraussetzungen

Ein Administrator muss öffentliche Registrierung ausdrücklich aktivieren.

## Beispiele

Gib Benutzername und Passwort sowie optional E-Mail und Anzeigename ein und sende gemäß Richtlinie ab.

Beziehen Sie die Registrierung über die Gateway-Fähigkeit, statt einen Adapter aus einer anderen Komponente aufzurufen:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Erwartete Ergebnisse

Gültige Eingaben erstellen ein lokales Benutzerkonto ohne wählbare Administratorrolle.

## Fehlerbehebung

Prüfe Pflichtfelder, Namensverfügbarkeit und öffentliche Registrierungsrichtlinie bei Ablehnung.
