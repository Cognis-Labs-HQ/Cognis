# Benutzerbezogene Nachverfolgung neuer Bibliotheksinhalte

**Feature-Zweig:** work

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

## Commits

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
