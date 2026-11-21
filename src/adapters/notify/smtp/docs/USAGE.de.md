# Anwendung

Praktische Abläufe für E-Mail-Zustellung.

## Voraussetzungen

Beachten Sie vor dem Ausführen [die Zugriffsanforderungen](/docs/adapters/notify/smtp).

## Beispiele

Prüfen Sie vor der Ausführung die Argumente des installierten Befehls.

```sh
cognisctl email:list --help
cognisctl email:add --help
cognisctl email:remove --help
cognisctl email:primary --help
cognisctl email:verify:send --help
```

## Erwartete Ergebnisse

Das Beispiel verwendet die dokumentierte Schnittstelle von E-Mail-Zustellung. Prüfen Sie vor erneuten Schreibvorgängen die unter [Technik](/docs/adapters/notify/smtp/technical) beschriebene Antwort oder den gespeicherten Zustand.

## Fehlerbehebung

Falls E-Mail-Zustellung nicht verfügbar ist, prüfen Sie Ihre Anmeldung und lassen Sie den Administrator die Komponente und ihre Abhängigkeiten kontrollieren.
