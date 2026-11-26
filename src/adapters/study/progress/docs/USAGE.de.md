# Anwendung

Praktische Abläufe für Lernfortschritt.

## Voraussetzungen

Übe mit einer aktiven Lernfunktion; Klassendaten verlangen aktuellen Zugriff.

## Beispiele

Beende einen Versuch, prüfe das Ergebnis und kehre später mit dem gespeicherten Fortschritt zurück.

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Erwartete Ergebnisse

Ereignisse überstehen Neustarts; bestätigte Übungen können XP gewähren. Korrekturen ergänzen statt überschreiben.

## Fehlerbehebung

Prüfe Konto und Klassenkontext. Derselbe erneut gesendete Versuch erzeugt keinen zusätzlichen Fortschritt oder Belohnung.
