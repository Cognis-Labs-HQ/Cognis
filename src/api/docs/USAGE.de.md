# Anwendung

Praktische Abläufe für Anwendungsserver.

## Voraussetzungen

Betreiber stellen den Server bereit; veröffentlichte Dokumente benötigen keine Administratorrechte.

## Beispiele

Wähle Info, Nutzung oder Technik und eine Version; prüfe beim Ansichtswechsel die erhaltene Version.

Rufen Sie `store.diff(fromVersion, toVersion)` über einen Speicher auf, der mit der Fähigkeit `docs:versionStore` erstellt wurde. Laufzeitmodule können das strukturierte Ergebnis über ihre eigene authentifizierte Route zurückgeben, `ui:documentDiff` über den Browser-ctx auflösen und das Ergebnis an `renderDocumentDiff(diff)` übergeben.

Ändern Sie die verpflichtende Einrichtung über den authentifizierten Endpunkt für Systemsicherheit oder TFA-Erzwingung. Eine fehlgeschlagene Richtlinienanwendung meldet einen Fehler statt einer erfolgreichen Speicherung.

`await ctx.getCapability("share:getGuestClaims")(request)`

## Erwartete Ergebnisse

Jede veröffentlichte Version enthält ein vollständiges übersetztes Paket; fehlende Ansichten werden nicht aus fremden Versionen ergänzt.

## Fehlerbehebung

Prüfe Thema, Version und Serverzugriff. Das Archiv benötigt einen beschreibbaren Speicherort.
