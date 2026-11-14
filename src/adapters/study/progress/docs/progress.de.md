# Lernfortschritt

Gemeinsame Typen für Fortschrittsereignisse, Akteure, Projektionen und Fähigkeiten liegen in gateways/study/reuse/progress.ts. Das Gateway importiert dafür keinen optionalen Adapter-Einstiegspunkt mehr; der Adapter implementiert dieselbe Fähigkeit und behält seine öffentlichen Exporte. JSON für Ereignisse und Korrekturen ist auf 60.000 Bytes begrenzt; größere Anfragen liefern vor der Aufzeichnung 413. Datenschutz, Klassenprüfungen, Korrekturen, Belohnungen und Neuaufbau bleiben aktiv.

Der Fortschrittsadapter zeichnet unveränderliche, idempotente Lernereignisse auf und erstellt daraus wiederherstellbare Projektionen. Jedes Ereignis enthält Akteur, kanonischen Inhalt samt Revision, Aktivität und Geltungsbereich, Versuchsergebnis, Hinweise, Dauer, Abschlussstatus und begrenzte Metadaten.

## Verwendung

```ts
const progress = ctx.capabilities.require("study:progress");
const events = await progress.listEvents(actor, {});
```

## Technische Spezifikation

### Datenschutz und Berechtigung

Der Dienst prüft die Eigentümerschaft des Akteurs vor jedem Lesen und Schreiben. Administratoren und Eigentümer dürfen andere Akteure einsehen; Klassenraumvorgänge erfordern zusätzlich die Zugriffsberechtigung des Klassenadapters. Breite Abfragen lassen Klassenraumereignisse aus, wenn der aktuelle Zugriff widerrufen wurde.

### Fähigkeit und Ablauf

`study:progress` bietet Aufzeichnung, ausgleichende Korrekturen, Abfragen, Aggregation und Neuaufbau. `study:progress:recordEvent` stellt die Stufen `authorize`, `validate`, `observe`, `persist` und `project` bereit.

### HTTP-API

Authentifizierte Clients verwenden `/api/v1/study/progress/events`, `/projections` und `/aggregate`; Administratoren können `/rebuild` ausführen. Filter umfassen Akteur, Schema, Ebene, Sprache, Aktivität, Interessenader, Klassenraum, Ereignis und Zeitraum. Korrekturen werden angehängt und verändern niemals den Verlauf.

Authentifizierte Clients senden Korrekturen an `/api/v1/study/progress/events/corrections`; sie werden angehängt und verändern niemals den Verlauf. Die Kompensation wird vor Dimensions- oder Zeitraumfiltern anhand des vollständigen berechtigten Verlaufs aufgelöst. Ereignisse und Projektionen werden über das DB-Gateway dauerhaft gespeichert und bleiben bei Neustarts erhalten.

Der gewöhnliche Ereignis-Endpunkt lehnt `compensatesEventId` ab; Clients müssen den Korrektur-Endpunkt verwenden, damit Zielautorisierung und Bereichsprüfung immer ausgeführt werden. Der persistente Speicher erzwingt atomar genau eine Korrektur pro Ziel, auch bei gleichzeitig eintreffenden Korrekturanfragen.

### Sichere Wiederholungsplanung

Wiederholungsintervalle sind auf vierzehn Tage begrenzt. Ereigniszeitstempel werden nur angenommen, wenn das vollständige Intervall darstellbar bleibt, sodass ein angenommenes Ereignis den späteren Projektionsaufbau nicht durch ein außerhalb des unterstützten Datumsbereichs liegendes Wiederholungsdatum scheitern lassen kann.

Stabile Ereigniskennungen bleiben über Datenbankzugriffe hinweg gültig. Eine identische erneute Übermittlung repariert unterbrochene Projektionen ohne zusätzliche Verlaufseinträge. Kanonische Ereignisse behalten Inhalt, Geltungsbereich, Zeitangaben, Hinweise, Korrektheit, Abschluss und Korrekturverweise.

Eingeschriebene Lernende dürfen mit Leseberechtigung ihre eigenen Klassenergebnisse aufzeichnen; Bearbeitungsrechte sind nicht erforderlich. Für andere Lernende bleibt eine privilegierte Rolle erforderlich. Der Klassenkontext folgt der aktuellen Mitgliedschaft; eine Stapelfreigabe allein gewährt keine Mitgliedschaft.

## Dauerhafte Übungsbelohnungen

Fortschrittsprojektionen verwenden eindeutige JSON-Identitätstupel ohne NUL-Bytes, die PostgreSQL-Textspalten ablehnen. Vertrauenswürdige Zeichen- und Karteikartenergebnisse durchlaufen `study:progress:recordPractice` mit Autorisierung, Validierung, Ereignisspeicherung und Belohnung. Rohe Ereignisimporte vergeben keine XP. Der authentifizierte Aufruf `GET /api/v1/study/progress/engagement` liefert die eigene Belohnungsübersicht. Ein selbstständig korrekt gelöster Versuch kann das lokalisierte Übungsabzeichen vergeben. Korrekturen entwerten betroffene Belohnungen und Ranglistennachweise. Wiederholte Zustellung behält die kanonische Ereignis- und Belohnungsidentität.
