# Ausspracheaufnahmen

Bootstrap verlangt `study:audio:provider` und registriert neben Wörterbuch- und Strichanbietern einen entfernbaren Audioanbieter. Dieser löst mitgelieferte Aufnahmen nach gesprochener Bezeichnung und bevorzugter Lesung auf, mit begrenzten Dateizugriffen und ausdrücklichen Fehlern bei fehlendem Audio. Beim Entfernen werden laufende Abrufe abgebrochen. Cognis prüft den Kartenzugriff, leitet gewählte Transformationstexte aus dem Schema ab und speichert Aufnahmen privat über Files, ohne verfasste Felder zu ändern. Der Ablauf `study:library:audio` führt Autorisierung, Validierung und Auflösung aus; `study:audio:fetch` prüft und liest die Bytes des Anbieters. Sätze behalten die geordnete Wiedergabe ihrer Bestandteile.

## Vertrag des Audioanbieters

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Beide Study-Module verwenden denselben entfernbaren Audioanbieter-Vertrag und rufen mitgelieferte Aufnahmen durch begrenzte lokale Dateizugriffe ab. Autorisierung, Cache-Richtlinien und zusammengesetzte Wiedergabe gehören dem Host.

Vorgesäte gesprochene Karten enthalten erzeugte MP3-Dateien unter `data/library/assets/audio/`; identischer Sprechtext verwendet dieselbe Datei. Englisch verwendet offline Piper mit einer Stimme auf Basis des gemeinfreien LJ-Speech-Datensatzes. Japanisch verwendet offline Open JTalk mit HTS Voice Mei, mit Namensnennung des MMDAgent-Projektteams und des Nagoya Institute of Technology unter CC BY. Stimmhinweise und ein Aufnahmeverzeichnis liegen unter `data/audio/`. Satzzeichen bleiben stumm; Sätze erhalten keine synthetisierte Aufnahme, sondern werden von Cognis aus den geordneten Bestandteilsaufnahmen abgespielt.

Audio wird erst abgerufen, wenn Lernende die Wiedergabe anfordern; das bloße Öffnen einer Karte löst keine Audioanfrage aus. Wiedergabefehler verwenden den lokalisierten Toast des Hosts und strukturierte Protokolle. Satzbestandteile behalten ihre gewählten Transformationsdeskriptoren; der authentifizierte Audioendpunkt leitet die gesprochene Form aus dem Schema ab, statt beliebigen Anzeigetext anzunehmen. Englische Buchstabenkombinationen werden aus ihren verfassten IPA-Phonemen synthetisiert, während Alphabetaufnahmen Buchstabennamen sprechen.
