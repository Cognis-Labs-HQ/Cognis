# Lernfortschritt

Der Fortschrittsadapter zeichnet unveränderliche, idempotente Lernereignisse auf und erstellt daraus wiederherstellbare Projektionen. Jedes Ereignis enthält Akteur, kanonischen Inhalt samt Revision, Aktivität und Geltungsbereich, Versuchsergebnis, Hinweise, Dauer, Abschlussstatus und begrenzte Metadaten.

## Datenschutz und Berechtigung

Der Dienst prüft die Eigentümerschaft des Akteurs vor jedem Lesen und Schreiben. Administratoren und Eigentümer dürfen andere Akteure einsehen; Klassenraumvorgänge erfordern zusätzlich die Zugriffsberechtigung des Klassenadapters. Breite Abfragen lassen Klassenraumereignisse aus, wenn der aktuelle Zugriff widerrufen wurde.

## Fähigkeit und Ablauf

`study:progress` bietet Aufzeichnung, ausgleichende Korrekturen, Abfragen, Aggregation und Neuaufbau. `study:progress:recordEvent` stellt die Stufen `authorize`, `validate`, `observe`, `persist` und `project` bereit.

## HTTP-API

Authentifizierte Clients verwenden `/api/v1/study/progress/events`, `/projections` und `/aggregate`; Administratoren können `/rebuild` ausführen. Filter umfassen Akteur, Schema, Ebene, Sprache, Aktivität, Interessenader, Klassenraum, Ereignis und Zeitraum. Korrekturen werden angehängt und verändern niemals den Verlauf.

Authentifizierte Clients senden Korrekturen an `/api/v1/study/progress/events/corrections`; sie werden angehängt und verändern niemals den Verlauf. Die Kompensation wird vor Dimensions- oder Zeitraumfiltern anhand des vollständigen berechtigten Verlaufs aufgelöst. Ereignisse und Projektionen werden über das DB-Gateway dauerhaft gespeichert und bleiben bei Neustarts erhalten.

Der gewöhnliche Ereignis-Endpunkt lehnt `compensatesEventId` ab; Clients müssen den Korrektur-Endpunkt verwenden, damit Zielautorisierung und Bereichsprüfung immer ausgeführt werden. Der persistente Speicher erzwingt atomar genau eine Korrektur pro Ziel, auch bei gleichzeitig eintreffenden Korrekturanfragen.
