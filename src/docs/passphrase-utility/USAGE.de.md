# Anwendung

Praktische Abläufe für Passphrasen-Dienstprogramm.

## Voraussetzungen

Eine Funktion muss Erzeugung anbieten; das Werkzeug hat keine eigene Benutzerseite.

## Beispiele

Erzeuge eine Passphrase, speichere sie geschützt und teile sie nur mit vorgesehenen Teilnehmern.

```ts
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Erwartete Ergebnisse

Unabhängig gewählte Wörter werden kombiniert; Erzeugung speichert, versendet oder autorisiert das Geheimnis nicht.

## Fehlerbehebung

Ein erzeugter Wert ist nicht automatisch gespeichert. Integratoren prüfen vor Wortanzahl und Trennzeichen den Vertrag.
