# Benutzerbezogene Nachverfolgung neuer Bibliotheksinhalte

**Feature-Zweig:** feature-update-external-package-contract-definitions

## Dauerhafter Cache angesehener Inhalte

Cognis speichert nun die UUIDs angesehener Bibliothekseinträge pro Konto. Das Überfahren einer Karte oder ihr direktes beziehungsweise über eine Beziehung erfolgendes Öffnen markiert sie als angesehen, ohne den Verlauf anderer Benutzer offenzulegen.

## Kennzeichnung und Benachrichtigung neuer Inhalte

Nicht angesehene Einträge zeigen in Vorschau und Detailfenster einmalig **Neu**. Anbieteraktualisierungen und genehmigte globale Beiträge benachrichtigen aktivierte Benutzer über neue Sprachinhalte.

## Bereichsbezogene Beiträge und Prüfabläufe

Benutzer können persönliche Karten erstellen, Lehrkräfte zusätzlich Karten in eigenen Klassen und Administratoren globale Karten. Genehmigte Hochstufungsanfragen verschieben Karten in lehrergeführte Klassen oder die globale Sammlung; berechtigte Herabstufungen bringen sie zum ursprünglichen Einreicher zurück. Anbietergeschützte Karten können weder verschoben noch gelöscht werden.

## Durchsuchbare und konfigurierbare Bibliotheksoberfläche

Sprachanbieter können ebeneneigene Erstellungsfelder über eine ctx-Fähigkeit gestalten. Die globale Duplikaterkennung unterbricht die Erstellung zur Bestätigung, importierte Datensätze erhalten einen dauerhaften Suchindex, die Bibliothekssuche umfasst alle Ebenen, optionale Definitionen erscheinen unter dem Karteninhalt und die Mehrfachauswahl liegt mit wiederhergestellten schwebenden Aktionen an den gewünschten Kartenrändern.

## Sprachdefinierte Erstellung ist vollständig

Sprachpakete können nun für jede erstellbare Ebene einen geprüften `cardConstructor` angeben oder ihn über die öffentliche ctx-Fähigkeit `study:library:provider` registrieren. Cognis kombiniert Anbieterfelder mit rollenabhängigen Sichtbarkeits- und Klassenfeldern, zeigt die Klassenauswahl nur bei Bedarf und stellt Prüfungsanfragen berechtigten Lehrkräften sowie Administratoren bereit.

## Begrenzter Kartenstatus und kontextbezogene Veröffentlichung

Bereichs-, Neu- und Auswahlindikatoren am Kartenrand bleiben nun innerhalb der horizontalen Kartengrenzen; bei wenig Platz erhält der Hauptwert den größten Anteil der Vorschau. Die Mehrfachauswahl bietet jetzt ein schwebendes Menü „Veröffentlichen in“, eine echte lokalisierte Löschbeschriftung, das Zurückziehen ausstehender Anträge und berechtigte Rücksendungen ohne überflüssige Schließen-Schaltfläche.

## Prägnante Links und intelligentere Suche

Steuerelemente für verwandte Einträge zeigen nun ausschließlich den Hauptwert jeder Karte. Untergeordnete Karten besitzen deutlichere Oberflächen, eine stärkere Hintergrundtrennung und unabhängig per Maus aktivierbare Neu-Markierungen. Detailansichten schlagen anhand von Schriftzeichen, Wortschatzmetadaten und gemeinsamen Beziehungen ähnliche Einträge derselben Ebene vor. Sprachanbieter können außerdem zusätzliche Metadatenfelder als Filter für Lernende freigeben.

## Verbindlicher Vertrag für externe Pakete

Die Study Library validiert und bewahrt nun lokalisierte und anbieterspezifische Metadaten, erweiterbare deklarativ validierte Feldtypen, Asset-Listen, Paketbesitz und -schutz, semantische Darstellung, Definitionslokalisierung, Interessen und Aktivitätskompatibilität. Ein synthetisches Paket-Fixture bildet die Struktur eines Produktionsanbieters nach; die öffentliche Anbieterfähigkeit kann ein echtes Paket ohne Installation prüfen.

## Korrekturen für Bibliotheksansicht und Anbieter-Lebenszyklus

Suche und Bearbeitung der Bibliothek sind nun kompakt und designsicher gestaltet. Die Auswahl per Rechtsklick wird zuverlässig erfasst, verschachtelte Karten behalten ihre Hover-Flächen und Nicht-Zeichenkarten zeigen vollständige Lesungen und Definitionen ohne unnötige Kürzung. Inhaltsanbieter steuern die Sprachverfügbarkeit verbindlich. Inhaltsdatensätze unterstützen Namensraumklassen, Medienlisten bleiben beim Import erhalten, benutzerdefinierte Editoren folgen Validierungsverträgen, eingebaute Einschränkungen werden durchgesetzt und Installationsbelege bewahren Anbietermetadaten.

## Stabile Bibliothekssteuerung und ausgewogene Satzkarten

