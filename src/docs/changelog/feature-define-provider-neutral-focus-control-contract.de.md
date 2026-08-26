# Anbieterneutrale Fokussteuerung

## Beliebige deklarierte Kollaborationsfläche fokussieren

Sichere Manifestverträge, gestufte Abläufe, Composer-eigene Bedienelemente und synchronisierte Overlays wurden ohne Anbieterbindung ergänzt.

## Beliebigen kollaborativen Bereich fokussieren

Fokussierbare Composer-Elemente zeigen nun ein Vollbildsymbol. Aktive Fokussitzungen können dem Präsentierenden folgen oder direkt zwischen deklarierten Bereichen wie Besprechungschat und einem vom Anbieter erstellten Whiteboard wechseln.

## Verschiebbares Bild-im-Bild für Besprechungen

Fokusanbieter können einen Bild-im-Bild-Modus deklarieren, dessen größenveränderbarer Besprechungsbereich verschoben werden kann, während andere Dashboard-Inhalte verfügbar bleiben.

## Stabile primäre Navigation

Die primäre Navigation behält nun die von der Anwendung festgelegte Reihenfolge. Ziehsteuerung und benutzerspezifische Sortierung wurden entfernt, damit die Seitenoberfläche einfach und zuverlässig bleibt.

## Seiten externer Komponenten

Externe Module können geeignete SPA-Seiten ausdrücklich freigeben. Andere Komponenten können sie anhand der unveränderlichen Modul-UUID und einer stabilen Routen-ID anfordern, ohne Anbietercode zu importieren oder Asset-Pfade zu erraten.

## Integrierte Seiten nutzen den Broker

Cognis-Dashboard- und Study-Seiten veröffentlichen nun stabile, UUID-gebundene Komponentenseitendeklarationen. Dadurch verwenden integrierte und externe Seiten denselben Anfrage- und Fokussteuerungspfad.

## Authentifizierte Modultexte

Geschützte Marketplace-Textpakete verwenden nun den authentifizierten API-Client. Die Moduldokumentation stellt außerdem klar, dass Punkte – nicht Unterstriche oder Bindestriche – Wörter in Lokalisierungsschlüsseln trennen.

## Empfehlungen bleiben aktuell

Zwischengespeicherte Marketplace-Antworten behalten Cognis-Empfehlungen nun auch nach dem Neuladen der Seite. Die Modulseite fragt Cognis außerdem alle fünfzehn Sekunden ab, solange sie eingebunden ist.

## Ausgewogene Modulkarten

Das Modulraster reserviert nun mehr Platz für jede Karte und ordnet Lebenszyklusaktionen in ausgewogenen Reihen an, damit Bedienelemente bei üblichen Desktopbreiten weder gedrängt erscheinen noch überlappen.

## Navigation bleibt alphabetisch

Einträge der Dashboard-Navigation werden alphabetisch sortiert, sobald ein Modul oder ein anderer UI-Anbieter einen Eintrag hinzufügt. Das kompakte Navigationsmenü wird anschließend in der aktualisierten Reihenfolge neu aufgebaut.

## Gezielte Komponentenfenster

Die Suche nach Komponentenseiten bindet keine Oberfläche mehr ein. Eine ausdrückliche, benutzeraktivierte Spawn-Capability öffnet ein navigationsgeschütztes Fenster innerhalb der aufrufereigenen Bühne und liefert ein verwerfbares Handle mit automatischer Bereinigung beim Abbruch und vor jedem SPA-Routenwechsel.

## Stabiles Benutzermenü

Die Cognis-Shell gleicht Beiträge zum Benutzermenü nun beim Laden der Anbieter ab und entfernt doppelte Zieleinträge, die durch gleichzeitige Aktualisierungen externer Seiten und der Navigationsleiste entstehen.

## Scans privater Repositorys prüfen und beibehalten

Die Einstellungen der Marketplace-Quellen behalten die Option zum Scannen privater Repositorys nun auch nach Neustarts bei. Beim Aktivieren wird vor dem Speichern geprüft, ob das konfigurierte PAT private Repositorys auflisten und deren Inhalte lesen kann. Katalogaktualisierungen melden fehlende Zugangsdaten sowie verweigerten Zugriff auf private Repositorys oder deren Inhalte, ohne zwischengespeicherte Module zu verwerfen.

## Auswertung von Komponentenseiten-Einstiegen absichern

Der Broker für Komponentenseiten wertet Einstiegsmodule von Anbietern nun mit derselben referenzgezählten Importsperre wie die SPA-Navigation aus. Einstiegsmodule, die `mountWhenDirect(mount)` aufrufen, können die Hostseite beim Import nicht ersetzen; die Sperre wird aufgehoben, bevor der Broker die Komponente in ihr angefordertes Fenster einhängt.

