# Maße des Composer-Rasters

**Feature-Zweig:** feature-composer-grid-dimensions

## Einheitliche volle Breite

Array-Angaben für die volle Breite nutzen nun alle verfügbaren Spalten in Haupt- und verschachtelten Composern, einschließlich der Anmelde- und Registrierungsformulare. Numerische Höhenbegrenzungen und das Ausfüllen der Höhe bleiben unabhängig.

## Unter das Raster ziehen

Beim Ziehen eines Widgets unter das aktuelle Raster werden Inhalt, Rasterüberlagerung und schattiertes Ablageziel gemeinsam erweitert. Der neue Bereich bleibt bis zum Ablegen verfügbar.

## Genaue Vorschau und Platz für Bedienelemente

Ziehvorschauen und Größenänderungsgriffe verwenden dieselben Abmessungen mit berücksichtigten Abständen wie die gerenderten Karten, auch bei halben Rastereinheiten. Die Messung berücksichtigt Inhaltsabstände und Bildlaufleisten. Das Elementfenster nutzt die verfügbare Breite, damit seine Aktionsbeschriftungen auf Desktop, Tablet und Mobilgerät lesbar bleiben. Die Panelposition verwendet die nach der Höhenbegrenzung gemessene Breite einschließlich interner Bildlaufleisten.

## Stabile Touch-Bearbeitung

Widgets behalten den angefassten Punkt bei, statt unter den Zeiger zu springen. Haupt- und verschachtelte Editoren unterstützen Scrollen am Rand, Zeigerabbruch und ausreichend große Größenregler für Touchscreens. Das Elementfenster passt sich seinem Inhalt an und lässt sich auf die Kopfzeile minimieren. Beim Speichern bleibt der Editor bis zum erfolgreichen Abschluss aktiv, auch bei geänderter Ansichtsgröße.

## Passende Größenregler

Das Entfernen von Elementen verwendet jetzt die gemeinsame Darstellung der Abbrechen-Schaltflächen. Größenregler prüfen Größenlimits, Rastergrenzen und benachbarte Elemente. Ist Vergrößern blockiert, bleiben sie zum zulässigen Verkleinern verfügbar. Richtungszeiger zeigen die möglichen Bewegungen; Vergrößerungsversuche in belegte Felder erhalten einen Sperrzeiger.

## Alle Kanten und Speicherbestätigung

Widgets lassen sich in Haupt- und verschachtelten Editoren an allen acht Kanten und Ecken skalieren. Links und oben bleibt die gegenüberliegende Kante fest; Größen- und Kollisionsgrenzen gelten weiter, und Touch-Vorschauen bleiben am Griffpunkt. Fertig, das Layout-Kürzel und Zurücksetzen melden Erfolg oder Fehler über einen gemeinsamen Speicherablauf. Fehlgeschlagene Schreibvorgänge erhalten ausstehende Änderungen; gleichzeitige Speicheraufrufe teilen eine Anfrage, und Seitenabbruch verhindert spätere Meldungen. Fehler beim Speichern werden knapp und lokalisiert gemeldet.

## Verträge der Editor-Helfer

Wiederverwendbare Editormodule dokumentieren öffentliche Exporte, Aufrufbeispiele, Ein- und Ausgabeverträge sowie Bereinigungsaufgaben. Die technische Referenz beschreibt Speicherergebnisse, Editorzustand und die tatsächliche spaltenbezogene Speicherstruktur in allen vier unterstützten Sprachen.

## Lesbare Arbeitsbereichsvorgaben

Die Dashboard-Marke bietet Platz für Symbol und vollständigen Titel; Begrüßung und Anmeldung behalten lesbare Breiten, Kontodaten eine kompakte Standardhöhe. Muss eine gespeicherte Zeile neu angeordnet werden, berücksichtigt Composer aktuelle Mindest- und Höchstbreiten, ohne gespeicherte Profile zu überschreiben. Normalisierte Platzierungen werden vor der Darstellung geprüft, damit eine verbreiterte gespeicherte Karte am rechten Rand innerhalb des deklarierten Rasters neu angeordnet wird.

## Commits

- [42d72de](https://github.com/Cognis-Labs-HQ/Cognis/commit/42d72de61ab7765abe866b3fd3a0214bcfb2b006)
- [e025238](https://github.com/Cognis-Labs-HQ/Cognis/commit/e025238e3c4bab7a938cd2b6de30728c6495e30b)
- [6756c5f](https://github.com/Cognis-Labs-HQ/Cognis/commit/6756c5fadd4cd220aa045a063cb9c5fd0237269a)
- [cb2952d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cb2952d3be976a2bdb224022153b5f34aec0c434)
- [fcc204f](https://github.com/Cognis-Labs-HQ/Cognis/commit/fcc204fe09b8fa86814d5f24b5d3839dfbc51c2b)
- [286d397](https://github.com/Cognis-Labs-HQ/Cognis/commit/286d397650ef4e285375d95201a7eee6c70b6528)
- [f038150](https://github.com/Cognis-Labs-HQ/Cognis/commit/f03815014aee59973f68dc3f040c2bf248309f9e)
- [fc698c8](https://github.com/Cognis-Labs-HQ/Cognis/commit/fc698c84645f30eabbc25306ecf3eccbbb3b8828)
- [ba219ba](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba219ba88b792c7535934b4dd5e78e93ba601777)
