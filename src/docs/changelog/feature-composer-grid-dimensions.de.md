# Maße des Composer-Rasters

**Feature-Zweig:** feature-composer-grid-dimensions

## Einheitliche volle Breite

Array-Angaben für die volle Breite nutzen nun alle verfügbaren Spalten in Haupt- und verschachtelten Composern, einschließlich der Anmelde- und Registrierungsformulare. Numerische Höhenbegrenzungen und das Ausfüllen der Höhe bleiben unabhängig.

## Unter das Raster ziehen

Beim Ziehen eines Widgets unter das aktuelle Raster werden Inhalt, Rasterüberlagerung und schattiertes Ablageziel gemeinsam erweitert. Der neue Bereich bleibt bis zum Ablegen verfügbar.

## Genaue Vorschau und Platz für Bedienelemente

Ziehvorschauen und Größenänderungsgriffe verwenden dieselben Abmessungen mit berücksichtigten Abständen wie die gerenderten Karten, auch bei halben Rastereinheiten. Die Messung berücksichtigt Inhaltsabstände und Bildlaufleisten. Das Elementfenster nutzt die verfügbare Breite, damit seine Aktionsbeschriftungen auf Desktop, Tablet und Mobilgerät lesbar bleiben. Die Panelposition verwendet die nach der Höhenbegrenzung gemessene Breite einschließlich interner Bildlaufleisten. Gelbe Vorschauen zeigen das zulässige Einrastziel oberhalb der Ablageposition. Beim Loslassen wird es sofort im geöffneten Editor übernommen; das Einrasten überspringt keine andere belegte Karte.

## Stabile Touch-Bearbeitung

Widgets behalten den angefassten Punkt bei, statt unter den Zeiger zu springen. Haupt- und verschachtelte Editoren unterstützen Scrollen am Rand, Zeigerabbruch und ausreichend große Größenregler für Touchscreens. Das Elementfenster passt sich seinem Inhalt an und lässt sich auf die Kopfzeile minimieren. Beim Speichern bleibt der Editor bis zum erfolgreichen Abschluss aktiv, auch bei geänderter Ansichtsgröße.

## Passende Größenregler

Das Entfernen von Elementen verwendet jetzt die gemeinsame Darstellung der Abbrechen-Schaltflächen. Größenregler prüfen Größenlimits, Rastergrenzen und benachbarte Elemente. Ist Vergrößern blockiert, bleiben sie zum zulässigen Verkleinern verfügbar. Richtungszeiger zeigen die möglichen Bewegungen; Vergrößerungsversuche in belegte Felder erhalten einen Sperrzeiger. Versuche, Mindest-, Höchst- oder Rasterursprungsgrenzen zu überschreiten, färben die Vorschau orange. Horizontale, vertikale und Eckbewegungen melden Grenzüberschreitungen unabhängig, während die Abmessungen begrenzt bleiben.

## Alle Kanten und Speicherbestätigung

Widgets lassen sich in Haupt- und verschachtelten Editoren an allen acht Kanten und Ecken skalieren. Links und oben bleibt die gegenüberliegende Kante fest; Größen- und Kollisionsgrenzen gelten weiter, und Touch-Vorschauen bleiben am Griffpunkt. Fertig und das Layout-Kürzel melden Erfolg oder Fehler über einen gemeinsamen Speicherablauf. Layout zurücksetzen stellt nur Standardpositionen und Sichtbarkeit im offenen Editor bereit. Fertig speichert sie; Verwerfen stellt die Anordnung vor der Bearbeitung wieder her. Zurücksetzen schreibt keine Einstellungen und verändert den Schnappschuss zum Verwerfen nicht. Fehlgeschlagene Schreibvorgänge erhalten ausstehende Änderungen; gleichzeitige Speicheraufrufe teilen eine Anfrage, und Seitenabbruch verhindert spätere Meldungen. Fehler beim Speichern werden knapp und lokalisiert gemeldet.

## Verträge der Editor-Helfer

Wiederverwendbare Editormodule dokumentieren öffentliche Exporte, Aufrufbeispiele, Ein- und Ausgabeverträge sowie Bereinigungsaufgaben. Die technische Referenz beschreibt Speicherergebnisse, Editorzustand und die tatsächliche spaltenbezogene Speicherstruktur in allen vier unterstützten Sprachen.

## Lesbare Arbeitsbereichsvorgaben

