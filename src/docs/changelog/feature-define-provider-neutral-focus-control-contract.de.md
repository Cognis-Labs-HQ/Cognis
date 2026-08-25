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
