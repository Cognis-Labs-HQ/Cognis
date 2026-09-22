# Einheitliche Bibliothek

**Feature-Zweig:** feature-create-multi-layered-library-adapter

## Nachverfolgbare Ebenen

Ein Study-Bibliotheksadapter ergänzt unveränderliche Ebenen für Schriftsysteme, Definitionen, Sprachmaterial, Übungen, Trainingseinheiten, Routinen und Sammlungen. Gerichtete Verweise verbinden jedes Material mit seinen Bausteinen.

## Sichere Bereiche

Globale, klassenbezogene und private Benutzerbereiche besitzen rollen- und mitgliedschaftsabhängige Zugriffsregeln. Veröffentlichungsanfragen erfordern die Freigabe am Ziel und übernehmen alle referenzierten Abhängigkeiten gemeinsam.

## Import, Export und Oberfläche

Die Bibliothek ist über ctx und authentifizierte APIs verfügbar, einschließlich validiertem globalem JSON-Import, JSON- und Anki-Export, Unicode-Wortzerlegung, Tiefenverfolgung und einer Study-Seite für alle Benutzer.

## Auswählbare Vorlagen

Sprach- und Aktivitätsmodule können nur die benötigten Ebenen der kanonischen Vorlage kopieren. Ebenenbezogene Metadaten erhalten gültige Beziehungen, kennzeichnen Pflichtabhängigkeiten und leiten Verknüpfungen von Zeichen zu Wörtern sowie von Wörtern zu Sätzen ab.

## Neugestaltung des Beziehungsframeworks festlegen

Ein stufenweiser Implementierungsplan ersetzt feste Bibliotheksschichten durch verbrauchereigene Schemata, geprüfte generische Beziehungen, austauschbare Auflösungs- und Lookup-Flows, vollständige Detailansichten, Deep Links und eine rücksetzbare Migration.

## Neugestaltung umsetzen

Feste Ebenen wurden durch gespeicherte, versionierte Verbraucherschemata ersetzt. Typisierte Felder, Kardinalität, geordnete Kanten, Schemaversionen und sichtbare Beziehungsziele werden geprüft. Unicode-Graphemauflösung und entfernbare Lookup-Anbieter mit Herkunft wurden ergänzt.

## Beziehungen vollständig durchsuchen

Neutrale Schema-, Detail-, Trace-, Auflösungs- und Lookup-APIs sowie eine schemagesteuerte Oberfläche zeigen beliebige Ebenen, Felder, Bestandteile und eingehende Verwendungen unter dauerhaft ladbaren Detailadressen.

## Inkompatible Capability-Änderung

Die inkompatible Schemafähigkeit wurde mit Adapter 2.0.0 eingeführt; die deklarative Paketübernahme erhöht ihn auf 2.1.0. Verbraucher registrieren ein Schema und verwenden dessen Schema- und Beziehungs-IDs anstelle des entfernten festen Katalogs, der Vorlagenklone und schichtspezifischen Import- und Exportmethoden.

## Deklarative Sprachpakete ergänzen

Sprachpakete können nun ein reines Datenverzeichnis zur deterministischen Prüfung und atomaren Übernahme an die Bibliotheksfähigkeit übergeben. Cognis prüft sichere Pfade, Manifest, Lizenz, Schema, alle Datensätze und Beziehungen, erzeugt stabile Namensraum-IDs und speichert versionierte Installationsbelege. Das Sprachframework beschreibt Manifest, Schema, Ebenenverzeichnisse, Datendateien und die Trennung zu ausführbaren Resolver- und Lookup-Adaptern.

## Lokalisierte Definitionsdatensätze

Definitionsebenen deklarieren jetzt moduleigene Zuordnungen von Zeichenkettenschlüsseln. Das Erstellungsformular der Bibliothek fragt alle Cognis-Oberflächensprachen ab, verlangt nur Englisch, erzeugt einen stabilen Schlüssel zur ID des Definitionseintrags und bietet eine optionale ctx-Übersetzungsfähigkeit für zukünftige Anbieter.

## Bibliotheksansicht ausbauen

Die Bibliothek verwendet jetzt Ebenen-Reiter, kartenbasierte Einträge und wiederverwendbare Pop-up-Details. Die Auswahl von Einträgen und das Navigieren durch Beziehungen erfolgen im Hintergrund, ohne Datensatzkennungen in der Browser-URL anzuzeigen. Die gleich breiten Zurück- und Weiter-Steuerelemente verwenden eindeutige Richtungspfeile. Außerdem bietet die Studien-Unternavigation allen Steuerelementen genügend Platz, statt sie beim Darüberfahren abzuschneiden.

## Unterstützende Inhalte integrieren

Definitionen und Partikel bleiben jetzt aus der direkten Bibliotheksansicht ausgeblendet. Eintragsdetails zeigen lokalisierte Definitionen unter der Überschrift, beziehen Satzpartikel als schreibgeschützte Beziehungsdetails ein, stellen Badge-Metadaten als Pills dar, kennzeichnen den Bereich mit zugänglichen SVG-Symbolen und bieten jedes Badge-Feld als Kartenfilter an.

