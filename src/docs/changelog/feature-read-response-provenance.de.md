# Datenherkunft beim Lesen

**Feature-Zweig:** feature-read-response-provenance

## Herkunft auf dem Client

Über den Lesecache verarbeitete Sitzungs-GET-Antworten enthalten `x-cognis-read-source`: `live` für den Aufrufer, der einen Transportabruf startet, `shared` für einen Aufrufer, der sich diesem laufenden Abruf anschließt, und `cached` für gespeicherte oder wiederhergestellte Ergebnisse. Ein späterer neuer Abruf ist auch bei identischen Nutzdaten `live`. Cache-Nutzer können dasselbe Ergebnis erfolgreicher Abrufe über den optionalen Callback `onSource` beobachten, ohne die Rückgabewerte zu ändern.

## Bestehende Grenzen bewahren

Diese Werte beschreiben das Leseergebnis auf dem Client, keine Serverrevision, Aktualitätsgarantie oder Berechtigungsentscheidung. Bestehende Prüfungen von Zuständigkeit, Konto, Sitzung und Zugriff gelten weiterhin. Antwortdaten, Cache-Zeitplanung und das Verhalten bei direkten Abrufen oder Fehlern bleiben bis auf die zusätzliche Kennzeichnung unverändert. Der Abbruch eines Anbieters gibt seine Momentaufnahmen frei und verhindert die Veröffentlichung noch laufender Ergebnisse.

Nicht deklarierte Anfragen, Gast-Zugangsdaten, ausdrückliche Authorization-Header und Abrufe mit `bufferOffline: false` geben die ursprüngliche Response unverändert zurück. Fehlerantworten mit Status null und undurchsichtige Responses werden ebenfalls ohne zusätzliche Kennzeichnung unverändert weitergegeben. Empfänger verwalteter HTTP-Fehler erhalten unabhängig lesbare Datenströme.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/2413fc3523639f7c61d260ef13668decc09703b5
