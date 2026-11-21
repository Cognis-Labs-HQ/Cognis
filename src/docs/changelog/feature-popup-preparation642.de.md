# Dialogvorbereitung

**Feature-Zweig:** feature-popup-preparation642

## Wartende Öffnungen abbrechen

Ein bereits abgebrochenes `openPopup` liefert `null`, ohne Ressourcen anzufordern. Ein Abbruch während der Stylesheet- oder Sprachvorbereitung liefert ebenfalls sofort `null`, ohne andere Öffnungen oder die gemeinsame Sprachinitialisierung abzubrechen. Fehlgeschlagene oder abgebrochene Öffnungen übernehmen weder Dialog, Fokus noch Scrollsperre. Sprachfehler bleiben ausdrücklich sichtbar und erlauben einen späteren Initialisierungsversuch.

## Fehlgeschlagene Stile neu laden

Dialogstile teilen `ui:popupPreparation` zwischen gebündelten und direkt geladenen Aufrufern. Jede ausdrückliche Öffnung teilt einen auf fünf Sekunden begrenzten Versuch, davon höchstens eine Sekunde für ein vollständig zwischengespeichertes Stylesheet oder eine laufende Cache-Aktualisierung. Fehlende, ungültige, leere, abgelehnte oder hängende Cache-Lesevorgänge führen innerhalb dieses Versuchs zum Netzwerkzugriff. Geladene Links werden wiederverwendet, laufende beobachtet. Bei Fehlern werden nur eigene Links entfernt; übernommene Links bleiben erhalten und fehlgeschlagene werden bei späteren Versuchen ausgeschlossen. Zeitüberschreitungen und Ladefehler lehnen `openPopup` ab, statt eine Schließaktion zu melden oder einen ungestalteten blockierenden Dialog zu öffnen. Aktive Aufrufer erhalten pro fehlgeschlagenem Versuch eine lokalisierte Fehlermeldung als Toast. Abgebrochene Aufrufer zeigen keine verspäteten Meldungen. Erst eine spätere ausdrückliche Öffnung versucht es erneut; es gibt keine automatische Wiederholungsschleife.

`primePopupStylesheet()` aktualisiert weiterhin das vollständige Stylesheet für die Offline-Wiederherstellung, bündelt gleichzeitige Aktualisierungen und protokolliert Fehler ohne Ablehnung. Aktualisierungen sind auf fünf Sekunden begrenzt. Verspätete Vorgänge verändern danach keine DOM-Stile; bereits an den Browser übergebene Cache-Storage-Schreibvorgänge können nicht zurückgenommen werden. Fehler deaktivieren spätere Dialogwiederherstellung nicht. Verankerte Vorschauen behalten ihren synchronen Controller, behandeln Vorbereitungsfehler, verbergen fehlgeschlagene Vorschauen und versuchen es bei einem späteren `show` erneut. `hide` und `destroy` verhindern verspätete Meldungen. Die vorhandene Laufzeitfehlerbehandlung erkennt eigene Stylesheet-Fehler ohne rekursive Meldung.

Tutorial-Ziele, Abschlusskennungen, Aktionen, Weiter, Zurück, Neustart und Wiederholung bleiben unverändert. Fokus, verschachtelte Dialoge, Verwerfungsbestätigung, Aktionen, Zeitlimits und Rückabwicklung sichtbarer Dialoge behalten ihre Verträge. Die gemeinsame UI besitzt keine eigene Paketversion.

Die Fünf-Sekunden-Grenze gilt nur für den Stylesheet-Versuch, nicht für die gesamte Vorbereitung von `openPopup`. Die strikte Sprachinitialisierung behält ihre bisherige Lebensdauer ohne neues Zeitlimit. Sie kann die lokalisierte Fehlermeldung und Ablehnung verzögern; das Öffnungssignal bricht dennoch sofort ab. Erfolgreiche verankerte Vorschauen initialisieren keine Sprachressourcen des Dialogs.

## Commits

- [159312aacb50c9bbba134b9bcd4ec59ed0920545](https://github.com/Cognis-Labs-HQ/Cognis/commit/159312aacb50c9bbba134b9bcd4ec59ed0920545)