Die Dashboard-Marke bietet Platz für Symbol und vollständigen Titel; Begrüßung und Anmeldung behalten lesbare Breiten, Kontodaten eine kompakte Standardhöhe. Muss eine gespeicherte Zeile neu angeordnet werden, berücksichtigt Composer aktuelle Mindest- und Höchstbreiten, ohne gespeicherte Profile zu überschreiben. Normalisierte Platzierungen werden vor der Darstellung geprüft, damit eine verbreiterte gespeicherte Karte am rechten Rand innerhalb des deklarierten Rasters neu angeordnet wird. Gespeicherte Breiten, Höhen und Abstände bleiben im Haupt- und verschachtelten Raster für das jeweilige Spaltenprofil erhalten. Fertig speichert die sichtbare Geometrie ohne abschließendes Zusammenpacken oder Neuverteilen der Breiten. Stabile Scrollbarbereiche halten die Spaltenauswahl in Bearbeitung und Ansicht konsistent.

## Kollisionsfreier Widget-Tausch

Die Haupt- und die verschachtelte Bearbeitung erhalten beim Tauschen beide Widgetgrößen. Horizontale Tauschvorgänge behalten die äußeren Kanten des Paars und den Abstand dazwischen bei. So können benachbarte Elemente gleicher Höhe bei unterschiedlichen Breiten in beide Richtungen tauschen. Unterschiedliche Höhen sind zulässig, wenn beide vollständigen Zielrechtecke alle anderen sichtbaren Elemente einschließlich vertikaler Nachbarn freihalten. Rechteckprüfungen hängen von der Anzahl der Platzierungen statt von der belegten Rasterfläche ab. Beide Ziele werden auf gegenseitige Überlappung und Rastergrenzen geprüft; beim Loslassen wird die aktuelle Geometrie erneut validiert, bevor sich eine Position ändert. Dieselbe themengerechte Ziellinie ist bei zulässigem Tausch grün und bei Blockaden rot. Maus, Touch und Tastatur nutzen das gemeinsame Modell. Verschachteltes Randschrollen erhält die vorläufige Rasterhöhe und misst Vorschauen nach Änderungen des Vorfahrenscrollens erneut.

## Aussagekräftige Laufzeitbindungen

Die Syntaxbaumprüfung untersucht Deklarationen, Exporte, Destrukturierungen, Laufzeit- und Typsignaturparameter, Konstruktor-Parametereigenschaften, Catch-Bindungen, Importe, benannte Funktionen und Klassen, Laufzeitbindungen von Enums und Namensräumen sowie private Mitglieder unabhängig von der Formatierung. Sie erfasst Quelltext, Werkzeuge, Tests und Testdaten ohne Altbestands- oder Dateiausnahmen. Undurchsichtige Kurzformen, abgekürzte Pluralformen, nummerierte Platzhalter und verwendete ignorierte Bindungen lassen die Prüfung fehlschlagen. Übliche Entwicklerbegriffe wie `args`, `db`, LDAP-`dn`, HTTP-`req`/`res`, `env`, `opts` und `params` bleiben zulässig; das Glossar definiert den vollständigen Wortschatz. Weitere kurze Ausnahmen sind ein ungenutztes, nicht exportiertes `_`, `id` und numerische `i`/`j`/`k`-Zähler mit passenden arithmetischen Aktualisierungen. Koordinaten und Abmessungen erhalten aussagekräftige lokale Namen. Eigene Hilfs- und Speicher-APIs verwenden ihre aussagekräftigen Namen direkt in Deklarationen, Exporten, Importen und Aufrufern; reine Umbenennungsaliase für Importe und Exporte schlagen fehl. Verbraucher müssen die kanonischen Exporte statt verkürzter Aliase verwenden. Öffentliche Nutzdatenschlüssel, Fähigkeitsbezeichner und reine Typbezeichner behalten ihre Vertragsrollen. Lokalisierte Handbücher, Beitragsrichtlinien, Komponentenversionen, Abhängigkeitsobergrenzen, Sperrdateien und Versionsindizes sind synchronisiert.

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
- [935c670](https://github.com/Cognis-Labs-HQ/Cognis/commit/935c670f7a9447e83355662c8facfbfd090255fa)
- [244aff5](https://github.com/Cognis-Labs-HQ/Cognis/commit/244aff5f4fca07e76c4c484cec5df292116f7293)
- [edb18fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/edb18fe66f9a1862b646b5139448c6b2808b5414)
- [6769fc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/6769fc72c6ee94e2aa5d7972e755499abde402ed)
- [62bba8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/62bba8d9866310444eca76beb41585951f44e34a)
- [310f0eb](https://github.com/Cognis-Labs-HQ/Cognis/commit/310f0eb513d74910fbb076d37b1aa8e2dbe12f3c)
- [0afbb90](https://github.com/Cognis-Labs-HQ/Cognis/commit/0afbb90055f7b2c8d2689fb3d6b0664e92e6fb91)
- [e176689](https://github.com/Cognis-Labs-HQ/Cognis/commit/e176689a44f4c88df0e7347a08b21e64265fdc72)