Satzkarten verwenden nun eine einheitliche begrenzte Höhe, lassen redundante Aussprachevorschauen weg und begrenzen Haupttext sowie Definitionen auf zwei Zeilen. Die Suche bietet genau eine kontrollierte Löschaktion, Bearbeitungssymbole nutzen ausdrückliche Design-Assets, Löschdialoge haben lokalisierte Beschriftungen und Wortschatzdetails zeigen Kana-Lesungen. Die Rechtsklickauswahl wird auf jeder eingebundenen Study-Seite an der Dokumentgrenze erfasst; maßgebliche Anbieteraktualisierungen entfernen Einträge, die im neuesten Paket fehlen, sofern ein Teilpaket dies nicht ausdrücklich deaktiviert.

## Eigene Navigation für Veröffentlichungsanfragen

Veröffentlichungsprüfungen befinden sich nun auf einer eigenen Anfragen-Seite der Study-Unternavigation, statt Platz in der Bibliothekswerkzeugleiste zu belegen. Prüfbare ausstehende Anfragen markieren den Link mit einer rot atmenden Kontur samt Alternative für reduzierte Bewegung; nach der letzten Prüfung verschwindet das Signal. Das Symbol zum Löschen der Bibliothekssuche passt sich nun an helle und dunkle Designs an.

## Sprachbezogene Verwaltung und geführte Kartenbearbeitung

Die Bibliotheksverwaltung zeigt nun ein flaches Ebenenmenü für die ausgewählte Sprache. Kartenklassen sind sichtbar und sicher bearbeitbar; Definitionen und Kompositionen erhalten erzwungene Klassen, Definitionen bleiben für Lernende verborgen, und Partikel sowie anbietergesperrte Datensätze sind nicht bearbeitbar. Bearbeitungsdialoge unterscheiden klar Ansicht und Bearbeitung, bieten Speichern und schützen ungespeicherte Änderungen. Die Kartenerstellung befindet sich als geführte `+`-Seitenaktion auf Lernendenseiten, Antragstellende sehen ihren Status, Popup-Titellesungen behalten Anbieterlinks, und verfügbare Study-Sprachen werden bei jedem Seitenaufruf neu geladen.

## Zuverlässige Aktionen für Lernkarten

Lernkarten behalten nun unabhängig von Löschrechten ein Auswahlsteuerelement, sodass ein Rechtsklick zuverlässig die Mehrfachauswahl öffnet, ohne das Browsermenü anzuzeigen. Erstellungsaktionen erkennen nun von Anbietern beigesteuerte Kartenkonstruktoren und registrieren die +-Schaltfläche über die CTX-Fähigkeit für Seitenaktionen.

## Lokalisierte Anfragen-Navigation beim ersten Laden

Der Navigationseintrag „Anfragen“ erhält nun lokalisierte Ersatzbeschriftungen von seiner eigenen Library-Route. Dadurch wird nach einem frischen Server- oder Browserstart nicht mehr der interne Pfad `/study/library/requests` angezeigt, während Übersetzungen geladen werden.

## Beziehungsrollen geordneter Sequenzen

Die Inhaltspaketvalidierung rekonstruiert Beschriftungen geordneter Sequenzen jetzt ausschließlich aus Kompositionsbeziehungen. Aussprache- und alternative Schreibbeziehungen können auf lexikalische Datensätze verweisen und ihre eigene Positionsfolge verwenden, ohne `ordered_sequence_content_unresolved` auszulösen; dies entspricht dem Vertrag des Japanisch-Lernanbieters.

## Klare Inhaltsklassen und Rückverknüpfungen

Detailansichten blenden nun die strukturelle Composite-Klasse aus, wandeln Anbieter-Klassensuffixe in lesbare Pills um und verwenden für zusammengesetzte Überschriften zwei Spalten mit Lesungen unter dem Primärtext. Umgekehrte Vokabellinks mit identischer Beschriftung werden unterdrückt, ohne die vorwärts gerichtete Schreibbeziehung zu entfernen.

## Fokussierte untergeordnete Kartenzweige

Beim Öffnen eines untergeordneten Kartenzweigs werden die Sichtbarkeitssymbole nicht zugehöriger Karten unscharf und Hover-Anhebung sowie Hervorhebung anderer Elternkarten neutralisiert. Der aktive Zweig bleibt scharf und interaktiv.

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
- [617a2161](https://github.com/Cognis-Labs-HQ/Cognis/commit/617a2161)
- [365d5444](https://github.com/Cognis-Labs-HQ/Cognis/commit/365d5444)
- [11bec51d](https://github.com/Cognis-Labs-HQ/Cognis/commit/11bec51d)
- [b996336d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b996336d)
- [8d4c4129](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d4c4129)
- [d16a50d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d16a50d5)
- [ea24056d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea24056d)
- [bcb4e781](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcb4e781)
- [87f30e20](https://github.com/Cognis-Labs-HQ/Cognis/commit/87f30e20)