## Bibliotheksfilter und Details verfeinern

Metadaten-Auswahlfelder der Bibliothek verwenden jetzt die gemeinsame Theme-Gestaltung und wenden Änderungen sofort an. Detail-Pop-ups nutzen größere Überschriften, zeigen Definitionen und Bedeutungen unter dem Titel und stellen erkannte Bestandteile als navigierbare Unterfelder in der Überschrift statt in einem separaten Komponentenabschnitt dar.

## Pill-Filter und gemeinsames Audio

Metadaten-Auswahlfelder wurden durch optional gruppierte Filter-Pills ersetzt, und die Studiennavigation trennt wieder linke Seiten von rechten Sprachsteuerungen. Schemata für Schreibeinheiten verlangen jetzt Aussprache und Audio; Module können lokale Audiodateien oder HTTPS-Quellen liefern, die Cognis einmal in einen zugriffsgeschützten gemeinsamen lokalen Zwischenspeicher lädt.

## Laden und Gateway-Speicherung wiederherstellen

Die Bibliothek wird wieder in Browsern ohne natives `Map.groupBy` dargestellt. Normalisierte Studien-Sprachcodes erhalten registrierte Flaggen an den Sprachsteuerungen, und entferntes Audio wird vollständig in einem komponenteneigenen Namensraum des Datei-Gateways gespeichert. Die Bibliothek schreibt keine Cache-Dateien mehr direkt und setzt keine eigene Größenobergrenze für Audio.

## Mit dem upstream Development-Zweig abgleichen

Die neuesten Änderungen aus dem upstream Development-Zweig wurden zusammengeführt. Der eingestellte Registrierungseinladungs-Adapter wurde zugunsten der upstream tokenbasierten Implementierung aufgelöst, damit die Studienbibliothek mit der aktuellen Anwendungsarchitektur kompatibel bleibt.

## Kompatibilität der Studienadapter aktualisieren

Die getestete Gateway-Obergrenze der Bibliotheks- und Fortschrittsadapter wurde auf die upstream Gateway-Version angehoben, beide Adapterversionen wurden erhöht und ihre vollständigen Workspace-Einträge in der Sperrdatei wurden wiederhergestellt, damit eine saubere Abhängigkeitsinstallation nach der Zusammenführung gelingt. Korrigierte upstream Integritätsmetadaten der Paketregistrierung machen den gesperrten Abhängigkeitssatz zudem reproduzierbar.

## Änderungen auf die Bibliothek begrenzen

Nicht zusammenhängende Änderungen an Kern, API, Router, Adaptern, Gateways und Funktionen wurden entfernt. Dieser Pull Request enthält damit nur die Studienbibliothek, ihre Studienintegration und die dafür erforderlichen wiederverwendbaren UI-Werkzeuge.

## Gruppierte Study-Unterseiten routen

Eine generische UI-Fähigkeit für gruppierte Unterseitenerkennung, Zwischenspeicherung, Invalidierung und Routenauflösung wurde hinzugefügt. Study verwendet nun ein einziges anbietergestütztes Modell für die Seitenliste jeder Sprache, die Unternavigation der ausgewählten Sprache, Hub-Karten und das Laden untergeordneter Seiten. Die Navigation bewahrt die ausgewählte Sprache im privaten Verlaufstatus.

## Interaktionen der Bibliothek verfeinern

Das Einklappen der Kopfzeile beim Scrollen wurde stabilisiert, die Study-Ebenennavigation wird beim ersten Laden gefüllt, Überlauf an Sprachschaltflächen wurde entfernt und kompakte Pop-up-Überschriften wurden wiederhergestellt. Die administrative Bibliothek öffnet nun schreibgeschützte Zeilendetails mit vereinfachter Referenzübersicht und Mehrfachauswahl per Rechtsklick. Lernkarten zeigen wieder Aussprachen und Definitionen in der Vorschau, behalten tiefe Verknüpfungen und vermeiden doppelte Detailabschnitte. Aktiver Ebenenstatus, zentrierte Auswahlmarken und themengerechte Bearbeitungssteuerungen bleiben visuell konsistent.

## Vom Anbieter gesteuerte Library-Bearbeitung

Library-Zeilen öffnen schreibgeschützte Details über ihre gesamte Trefferfläche, während themenabhängige Bearbeitungsaktionen am Zeilenende bleiben. Anbieter-Schemata steuern Feldbezeichnungen, Steuerelemente, unveränderliche Klassifizierungen, Deep-Link-Beziehungen und die sprachgebundene Audiosuche. Tags werden mit der Eingabetaste übernommen, ausgewählte Optionen lassen sich abwählen, Pflichtfelder werden vor dem Senden geprüft und schwebende Aktionen sind lokalisiert. Karten und die Study-Unternavigation verwenden stabile, themengerechte Hover-Zustände; Zusammensetzungen wählen vor atomaren Zeichen die nächstgelegenen übergeordneten Datensätze.

## Library-Vorschauen und Administratorprüfung verfeinern

