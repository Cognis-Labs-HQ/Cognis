# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Passphrasen-Dienstprogramm.

## Schnittstellen

reuse:generatePassphrase ist eine synchrone ctx-Fähigkeit mit String-Ergebnis. Ungültige Anzahl oder Länge löst RangeError aus, Typ oder Schreibweise TypeError.

## Konfiguration

words muss eine sichere Ganzzahl von 1 bis 128 sein. separator ist standardmäßig ein Bindestrich mit höchstens sechzehn Zeichen. capitalization erlaubt lowercase, uppercase oder titlecase.

## Verhalten

### Passphrasen-Dienstprogramm

Die API-Laufzeit stellt `reuse:generatePassphrase` über `ctx` bereit, damit Module wie Jitsi Meet lesbare Geheimnisse erzeugen können, ohne API-Interna zu importieren.

## Sicherheit

Jedes Wort wird mit Node crypto.randomInt gewählt. Erzeugung speichert oder autorisiert kein Geheimnis; Aufrufer müssen es schützen und dürfen es nicht protokollieren.

## Referenz

### Technische Spezifikation

Die Capability akzeptiert eine positive Wortanzahl in `words` sowie optionale Einstellungen für `separator` und `capitalization`. Für die Großschreibung stehen `lowercase`, `uppercase` und `titlecase` zur Verfügung; standardmäßig werden kleingeschriebene Wörter mit Bindestrichen getrennt.

Der Generator wählt jedes Wort mit der kryptografischen Zufallsquelle von Node.js aus. Aufrufer sollten genügend Wörter für ihre Sicherheitsanforderungen anfordern und dürfen erzeugte Passphrasen nicht protokollieren.
