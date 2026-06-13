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
