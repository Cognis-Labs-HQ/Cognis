# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Kalender.

## Schnittstellen

Kalender wird über den zuständigen Funktionsdienst eingebunden; das Manifest nennt die Komponente und ihre Abhängigkeiten.

## Konfiguration

Die Konfiguration erfolgt über den zuständigen Funktionsdienst. Kalender definiert keine zusätzlichen Einstellungen im Manifest.

## Verhalten

### Zustellung von Freigaben

Calendar erweitert das Share-Gateway über `ctx`-Flow-Hooks und Fähigkeiten. Die Zustellung an Benutzer legt einen eigenen geteilten Kalender für die empfangende Person an und gibt eine allgemeine Navigations-URL sowie eine einmalige lokalisierte Erfolgsmeldung zurück. Passwörter verbleiben im Besitz von Share und werden unter der kanonischen Freigabekennung aus dem Schlüsselbund gelesen.

### Öffentliche Freigabedarstellung

Calendar stellt `/static/gateways/calendar/ui/share-renderer.js` als `mountScriptUrl` für Kalenderlinks bereit. Share übergibt den aufgelösten Kalenderinhalt, gewährte Fähigkeiten, das begrenzte Gast-Token, Übersetzungen und das Abbruchsignal an `mount(root, options)`. Der Adapter-Renderer zeigt eine einzelne Kalenderkarte mit Tages-, Wochen-, Monats- und Jahresumschaltung sowie der üblichen Zeitrastertabelle; andere Kalender und Dashboard-Steuerelemente der empfangenden Person werden nie geladen. Der Kalender passt sich dem Bildschirm an und behält eine nutzbare Mindesthöhe, entsprechend der angemeldeten Kalenderseite. Lesefreigaben zeigen Ereignisse. Freigaben mit `calendar:write` können über `/api/v1/calendar/shared/:calendarId/events` und das Gast-Token Ereignisse anlegen, bearbeiten und löschen.

### Interaktionsgrenze des Kalenders

Die angemeldete Kalenderseite delegiert Ansichts-, Zeitraum- und Zeitrasteraktionen vom dauerhaften Seitenstamm, sodass Composer-Neudarstellungen keine Steuerelemente trennen. Die Ereigniserstellung filtert zunächst alle Kalender mit der üblichen Schreibregel; bleibt kein Ziel übrig, erscheint die lokalisierte Meldung für fehlende beschreibbare Kalender statt des Formulars. Öffentliche beschreibbare Freigaben authentifizieren Ereignisänderungen mit ihrem begrenzten Gast-Token.

### Integration in die Share-Shell

Calendar folgt dem bewährten Lebenszyklus für Meeting-Freigaben: Share entfernt seinen Lade-Composer und übergibt Seitenstamm, aufgelösten Kontext, Übersetzungen und Abbruchsignal an Calendar. Calendar besitzt danach eine vollständige `createPageComposer`-Seite mit Standard-Kopfzeile, Theme-Steuerung und Fußzeile, aber ohne Kontonavigation. Das einzelne Kalenderelement importiert Formular-, Popup-, Zeitstempel- und Ansichtsabhängigkeiten direkt; Ereignisänderungen werden mit dem übergebenen begrenzten Gast-Token authentifiziert.

### Verfügbarkeitsstatus

Kalendertermine aktualisieren die Verfügbarkeit eines Benutzers, wenn sie beginnen oder im aktuellen Zeitraum erstellt werden. Ein danach manuell gewählter Status hat Vorrang, bis ein weiterer Termin beginnt. Benutzer können kalendergesteuerte Statusaktualisierungen unter Benutzereinstellungen → Allgemein deaktivieren.

### Alte Kalenderaufrufe stoppen

Beim Verlassen des Kalenders wird überholte Initialisierung vor Änderungen an Seite oder URL beendet. Das Routensignal erreicht den Seitenaufbau; verspätete Kalender-, Ereignis- und Einladungsantworten können eine bereits ersetzte Zielseite nicht erneut aufbauen. Abgebrochene Initialisierung zeigt keine verspätete Fehlermeldung und startet den Verfügbarkeitstimer nicht erneut.

### Kalender schneller laden

Der Kalender lädt Einladungen gleichzeitig mit der Kalenderliste und startet Ereignisabfragen, sobald die Liste bereitsteht. Der Seitenaufbau wartet weiterhin auf die erforderlichen Abfragen. Bei Fehlern der Einladungsabfrage bleibt die bisherige leere Einladungsliste erhalten. Jede Navigation lädt aktuelle Daten. Abbruchprüfungen verhindern den Aufbau überholter Seiten durch verspätete Antworten.

### Erinnerungen auswählen

Mehrere Erinnerungen lassen sich mit den üblichen sichtbaren Kontrollkästchen auswählen und gemeinsam speichern. Werden alle abgewählt, bleiben Erinnerungen auch bei Kalenderstandardwerten deaktiviert. Bestehende benutzerdefinierte Zeitabstände bleiben beim Bearbeiten verfügbar.

Beim Erstellen verwendet ein fehlendes `reminderOffsetsMinutes` die Kalenderstandardwerte; ein ausdrücklich leeres Array deaktiviert Erinnerungen. Änderungen ohne dieses Feld erhalten die bestehende Auswahl.

