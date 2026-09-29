# Stabile Unterkarten-Navigation

**Feature-Zweig:** work

## Stabile Unterkartenpositionen

Unterkarten behalten ihre eingepassten Positionen, während tiefere Zweige geöffnet werden. Neue Nachfahren werden nach Tiefe mit Kollisionsabstand in sichtbaren freien Plätzen angeordnet, sodass Karten und Verbindungen weder springen noch überlappen.

## Zuverlässige Zeigernavigation

Diagonale Wege verfügen nun über einen größeren, durchgängigen Trefferkorridor, Zweigwechsel verwenden eine kurze Verzögerung zur Erkennung der Zeigerabsicht, und aktive Karten pulsieren nicht mehr. Die Reihenfolge der Ausweichrichtungen hält anfängliche Unterkartenanordnungen außerdem kompakt um ihre bevorzugte Achse.

## Einheitliche Kompositionskarussells

Eingabe und Aussprache verwenden jetzt dieselbe wiederverwendbare Token-Eingabe und Karusselldarstellung. Eingabekarussells stehen direkt unter ihrem Feld, ausgewählte Token teilen sich die kompakte Entfernen-Schaltfläche, und Steuerelemente zum Erstellen von Abhängigkeiten erscheinen nur für Ebenen, die Benutzer normalerweise erstellen dürfen.

## Sofortige Abhängigkeitskomposition

Karten, die über die Hinzufügen-Steuerung eines Karussells erstellt werden, durchlaufen nun denselben Auswahlpfad wie bestehende Karten und werden sofort der aktiven Kompositionsfläche hinzugefügt. Aussprachefelder für alternative Zeichen enthalten nun auch dann ihr Karussell für atomare Zeichen, wenn die Anbieterbeziehung eine allgemeinere Darstellungsrolle verwendet.

## Strichsuche und geführte Validierung

Composer mit Strichunterstützung platzieren feldbezogene Nachschlageaktionen nun unter einer eigenen Überschrift für Strichmuster und zeichnen geladene Daten in einer kompakten Vorschau. Die Validierung erforderlicher Beziehungen kennzeichnet betroffene Reiter, öffnet den Reiter mit dem ersten ungültigen Feld und fokussiert das Feld oder die Definitionsaktion, die Aufmerksamkeit benötigt.

## Ausgerichtete Popup-Titeldetails

Popup-Definitionen tragen keinen vorangestellten Gedankenstrich mehr. Aussprache- und Definitionsgruppen teilen nun die primäre Titelzeile und sind vertikal am Kartentitel zentriert.

## Präzise Composer-Pflichten

Definitionspflichten kennzeichnen nun den Reiter Definitionen und die Hinzufügen-Aktion, während ungültige Aussprachefelder sich direkt ausweisen. Reiter behalten ihre normale Farbe und zeigen nur ein rotes Sternchen. Alternative Zeichen dürfen Definitionen auslassen und laden nun alle Aussprachebeziehungen außerhalb von Definitionen. Anbieter für Strich- und Wörterbuchsuche deklarieren neutrale Fähigkeiten für korrekte Platzierung und schichtweise Wörterbuch-Abwahl. Schlagwörter stehen nun zuletzt in Inhaltsformularen.

## Wiederverwendbare Tab-Validierung

Die mehrteilige Library-Validierung verwendet nun den Tab-Validierungscontroller des gemeinsamen Formular-Composers statt einer adapterspezifischen Implementierung. Der wiederverwendbare Controller verwaltet Tab-Aktivierung, Ungültigkeitsmarkierungen und den Fokus auf das erste ungültige Feld; Library liefert nur das definitionsspezifische Fokusziel und die Stilklasse.

## Korrigierte Zuordnung im Altzeichen-Composer

Composer für alternative Zeichen behalten jetzt die vom Anbieter deklarierten Zeichenkarussells für die Aussprache und greifen nur ersatzweise auf atomare Zeichenbeziehungen zurück, sodass unter Aussprache keine Wortschatzkarten mehr erscheinen. Anbieter von Strichmustern werden anhand neutraler Vertragsmetadaten oder der lokalisierten Feldbezeichnung zugeordnet; ihre Aktion wird daher aus der allgemeinen Nachschlagezeile entfernt und als „Nachschlagen“ im Abschnitt Strichmuster angezeigt.

## Commits

- [ccbab39b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ccbab39b)
- [db0728af](https://github.com/Cognis-Labs-HQ/Cognis/commit/db0728af)
- [9c77e48f](https://github.com/Cognis-Labs-HQ/Cognis/commit/9c77e48f)
- [41d895c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/41d895c6)
- [e5f1dd4b](https://github.com/Cognis-Labs-HQ/Cognis/commit/e5f1dd4b)
- [ed27aee1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ed27aee1)
- [ac06311e](https://github.com/Cognis-Labs-HQ/Cognis/commit/ac06311e)
- [517d09f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/517d09f0)
- [38faf70c](https://github.com/Cognis-Labs-HQ/Cognis/commit/38faf70c)
