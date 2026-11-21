# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Passphrasen-Dienstprogramm.

## Schnittstellen

Dieses Thema ist eine Referenz und stellt keinen eigenen Endpunkt bereit. Beispiele verwenden die öffentlichen Schnittstellen der unten beschriebenen Komponenten.

## Konfiguration

Dieses Dokumentationsthema hat keine eigene Laufzeitkonfiguration. Betriebseinstellungen gehören zur zuständigen Komponente.

## Verhalten

### Passphrasen-Dienstprogramm

Die API-Laufzeit stellt `reuse:generatePassphrase` über `ctx` bereit, damit Module wie Jitsi Meet lesbare Geheimnisse erzeugen können, ohne API-Interna zu importieren.

### Anwendungsbeispiele

Die Capability wird aus dem Modul-Bootstrap-Kontext abgerufen und mit der gewünschten Wortanzahl und Darstellung aufgerufen:

```js
const generatePassphrase = ctx.capabilities.require("reuse:generatePassphrase");
const passphrase = generatePassphrase({
    words: 6,
    separator: "-",
    capitalization: "titlecase",
});
```

## Sicherheit

Das Lesen der Dokumentation berechtigt nicht zur Ausführung ihrer Beispiele. Die zuständige Komponente autorisiert jeden Vorgang.

## Referenz

### Technische Spezifikation

Die Capability akzeptiert eine positive Wortanzahl in `words` sowie optionale Einstellungen für `separator` und `capitalization`. Für die Großschreibung stehen `lowercase`, `uppercase` und `titlecase` zur Verfügung; standardmäßig werden kleingeschriebene Wörter mit Bindestrichen getrennt.

Der Generator wählt jedes Wort mit der kryptografischen Zufallsquelle von Node.js aus. Aufrufer sollten genügend Wörter für ihre Sicherheitsanforderungen anfordern und dürfen erzeugte Passphrasen nicht protokollieren.
