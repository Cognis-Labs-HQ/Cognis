# Freigabeverwaltung verfeinern

## Aktive Freigaben entziehen und Gastoberfläche begrenzen

Das Löschen einer Freigabe veröffentlicht jetzt ein Widerrufsereignis an aktive Tabs und angemeldete Empfänger der Entfernungsbenachrichtigung, sodass betroffene Betrachter sofort zur verweigerten Freigabeansicht zurückkehren. Doppelte Löschbestätigungen werden verhindert, Gastsitzungen erhalten keine Versionszusammenfassungen mehr und vor der Eigentümerprüfung einer weiteren Freigabe wird eine hinterlegte Kontositzung wiederhergestellt.

## Freigabeeigentum und Übersichtssteuerung eindeutig behandeln

Eigentümer umgehen jetzt Freigabepasswortabfragen und gelangen unter ihrer Kontositzung direkt zur Inhalts-URL, während Empfänger weiterhin eine konfigurierte Freigabeauthentifizierung abschließen. Die gatewayeigene Freigabeseite rendert gefilterte und vorläufig entfernte Zeilen nun ausdrücklich neu, verwendet kompakte inhaltsbreite Anfangsspalten und einheitlich gepolsterte Aktionsschaltflächen.

## Freigabeauthentifizierung an die angeforderte SPA-Route binden

Der Router übergibt jetzt den genauen Zielpfad an die Sitzungsauthentifizierung, und das Share-Gateway liest das Benutzerfreigabe-Token aus dieser unveränderlichen Routeneingabe. Gleichzeitige URL-Änderungen können dadurch eine gültige Benutzerfreigabe nicht mehr ohne Token erscheinen lassen oder den Empfänger in der öffentlichen Ladeansicht festhalten.

## Kontoauthentifizierung bei Freigabeauflösungen beibehalten

Die Freigabeauflösung verwendet jetzt den authentifizierten API-Client, der stets das Token des angemeldeten Kontos mitsendet und Freigabepasswort-Header beibehält. Erwartete Passwortabfragen sind von der globalen Zugriffsverweigerungsbehandlung getrennt, sodass sie keine Weiterleitungen in Gastsitzungen oder doppelten Entsperrabläufe mehr auslösen.

## Freigabeauthentifizierung des Ziels vor SPA-Prüfungen registrieren

Bei der SPA-Navigation werden die Flow-Beiträge des Zieleintrags jetzt vor der Routenauthentifizierung geladen. Empfänger einer Benutzerfreigabe werden dadurch während des einzigen Authentifizierungsdurchlaufs des Routers vom Share-Gateway aufgelöst und behalten ihre vollständige Kontositzung, statt auf die Gastseite zu geraten.

## Vom Router aufgelöste Kontofreigabe wiederverwenden

Die Freigabeseite verwendet nun den bereits von der SPA-Navigation authentifizierten Freigabekontext, anstatt die Authentifizierung ein zweites Mal auszuführen. Benutzerfreigaben behalten dadurch ihre direkte Kontozuordnung und öffnen die vollständige Zielseite, ohne als Gastzugriff neu interpretiert zu werden.

## Direkte Empfänger in ihrer Kontoansicht halten

Eine serverseitig bestätigte direkte Benutzerfreigabe erstellt nun immer eine Kontositzung, auch wenn die lokale Prüfphase keine Kontometadaten geliefert hat. Sie kann nicht mehr in die Gastdarstellung fallen. Gelöschte und abgelehnte Freigaben werden außerdem vor Abschluss der Anfrage direkt aus der sichtbaren Tabelle entfernt.

## Benutzerfreigaben in einem Ablauf auflösen

Klicks auf Benutzerfreigaben wechseln nun zur Freigabeseite, ohne das Token zuvor in einem zweiten Clientpfad aufzulösen. Der Sitzungsablauf übernimmt Kontoprüfung, Passwortabfrage und Auslieferung einmalig. Gelöschte Zeilen verschwinden sofort und werden nur wiederhergestellt, wenn der Server das Löschen ablehnt.

## Datenbankaktualisierungen für Freigaben reparieren

Zeitstempel für Freigabezugriffe, Freigabebearbeitungen und Markierungen für Ablaufbenachrichtigungen verwenden nun den unterstützten Aktualisierungsvertrag des Datenbank-Gateways. Dadurch unterbricht der Nullobjektfehler gültige Freigaben nicht mehr.

## Freigabezugriff trotz Auditfehlern ermöglichen

Die Freigabeauflösung schlägt nicht mehr fehl, wenn der optionale Zeitstempel des letzten Zugriffs wegen einer älteren oder vorübergehend nicht verfügbaren Datenbankspalte nicht gespeichert werden kann. Noch nicht geöffnete Freigaben zeigen nun Nicht aufgerufen statt Läuft nie ab.

## Erfolgreiche Freigaben klar melden und Zugriffsdaten anzeigen

Ein Fehler auf der Zielseite meldet eine bereits bestätigte Benutzerfreigabe nicht mehr als ungültig oder abgelaufen. Freigaben zeigen nun Erstellungs- und letzte Zugriffsdaten, und Whiteboard-Berechtigungen verwenden einheitlich Nur Lesen und Lesen + Schreiben.

## Geschützte Freigabenavigation und Gaststeuerung im Kalender abschließen

Benachrichtigungsaktionen werden nun nur von einem Freigabe-Handler übernommen, wodurch doppelte Passwortabfragen und falsche Meldungen über ungültige Freigaben vermieden werden. Kalenderempfänger bestätigen Importe, beim Löschen empfangener Kalender wird ein passender Text verwendet und Kalendergäste können Ansichten mit automatischem Scrollen zur aktuellen Uhrzeit wechseln. Schreibzugriff heißt nun Lesen + Schreiben.

## Geschützte Benutzerfreigaben ohne doppelte Auflösung fortsetzen

Nachdem ein vorgesehener Empfänger eine passwortgeschützte Benutzerfreigabe entsperrt hat, wird das bestätigte Ergebnis nun in die folgende In-App-Navigation übernommen. Cognis wiederholt die Auflösungsanfrage nicht mehr ohne Passwort, sodass die vollständige Kontoseite statt eines 401-Fehlers und eines Hinweises auf eine ungültige Freigabe geöffnet wird.

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

## Benutzerfreigaben bleiben in Kontositzungen

Direkte Benutzerfreigaben übermitteln nun das undurchsichtige Ziel des Inhaltsanbieters an den benannten Empfänger und legen weder eine öffentliche Freigabe-URL offen noch erstellen sie eine Gastsitzung. Linkfreigaben behalten ihren unabhängigen Ablauf für öffentliche Links und Gastzugriff.

## Aktiven Freigabezugriff durchsetzen

Falsche Freigabepasswörter zeigen nun einen Fehler und können sofort erneut eingegeben werden. Geschützte Benutzerfreigaben werden vor dem Öffnen entsperrt, Einträge auf der Freigabeseite verwenden dieselbe Zugriffskontrolle wie Benachrichtigungen und widerrufene Link- oder Benutzerfreigaben entfernen Empfänger umgehend aus aktiven Inhalten.

## Aktionen für Freigabeeinträge stabilisieren

Benachrichtigungen für ungeschützte Benutzerfreigaben öffnen ihren Inhalt direkt, geschützte Einträge verbrauchen ihre einmalige Aktion auf der Freigabeseite vor der Passwortabfrage und erfolgreiche Entsperrungen verwenden die interne App-Route. Doppelte Benutzerfreigaben melden nun den Konflikt oder aktualisieren die vorhandene Freigabe, wenn sich deren Einstellungen geändert haben.