## Meeting-PiP-Fenster verschieben und skalieren

PiP-Bereiche von Focus Control verwenden nun eine wiederverwendbare Steuerung für schwebende Fenster. Meeting-Bereiche können an ihrer Kopfzeile verschoben und in der Größe geändert werden, bleiben dabei im sichtbaren Bereich und geben beim Schließen alle Interaktionsressourcen frei.

## PiP-Unterstützung laden und eingebettete Bedienelemente ausblenden

Der Seiten-Host registriert die Funktion für schwebende Fenster nun vor dem Einhängen externer Seiten, sodass Jitsi Meet sein verschiebbares Meeting-PiP zuverlässig erstellen kann. In Komponentenfenstern eingebundene Seiten-Composer blenden verschachtelte Kopfzeilen, Navigation, Sprach- und Designsteuerung, Fußzeilen, Einstellungsabrufe und Kontoerweiterungen automatisch aus.

## PAT-Berechtigungen für private Repositorys erklären

Die Felder für Modulquellen enthalten nun Informationstooltips mit den genauen Anforderungen an differenzierte und klassische GitHub-PATs. Die Dokumentation externer Module nennt Ressourcenbesitzer, Repository-Auswahl, schreibgeschützte Berechtigungen für Metadata und Contents sowie Genehmigungs- und SSO-Anforderungen und stellt klar, dass keine auswählbare GitHub-Organisationsberechtigung nötig ist.

## Schiebereglerbeschriftungen von Hilfeschaltflächen trennen

Der Formular-Builder stellt Informationstooltips nun neben der mit dem Eingabefeld verknüpften Beschriftung statt innerhalb davon dar. Ein Klick auf den Schieberegler für private Repositorys schaltet damit das Kontrollkästchen um, während die benachbarte Informationsschaltfläche ein eigenständiges Hilfselement bleibt.

## Schalterinteraktion und ausgewogenes Quellenformular wiederherstellen

Schalterflächen sind nun explizite Eingabebeschriftungen, sodass ein Klick auf den Schalter für private Repositorys zuverlässig das Kontrollkästchen umschaltet, ohne die benachbarte Hilfe zu öffnen. Die Felder im Modulquellen-Popup verwenden wieder ihre vorgesehenen Rasterbreiten, wodurch die Zugangsdaten-Steuerelemente ausgerichtet und ausgewogen bleiben.

## Private Repositorys über das authentifizierte GitHub-Konto erkennen

Private GitHub-Quellenscans kombinieren nun die Repository-Liste der Organisation mit den privaten Repositorys, auf die das authentifizierte Konto zugreifen kann, und beschränken das Ergebnis wieder auf die konfigurierte Organisation. Fein abgestufte PATs können dadurch ausgewählte private Modul-Repositorys erkennen, selbst wenn GitHub sie in der Organisationsliste auslässt.

## Meeting-PiP-Darstellung in Cognis bereitstellen

Cognis besitzt und lädt nun das vollständige Floating-Window-Stylesheet für Meeting-Anbieter. Beim Aktivieren eines Whiteboards wird das Meeting sofort als festes, sichtbares, verschiebbares und größenveränderbares PiP über die Komponenten-Zeichenfläche gehoben; beim Aufräumen wird das ursprüngliche Inline-Layout des Meeting-Elements wiederhergestellt.

## Randlose Komponentenfenster unterstützen

Aufrufer von Komponentenseiten können eine randlose Einbindung anfordern, die äußere Fensterabstände entfernt und die gesamte übergeordnete Bühne ausfüllt, während der Anbieter die Abstände innerhalb seines Inhalts weiterhin steuert.

## Randlose Zeichenflächen ausfüllen und Meeting-PiP erhalten

Randlose Komponentenfenster entfernen nun auch die Abstände des Page-Composer-Arbeitsbereichs und der äußeren Inhaltskarten, sodass Zeichenflächen ohne Abschneiden am unteren Rand jede Kante des Elternelements erreichen. Schwebende Meeting-Fenster werden in die Host-Ebene außerhalb der begrenzten Komponentenbühne verschoben, damit das Meeting-PiP seitenweit über der Zeichenfläche sichtbar bleibt.

## Explizite Steuerelemente für schwebende Fenster hinzufügen

Schwebende Fenster enthalten nun eine schmale Ziehleiste am oberen Rand und einen SVG-Größengriff unten rechts. Der Host verwaltet beide Zeigerinteraktionen, entfernt Browser-Bildlaufleisten und uneindeutige native Größensteuerungen, begrenzt die Größenänderung auf den sichtbaren Seitenbereich und entfernt die Steuerelemente bei der Bereinigung.

## Laufende Meetings beim Öffnen von PiP erhalten

