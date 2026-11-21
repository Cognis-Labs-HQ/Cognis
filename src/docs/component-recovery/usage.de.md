# Anwendung

Praktische Abläufe für Komponentenwiederherstellung.

## Voraussetzungen

Beachten Sie vor dem Ausführen [die Zugriffsanforderungen](/docs/component-recovery).

## Beispiele

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Erwartete Ergebnisse

Das Beispiel verwendet die dokumentierte Schnittstelle von Komponentenwiederherstellung. Prüfen Sie vor erneuten Schreibvorgängen die unter [Technik](/docs/component-recovery/technical) beschriebene Antwort oder den gespeicherten Zustand.

## Fehlerbehebung

Falls Komponentenwiederherstellung nicht verfügbar ist, prüfen Sie Ihre Anmeldung und lassen Sie den Administrator die Komponente und ihre Abhängigkeiten kontrollieren.
