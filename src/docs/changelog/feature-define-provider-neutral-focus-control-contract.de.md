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
