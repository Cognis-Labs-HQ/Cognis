# Anwendung

Praktische Abläufe für Lernfortschritt.

## Voraussetzungen

Beachten Sie vor dem Ausführen [die Zugriffsanforderungen](/docs/adapters/study/progress).

## Beispiele

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Erwartete Ergebnisse

Das Beispiel verwendet die dokumentierte Schnittstelle von Lernfortschritt. Prüfen Sie vor erneuten Schreibvorgängen die unter [Technik](/docs/adapters/study/progress/technical) beschriebene Antwort oder den gespeicherten Zustand.

## Fehlerbehebung

Falls Lernfortschritt nicht verfügbar ist, prüfen Sie Ihre Anmeldung und lassen Sie den Administrator die Komponente und ihre Abhängigkeiten kontrollieren.
