# Korrekturen im Klassenraum

## SPA-Stile im Klassenraum laden

Die Klassenraum-SPA-Route lädt nun auch bei interner Navigation das Workspace-Stylesheet, sodass Blackboard-Workspace, Seitenleistenabstände, Chat-Kachel und Agenda-Steuerung ohne harten Reload korrekt dargestellt werden.

## Workspace-Wechsel stabilisieren

Kachel- und Diashow-Navigation halten den aktiven Workspace nun in der richtigen visuellen Reihenfolge, lassen den Layout-Umschalter auch bei geöffnetem Chat sichtbar, initialisieren Chat- und Whiteboard-Ansichten konsistent und schicken Schüler mit einem Toast zurück in die Klassenansicht, wenn der Lehrer geht.

## Uploads für Lehrermaterial verbessern

Uploads in die Lehrerbibliothek verwenden jetzt den Speicherpfad `teacher-materials/`, nutzen im Auswahlfenster das gemeinsame Upload-SVG, öffnen das Popup nicht mehr doppelt und verwenden das größere Dokumentenlimit für Klassenmaterialien.

## Notepad-Verantwortung in den Notepad-Adapter verschieben

Die API-Logik für Klassenraum-Agenda und Notepad-Dateien liegt jetzt im Study/Notepad-Adapter, während der Classes-Adapter nur noch gemeinsame Klassenraum-Ressourcenfähigkeiten bereitstellt. Der Notepad-Adapter verwaltet damit Snapshots, Notizdatei-Routen und eine konfigurierbare Maximalgröße über die Study-Adapter-Konfiguration.

## Nextcloud-Whiteboard-Admin-Konfiguration hinzufügen

Das Nextcloud-Whiteboard-Modul bietet jetzt ein Einstellungs-Popup in der Administration sowie persistente Konfigurationsrouten unter `/api/v1/modules/nextcloud-whiteboard/config`. URL, Signaturgeheimnis und Token-Laufzeit werden in der Datenbank gespeichert und für die Laufzeit-Token-Erzeugung verwendet.

## Chat-Schaltfläche zusammenführen und in „Chat" umbenennen

Die doppelte Schaltfläche „Chat öffnen" wurde aus der Blackboard-Aktionsleiste entfernt. Die verbleibende Schaltfläche im Workspace-Tab trägt jetzt die kürzere Bezeichnung „Chat".

## Aktive Kachel wird beim Auswählen mit allen anderen getauscht

Nur die aktive Kachel besitzt einen Inhaltsbereich. Ein Klick auf eine inaktive Kachel tauscht sie mit der aktuell aktiven, sodass die aktive Kachel stets an letzter Stelle im Stapel erscheint.

## Lehrer-Ansichtsstatus wird unabhängig vom Snapshot-Polling synchronisiert

Schüler fragen einen eigenen API-Endpunkt nach dem aktuellen Board-Fokus und Kachellayout des Lehrers ab – bei jedem Datenabruf und bei SSE-Ereignissen – damit die Synchronisation in Diashow- und Kachelansicht funktioniert.

## Chat-Fenster-CSS gehört zum Messages-Adapter

Alle CSS-Regeln für das Chat-Panel im Klassenraum wurden in den Messages-Adapter verschoben, damit das Chat-Panel einheitlich mit der Nachrichten-Seite dargestellt wird.

## Lehrermaterial behält echte Dateinamen

Uploads in die Lehrermaterial-Bibliothek speichern jetzt den ursprünglichen Dateinamen und den Inhaltstyp als Bibliotheksmetadaten, sodass Auswahlfenster und verknüpfte Klassenmaterialien verständliche Namen statt roher UUID-Schlüssel anzeigen.

## Klassenmaterial öffnet im Klassenraum

Das Öffnen eines Klassenmaterials wechselt jetzt zu einem Inline-Viewer im Klassenraum, statt die Datei in der Seitenleiste zu rendern. Dadurch werden unautorisierte Inline-Dateiladevorgänge vermieden und das aktive Material bleibt auf der Hauptunterrichtsfläche.

## Meetings verkraften längere Leerlaufphasen

Jitsi-Klassenraum-Meetings halten Präsenz-Einträge jetzt deutlich länger aktiv, bevor das Backend Teilnehmer als verschwunden einstuft. Dadurch werden versehentliche Meeting-Abbrüche durch verzögerte Browser-Heartbeats reduziert.

## Diashow-Navigationspfeile verwenden gemeinsame Vorlage

Die Navigationspfeile werden aus einem einzigen Helfer erzeugt, der von der Erstdarstellung und dem dynamischen Kachel-Refresher gemeinsam genutzt wird. In der Chat-Ansicht werden Pfeile automatisch ausgeblendet.

## Metadatendatei erscheint nicht mehr in der Lehrermaterial-Liste

Die Metadaten-Indexdatei (`.library-metadata.json`) wurde fälschlicherweise in der Materialliste angezeigt, und hochgeladene Dateinamen erschienen als rohe UUID-Schlüssel. Beide Probleme wurden durch einen Doppelschrägstrich-Fehler im lokalen Datei-Gateway verursacht. Das Gateway normalisiert abschließende Schrägstriche jetzt korrekt.

## Notizbuch-Dateiauswahl-Interaktionen funktionieren jetzt korrekt

Der Callback für den Notizbuch-Dateiauswahldialog war unter dem nicht unterstützten Schlüssel `onMount` statt `onOpen` registriert, weshalb die Schaltflächen „Öffnen", „Umbenennen" und „Löschen" nie funktionierten. Der Speicher-Dialog hatte außerdem einen überflüssigen grünen „Öffnen"-Button neben „Speichern". Beide Probleme sind behoben; die Schaltfläche „Umbenennen" ist jetzt neutral statt rot gestaltet.

## Klassenmitgliedschaft für den Dateizugriff von Schülern erzwungen

Lehrermaterial-Dateien werden jetzt über eine klassenbezogene Route ausgeliefert, die prüft, ob der anfragende Nutzer in der Klasse eingeschrieben ist. Schüler und Lehrer verwenden `/api/v1/study/classes/:id/materials/files/:key` statt der allgemeinen Datei-API. Der Schlüssel wird gegen die Klassenressourcenliste geprüft, um Path-Traversal zu verhindern.
