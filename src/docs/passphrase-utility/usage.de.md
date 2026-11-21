# Anwendung

Praktische Abläufe für Passphrasen-Dienstprogramm.

## Voraussetzungen

Beachten Sie vor dem Ausführen [die Zugriffsanforderungen](/docs/passphrase-utility).

## Beispiele

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Erwartete Ergebnisse

Das Beispiel verwendet die dokumentierte Schnittstelle von Passphrasen-Dienstprogramm. Prüfen Sie vor erneuten Schreibvorgängen die unter [Technik](/docs/passphrase-utility/technical) beschriebene Antwort oder den gespeicherten Zustand.

## Fehlerbehebung

Falls Passphrasen-Dienstprogramm nicht verfügbar ist, prüfen Sie Ihre Anmeldung und lassen Sie den Administrator die Komponente und ihre Abhängigkeiten kontrollieren.