### Offline-Assets und Kalender

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/features/technical).

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/features/technical).

### Dauerhaft vorgemerkte Änderungen

Vorgemerkte neue Termine und spätere Änderungen erscheinen in zwischengespeicherten Listen und Detailfenstern. Gleichzeitige Übermittlungen teilen sich eine Anfrage. Fehler optionaler Aktivitätserfassung, Verfügbarkeitsanzeige oder Ansichtsaktualisierung machen einen gespeicherten Termin nicht zu einer fehlgeschlagenen Erstellung. Die Übertragung verwendet dieselbe Termin-UUID und die aktuellen Serverberechtigungen.

### Offline-Statusdarstellung

Der Calendar-Provider bereitet das verzögert geladene Stylesheet für Ereignisstatus vor der ersten Offlineverwendung vor. Gemeinsame Popup-, Toast- und Geheimnis-Sichtbarkeitsstile bereitet der Host vor. Dadurch lassen sich gespeicherte Ereignisse öffnen, ohne ihre Details zuvor online geöffnet zu haben.

### Zuverlässige Freigaben und Tests

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/study/flashcards/technical).

### Prüfung und Lebenszyklus

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/study/flashcards/technical).

### Browsereigene Aktionen

Lesezugriffe und Änderungen für Gastkalender verwenden die lebenszyklusgebundene Capability `calendar:sharedClient` und benannte Flows `calendar:shared:*`. Anfragen behalten die ausdrückliche Gastberechtigung bei, kombinieren Seiten- und Anbieterabbruch und gelangen nie in die Ausgangswarteschlange des Kontos. Verbraucher setzen den Freigabe-Endpunkt nicht selbst zusammen.

Calendar erkennt `meetings:createMeeting` beim aktiven Browseranbieter. Der Anbieter besitzt die Erstellungsanfrage und das Ziel; Calendar löst eine gültige HTTP(S)-URL für das Ereignis auf, ohne Modul-ID oder Route zu kennen. Fehlende Anbieter werden abgewiesen; offline bleibt die Besprechungsoption deaktiviert.

### Anpassbare Arbeitsflächen

Schmale Kalenderflächen zeigen eine Terminliste mit allen Ereignissen und dem gewählten Datum sowie einer kompakten Ansichts- und Datumsauswahl. Breite Flächen behalten Kalendergitter. Das Datumsfeld erreicht leere Tage ohne Scrollen durch einen Monat. Geteilte Kalender nutzen dieselben Darstellungen und beachten Nur-Lese-Rechte.

Datumssprünge und die native Ansichtsauswahl verwenden dieselbe Calendar-eigene Steuerung für Konto- und Freigabeseiten. Ungültige Eingaben ändern die Ansicht nicht; am Ende des Seitenlebenszyklus werden die Listener entfernt.

### Lesbare mobile Inhalte

Der Kalender behält auch auf niedrigen Bildschirmen genügend Platz für Terminlisten und Zeitraster; Ereignisse scrollen intern. Das Symbol zum Hinzufügen neben jedem Datum bietet eine 44px große Touchfläche und eine zugängliche Beschriftung.

Kalenderzeilen in der Seitenleiste bleiben Menüeinträge. Neuer Kalender behält ein 44px-Touchziel und themengerechtes Hover-Feedback.

Die Zeitraumüberschrift geteilter Kalender folgt auch nach responsivem Neuzeichnen dem aktuellen Datum und der gewählten Ansicht.

Ansichtsschaltflächen aktualisieren ihre sichtbare Auswahl und den gedrückten Zustand für jede Datumsdarstellung gemeinsam. Ansichtsschaltflächen halten ihre sichtbaren und gedrückten Auswahlzustände synchron.

## Sicherheit

### Sichere Laufzeitanfragen

Sprachwechsel und Einwilligungsabfragen scheitern nicht mehr daran, dass Calendar bei normalen HTTP-Anfragen Benachrichtigungen registriert. Calendar registriert seine Kategorie einmal beim Bootstrap-Abschluss, nachdem die Benachrichtigungsanbieter verfügbar sind. Share verwendet seine bereits registrierte Kategorie; Auth nutzt seinen Abschluss-Hook ohne doppelte frühzeitige Registrierung. SMTP-Registrierungen bleiben auf den Bootstrap beschränkt. Laufzeit-Handler lösen nur vorhandene Zustellfunktionen auf und nutzen sie. Calendar ist **1.5.5**.

Die Vertragsregistrierung von Adaptern folgt dem [gemeinsamen Gateway-Bootstrap-Vertrag](/docs/gateways).

## Referenz

### Technische Spezifikation

| Seite / Bereich | Anleitung         | Zugriff             |
| --------------- | ----------------- | ------------------- |
| `/calendar`     | Kalenderanleitung | Angemeldeter Nutzer |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

Die Datumsnavigation hebt auch ohne Termine die sichtbaren Datumsaktionen hervor. Die Terminplanung zeigt einen echten Erstellungsplatz statt erneut den ganzen Kalender.

Die Schritte für Datum und Terminerstellung verwenden die Bedienelemente der aktiven Kalenderdarstellung. Agenda und Raster beschreibt [Kalender](/docs/gateways/calendar).
