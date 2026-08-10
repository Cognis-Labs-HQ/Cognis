# Freigabeverwaltung verfeinern

## Kontofreigaben direkt öffnen

Links zu Benutzerfreigaben auf der Freigabeseite und in Benachrichtigungen werden nun einmal über den authentifizierten Kontopfad aufgelöst und führen direkt zur vollständigen Zielseite. Sie durchlaufen nicht mehr die Gaststartseite und aktivieren keine eingeschränkte Gastdarstellung.

## Benutzerfreigaben auf Konten beschränken

An Cognis-Benutzer gerichtete Freigaben können keine Gastsitzungen mehr ausstellen oder aktivieren. Nur der ausdrücklich benannte authentifizierte Empfänger oder der Eigentümer kann sie auflösen; öffentliche Linkfreigaben bleiben der einzige Mechanismus für Gastzugriff.

## Bearbeitung und geschützte Benutzerfreigaben vorhersehbar machen

Freigabeaktualisierungen enthalten nur noch konkrete Änderungen, ein Wechsel der Freigabemethode beendet den Bearbeitungsmodus und die Freigabeseite passt ihre Höhe an die Tabelle an. Passwortgeschützte Benutzerfreigaben fragen über Benachrichtigungen einmal nach und können das bestätigte Passwort im Schlüsselbund des vorgesehenen Empfängers speichern, während öffentliche Linkfreigaben von Kontoschlüsselbunden getrennt bleiben.

## Verhalten für Konto- und Gastfreigaben vereinfachen

Benachrichtigungen zu Benutzerfreigaben behalten die Sitzung des vorgesehenen Kontos bei, während passwortgeschützte öffentliche Links ohne Entsperren oder Speichern im Kontoschlüsselbund nach dem Passwort fragen, bevor der Gastmodus beginnt. Leere Aktualisierungsfelder behalten bestehende Werte bei und moduleigene Freigabedialoge verwenden durchgängig die korrigierten Passwort- und Löschtexte.

## Benutzerfreigaben schützen und Steuerelemente verdeutlichen

Benutzerfreigaben erfordern weiterhin das vorgesehene Konto, statt übertragbaren Gastzugriff zu erzeugen. Freigabeaktionen verwenden nun eine neutrale Darstellung, Berechtigungen unterscheiden eindeutig zwischen „Schreibgeschützt“ und „Lesen & Schreiben“, Passwortdialoge geben kurze Hinweise für Empfänger und entfernte Gastfreigaben werden ohne wiederholte Weiterleitungen oder Meldungen beendet.

## Freigabeaktualisierungen und nahtlose Seitenwechsel wiederherstellen

Der fokussierte Freigabeeditor übermittelt Änderungen am Ablaufdatum nun konsistent und zeigt seine Aktualisierungsaktion mit der standardmäßigen Bestätigungsdarstellung. Bei der Navigation innerhalb der Anwendung bleibt die aktuelle Seite gestaltet, bis das Ziel vollständig eingebunden ist, wodurch ein kurzes Aufblitzen ungestalteter ausgehender Inhalte verhindert wird.

## Freigaben filtern und sofort entfernen

Die Zusammenfassungspillen „Gesamt“, „Gesendet“ und „Empfangen“ filtern nun die Freigabetabelle. Erfolgreich abgelehnte oder gelöschte Freigaben verschwinden sofort, und jede destruktive Zeilenaktion verwendet ausschließlich die standardmäßige Abbrechen-Darstellung.

## Kontozugriff bei eigenen und empfangenen Freigaben bewahren

Beim Öffnen einer Whiteboard-Freigabe durch ihren Ersteller oder einer Meeting-Benutzerfreigabe durch ihren Empfänger bleibt die authentifizierte Kontositzung nun sowohl bei der Navigation innerhalb der Anwendung als auch nach einer Aktualisierung erhalten. Das Ziel bindet seine vollständige Kontoseite ein, behält die komplette Navigation und wechselt nicht mehr in die eingeschränkte Gastansicht.

## Seitensteuerung und Stile des Ziels isolieren

Auf Whiteboard- und Freigabeseiten bleibt die Layoutbearbeitung deaktiviert. Bei jeder Navigation innerhalb der Anwendung wird das Aktionsdock neu aufgebaut, nicht von der Zielseite bereitgestellte Aktionen werden entfernt, das vollständige Stylesheet-Paket wird geladen und nicht mehr benötigte Routenstile werden entfernt.

## Verwaltung auf eine Freigabe beschränken

Die Seite „Freigaben“ öffnet nun einen kompakten Editor, der nur das Formular der ausgewählten Freigabe enthält. Die Freigabemethode bleibt festgelegt, nur dieser Datenbankeintrag wird aktualisiert und der Dialog öffnet sich bei der Navigation innerhalb der Anwendung nicht mehr doppelt.

## Freigabesteuerung vereinheitlichen

Die Seite „Freigaben“ fügt außerhalb ihrer Karte keinen zusätzlichen vertikalen Abstand mehr hinzu. Freigabeschaltflächen verwenden außerdem einheitlich die Abbrechen-Darstellung für ihre potenziell zugriffsreduzierende Aktion.

## Routen für geteilte Inhalte wiederherstellen

Registrierte Gateway- und Modulseiten laden nun sowohl nach einer Browser-Aktualisierung als auch bei der Navigation innerhalb der Anwendung ihren eigenen Dashboard-Einstiegspunkt und das vollständige Stylesheet-Paket. Freigaben, Besprechungen und Whiteboards behalten dadurch Kopfleiste, Fußzeile, Layout und Komponentenstile.

## Besprechungsfreigaben für ihre konfigurierte Laufzeit gültig halten

Besprechungsfreigaben bleiben nun über Besprechungsinstanzen und beendete Sitzungen hinweg auflösbar. Der Zugriff besteht weiter, bis die Freigabe selbst abläuft, abgelehnt oder widerrufen wird; wiederholte Authentifizierungsabläufe verwenden die bereits aufgelöste Freigabesitzung erneut.