Lernkarten zeigen jetzt eine schlanke einzeilige Kombination aus Bezeichnung und Aussprache mit getrenntem Bereichssymbol; Definitionen und Metadaten wurden aus der Vorschau entfernt. Ein Klick auf eine Administratorzeile öffnet nun dasselbe schemagesteuerte Formular wie die Bearbeitung, jedoch deaktiviert und schreibgeschützt, statt das Detailfenster für Lernende zu öffnen.

## Kompakte Karten und Vokabellinks präzisieren

Die Flächen der Lernkarten wurden abgedunkelt, Variantenhinweise erhalten eine kompakte, nicht verdeckende Ecke und redundante Hover-Einblendungen für Beziehungen wurden entfernt. Vokabelbeziehungen enthalten nun die vom Anbieter gelieferte Aussprache, damit bedeutungsvolle Ein-Zeichen-Wörter von ihren Schriftzeichen-Datensätzen unterscheidbar bleiben.

## Verschachtelte Variantenäste sichtbar halten

Library-Raster behalten ihre Begrenzung. Geöffnete Äste prüfen nun die vom Anbieter bevorzugten und alternative Richtungen gegen die gerenderten Grenzen, damit verschachtelte Karten im Kartenraster bleiben. Der Hinweis zum Gedrückthalten wird nicht mehr animiert oder unscharf und seine Schrift ist 25 % größer.

## Vom Anbieter bevorzugte Variantenplatzierung begrenzen

Das Überlaufen wurde durch eine begrenzte Laufzeitplatzierung ersetzt. Anbieterrichtungen bleiben die erste Wahl, aber jeder sichtbare verschachtelte Ast wird gemessen und bei Bedarf umgeleitet, sodass jede Karte innerhalb des Library-Rasters und Widgets bleibt.

## Anker verschachtelter Karten stabil halten

Die Einpassung misst jetzt nur die jeweils platzierte Karte, sodass ein Nachfahre seine bereits positionierte Elternkarte nicht verschieben kann. Wenn der bereinigte Pfad zu wenige umliegende Plätze bietet, verwenden Geschwisterkarten eine Richtung mit zunehmendem Abstand erneut und werden in derselben Zeile oder Spalte gestapelt.

## Doppelte Vokabel-Titeldetails entfernen

Vokabel-Popups verwenden den Haupttitel jetzt ausschließlich für die Bezeichnung der lexikalischen Einheit und zeigen im Titeldetail nur deren für die aktive Sprache lokalisierte Definition. Alternative Schreibweisen, Aussprachen und Varianten-Elternhinweise duplizieren die Vokabelüberschrift nicht mehr.

## Commits

- [2db6fd1a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2db6fd1a147194de35f45b07090d0b5356206933)
- [45c1c7e0](https://github.com/Cognis-Labs-HQ/Cognis/commit/45c1c7e011bfde255e69e0dcf87b01e95600c49a)
- [2b1ff9e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b1ff9e205cab5fb1645370b367efa76f1e9b199)
- [8a0ef5f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a0ef5f9)
- [8d2b4358](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d2b4358c176a447bb60e9248f40c1234f8cb143)
- [e4f406f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/e4f406f16a3f0635a6f25206d19d19706cedbbbc)
- [a7891aaa](https://github.com/Cognis-Labs-HQ/Cognis/commit/a7891aaa8195180c45fa490ada5469d2d306c62b)
- [b8a1852e](https://github.com/Cognis-Labs-HQ/Cognis/commit/b8a1852e1f4aa45ce950ad49484f818c713341d2)
- [820d53f6](https://github.com/Cognis-Labs-HQ/Cognis/commit/820d53f65816655949a0a1f47068a10cdfc51178)
- [8be331f9](https://github.com/Cognis-Labs-HQ/Cognis/commit/8be331f9bc1a54edc80c10e53a4e4d2704a4f7b5)
- [3c72e487](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c72e4870f99213562fb3796b4d76624486ba272)
- [25309509](https://github.com/Cognis-Labs-HQ/Cognis/commit/25309509877018b8d1a4633636f9d45daeef45b4)
- [de20ea2c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/de20ea2c0)
- [92ef5510](https://github.com/Cognis-Labs-HQ/Cognis/commit/92ef5510)
- [b38f8b31](https://github.com/Cognis-Labs-HQ/Cognis/commit/b38f8b31)
- [f9ce159d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9ce159da8ad07c2ff59f913eebab32a69f26921)
- [03dd55f0](https://github.com/Cognis-Labs-HQ/Cognis/commit/03dd55f02c762ae99dc3870322ceb9864cb9e325)
- [e8019a21](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8019a21e12295863fcf009a52385c85069498de)
- [806058fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/806058fe26c0d127f0bacf034530b1023131d380)
- [3c0d5766](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c0d57662df962ac6b5d93f793e0c8de91e1856b)
- [748063b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/748063b10cc208747832e7880098858db648a415)
- [e96d273f](https://github.com/Cognis-Labs-HQ/Cognis/commit/e96d273fa56edd2c2ded09ca993724437ab85c93)
