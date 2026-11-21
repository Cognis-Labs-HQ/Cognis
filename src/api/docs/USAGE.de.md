# Anwendung

Praktische Abläufe für Anwendungsserver.

## Voraussetzungen

Betreiber stellen den Server bereit; veröffentlichte Dokumente benötigen keine Administratorrechte.

## Beispiele

Wähle Info, Nutzung oder Technik und eine Version; prüfe beim Ansichtswechsel die erhaltene Version.

Rufen Sie `store.diff(fromVersion, toVersion)` über einen Speicher auf, der mit der Fähigkeit `docs:versionStore` erstellt wurde. Laufzeitmodule können das strukturierte Ergebnis über ihre eigene authentifizierte Route zurückgeben, `ui:documentDiff` über den Browser-ctx auflösen und das Ergebnis an `renderDocumentDiff(diff)` übergeben.

Ändern Sie die verpflichtende Einrichtung über den authentifizierten Endpunkt für Systemsicherheit oder TFA-Erzwingung. Eine fehlgeschlagene Richtlinienanwendung meldet einen Fehler statt einer erfolgreichen Speicherung.

`await ctx.getCapability("share:getGuestClaims")(request)`

GET /api/v1/docs liefert optional groupPresentation neben den bisherigen Feldern group, slug, title, path und versions. Die Gruppe bleibt die unveränderliche Modul-UUID; Beschriftungen ersetzen weder Identität noch Routen.

Senden Sie `DELETE /api/v1/users/:username` mit den üblichen Zugangsdaten für eine berechtigte Anfrage. Die normale Antwort bleibt HTTP 200 mit `{"data":{"deleted":true}}`.

Wenn die Löschung bestätigt wurde, aber ein nachfolgender Flow-Hook fehlschlägt, lautet die Antwort HTTP 500 mit `{"error":{"code":"user_deletion_cleanup_incomplete"},"data":{"deleted":true,"outcome":"committed","cleanup":"incomplete"}}`. Wiederholen Sie die Löschung nicht, um die Bereinigung zu reparieren. Prüfen Sie den protokollierten Serverfehler und das Wiederherstellungsverfahren der betroffenen Komponente.

## Erwartete Ergebnisse

Jede veröffentlichte Version enthält ein vollständiges übersetztes Paket; fehlende Ansichten werden nicht aus fremden Versionen ergänzt.

## Fehlerbehebung

Prüfe Thema, Version und Serverzugriff. Das Archiv benötigt einen beschreibbaren Speicherort.
