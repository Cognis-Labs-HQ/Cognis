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

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
