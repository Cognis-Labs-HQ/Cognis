# Verbesserte Lernmedien

**Feature-Zweig:** study-followups

## Größe der Bildanzeige

Der gemeinsame Bildvorschau-Anbieter lädt sein Stylesheet, bevor er Steuerelemente veröffentlicht. Das reine Bild-Popup entfernt Überschriften und passt Originale im Quer-, Hoch- und Panoramaformat ohne horizontales oder vertikales Scrollen in den sichtbaren Bereich ein. Library-Detailvorschauen behalten ihre Grenzen von 20rem × 18rem; Editor-Vorschaubilder bleiben 8rem × 6rem groß.

## Studienmedien

Referenzbilder in Kartendetails bilden einen horizontalen Streifen mit ausgeblendeter Bildlaufleiste. Die Audiowiedergabe übermittelt Kartentitel, Ebene, Cognis als Interpret und das App-Symbol an die System-Mediensteuerung, einschließlich Wiedergabe, Pause, Stopp und Lebenszyklusbereinigung. Mitgelieferte Satzdateien haben Vorrang vor der erzeugten Zusammenstellung. Die Begleitmodule enthalten 34 japanische und 45 englische direkte Satzaufnahmen; 124 japanische Kana-Clips wurden mit japanischem Text und der ausdrücklich festgelegten Stimme neu erzeugt.

## Audio neu erzeugen

Beim erneuten Erzeugen der Aufnahme einer globalen Karte werden nur das Audiofeld und der Suchindex aktualisiert. Erforderliche Identität, Schema, Klassifikation, Eigentümer, eigene Medien und gruppierte Verknüpfungen bleiben erhalten. Eine optimistische Zeitstempelprüfung weist gleichzeitige Änderungen zurück, statt sie zu überschreiben. Bei späterer Wiedergabe wird die neu erzeugte Aufnahme aus dem Cache verwendet.

## Aussprache entfernen

Gespeicherte Aussprachefelder ordnen ihre Entfernen-Schaltfläche mit eigenem Abstand neben den Lesekomponenten an, auch bei Schreibrichtung von rechts nach links. Das X verdeckt weder kurze noch lange Lesungen.

## Navigation im Schreibfenster

Das Öffnen des Schreibfensters aus den Kartendetails schließt die Detailansicht nach erfolgreichem Öffnen. Der verdeckte Titel wird weiterhin beim ersten Klick sichtbar. Auf Explore öffnet ein weiterer Klick die Karte direkt; auf anderen Study-Seiten bleibt die Bestätigung vor dem Wechsel zu Explore erhalten.

## Sichtbarer Lernmodus und themengerechte Bedienelemente

Die dauerhafte Auswahl für Lesen und Schreiben blendet ihren schwebenden Bereich auf der Lernkartenseite ein. Änderungen behalten die gespeicherte Einstellung und die Bestätigung zum Sitzungsneustart bei. Export- und Study-Einstellungssymbole folgen der aktuellen Bedienfarbe sowie dem hellen oder dunklen App-Design und Hover-Zustand, unabhängig vom Betriebssystem.

## Isolation deaktivierter Lernsprachen

Study Library prüft die aktive Sprachfunktion, bevor gespeicherte Schemata, Karten, Audio, Bilder, Paketdateien oder Prüfanfragen zugänglich sind. Deaktivierte Sprachen verschwinden aus Listen und direkte Abrufe schlagen fehl. Erneutes Aktivieren stellt den Zugriff ohne Löschen der Inhalte wieder her. Laufzeitregistrierungen und Inhaltsspeicherung bleiben getrennt.

## Aktive Sprachregistrierung verwenden

Die Bibliotheksverfügbarkeit liest Sprachbeiträge aus der aktuellen Systemregistrierung statt aus dem lokalen Funktionsspeicher des Adapters. Das Deaktivieren einer Sprache lässt Schemata, Karten und Startdeck-Abhängigkeiten der anderen Sprache zugänglich; erneutes Aktivieren stellt gespeicherte Inhalte wieder bereit. Die öffentliche Registrierung hat Vorrang vor veralteten lokalen Kopien.

## Commits

- [d5377cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/d5377cd20e1e0714e86966f1e9e1d4a584d7951f)
- [68f4cad](https://github.com/Cognis-Labs-HQ/Cognis/commit/68f4cad583d4ff3b9f0b14c9d083d04324f3cdf1)
- [316acf3](https://github.com/Cognis-Labs-HQ/Cognis/commit/316acf324b61e0346a93e15f4c69f5421052a238)
- [d53cbaf](https://github.com/Cognis-Labs-HQ/Cognis/commit/d53cbaf39759a0cc6bbf64a3f17fdcbd549398e7)
- [76d4cce](https://github.com/Cognis-Labs-HQ/Cognis/commit/76d4cce408ec01e05998d3a006900678f7068d8e)
- [ebf8d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/ebf8d696cba04da9959435855f51aa12cb43f7c0)
- [7808a8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/7808a8ab8206210563535fd5bfd7580e2ba484fc)
- [3fbcc05](https://github.com/Cognis-Labs-HQ/Cognis/commit/3fbcc05d9bb0cc0d4fce6644598a7bb299e045e0)