Schwebende Fenster gelangen nun in die oberste Browser-Ebene, ohne das Anbieter-Element zwischen DOM-Elternelementen zu verschieben. Dadurch bleiben der Meeting-Iframe und seine aktive Verbindung beim Öffnen und Schließen von PiP bestehen; nicht unterstützte Browser verwenden eine auf das Elternelement begrenzte Alternative, die ebenfalls kein neues Einhängen erfordert.

## Komponenten über die Hauptseite scrollen

Komponentenfenster wachsen nun vertikal mit ihrem Inhalt, anstatt einen verschachtelten vertikalen Überlauf zu erzeugen. Radeingaben bleiben auch mit dem Zeiger über eingebetteten Inhalten auf die Hauptseite gerichtet, und der Größengriff ist transparent, sodass nur sein SVG-Raster sichtbar ist.

## Seitenabstände für randlose Komponenten entfernen

Beim Einbinden einer randlosen Komponente wird nun der Außenabstand des umgebenden Elements `app-page__main` entfernt, sodass eine echte randlose Fläche entsteht. Cognis zählt randlose Fenster und stellt den normalen Seitenabstand wieder her, sobald das letzte geschlossen wird.

## PiP an beiden diagonalen Ecken skalieren

Schwebende PiP-Fenster bieten nun SVG-Größengriffe oben links und unten rechts. Das Ziehen eines der beiden Griffe ändert die Größe innerhalb der sichtbaren Begrenzung, hält die gegenüberliegende Ecke fest und wahrt die konfigurierten Mindestmaße.

## Höhenvertrag zwischen Meeting und Whiteboard abstimmen

Randlose Komponentenbühnen stellen nun eine eindeutige Zustandsklasse und einen Mount-Layout-Vertrag bereit, entfernen Abstände aus dem verschachtelten App-Shell-Workspace und strecken jede Composer-Ebene bis zum Widget. Die Integrationsdokumentation definiert die zugehörigen Zuständigkeiten der Jitsi-Meet-Bühne und des Nextcloud-Whiteboard-Composers beziehungsweise Canvas, damit die Zeichenfläche ohne verschachtelten vertikalen Bildlauf bis an den Komponentenrand reicht.

## Wiederverwendbare UI-Ressourcen über ctx bereitstellen

Browsermodule können nun jedes Produktionswerkzeug unter `src/ui/reuse/` und jedes gemeinsame Stylesheet unter `src/ui/styles/reuse/` über die Fähigkeit `ui:reuse` beziehen. Produktions-Builds bewahren deren logische Ressourcen-URLs, während validierte relative Pfade Verzeichnisdurchläufe, Testimporte und falsche Dateiendungen verhindern.

## Wiederverwendungsfähigkeit bei der Modulaktivierung bekanntgeben

Die API registriert `ui:reuse` nun im Katalog der Host-UI-Fähigkeitsanbieter. Module, die diese Fähigkeit deklarieren, bestehen damit die Aktivierungsprüfung, bevor derselbe Anbieter die Browser-ctx-Ressourcenoberfläche initialisiert.

## Moduldetails mit ihren Quell-Repositorys verlinken

Moduldetailköpfe zeigen nun direkt unter dem Titel ein Hyperlink-SVG gefolgt von der vollständigen, bereinigten URL des Quell-Repositorys. Nur die sichtbare URL ist verlinkt; das SVG bleibt dekorativ. Unsichere URLs oder URLs mit Zugangsdaten werden nicht dargestellt. Marketplace-Karten bleiben kompakt und zeigen keine Repository-Links.

## PiP-Größengriffe an helle und dunkle Designs anpassen

Beide diagonalen PiP-Größen-SVGs verwenden nun ausdrücklich kontrastreiche Farben für das helle und das dunkle Cognis-Design. Seiten ohne festgelegtes Design folgen zusätzlich der dunklen Farbschemaeinstellung des Browsers, während die SVG-Pfade ihre Grifffarbe weiterhin über `currentColor` übernehmen.

## Fokussitzungen verhalten sich konsistent

Fokusflächen können jetzt ihren optionalen Standardzustand verwenden, deklarierte Anwendungsrouten werden korrekt aufgelöst, lokales Schließen beendet keine gemeinsame Sitzung mehr und entfernt beendete entfernte Sitzungen ohne veraltete Inhalte.

## Composer-Code bleibt lesbar

Die Größenberechnung des Rasters befindet sich jetzt in einem eigenen, getesteten Modul. Gleichzeitig wurden die erklärenden Kommentare und Abstände in der Initialisierung des Seiten-Composers wiederhergestellt.

## Dashboard an erster Stelle

Das Dashboard bleibt nun der erste Eintrag der primären Navigation, während alle anderen Einträge weiterhin alphabetisch sortiert werden.
