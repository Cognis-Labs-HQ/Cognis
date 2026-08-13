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

## Lang laufende Tabs reaktionsfähig halten

Prüfungen auf widerrufene Freigaben verwenden nun einen einzigen sichtbarkeitsabhängigen Monitor anstelle wiederholter Abfragen im Halbsekundentakt. Hintergrund-Tabs pausieren Netzwerkprüfungen und validieren beim erneuten Fokussieren sofort, damit lang laufende Freigabeseiten weder Browser- noch Serverressourcen erschöpfen.

## Gespeicherte Freigabepasswörter wiederverwenden

Passwortgeschützte Benutzerfreigaben speichern und laden ihr Passwort nun mit derselben stabilen Schlüsselbundkennung `share:<share-id>`, sodass beim erneuten Öffnen keine Abfrage erfolgt, nachdem das Passwort gespeichert wurde.

## Ausgeblendete Whiteboards anhalten

Anwesenheitsabfragen und Echtzeit-Sockets von Whiteboards werden nun angehalten, solange ihr Tab ausgeblendet ist, und beim erneuten Anzeigen mit einer frischen Verbindung fortgesetzt. Das Laden des Kollaborationsskripts läuft außerdem kontrolliert ab, damit blockierte externe Anfragen Neuladevorgänge nicht endlos laufen lassen.

## Schlüsselbundzugriff nur bei Bedarf anfordern

Die SPA-Navigation entsperrt den Schlüsselbund nicht mehr vorsorglich. Benutzerfreigaben prüfen zuerst, ob ein Passwort erforderlich ist, und fordern Schlüsselbundzugriff nur für diese geschützte Freigabe an; dabei werden der Zugriffszweck der Freigabe und ihre Kennung im Dialog angezeigt.

## Schlüsselbundzugriff nur bei Bedarf anfordern

Der Schlüsselbund-Beitrag in den Einstellungen plant beim Rendern keine Entsperranfrage mehr ein. Dadurch kann das Laden des Dashboards oder die Navigation zwischen Seiten keine allgemeine Abfrage auslösen. Passwortdialoge für geschützte Freigaben bieten die Speicherung im Schlüsselbund nur noch an, nachdem eine kontextbezogene Entsperrung erfolgreich war.

## Hintergrundarbeit und blockierte Anfragen begrenzen

Die Verfügbarkeitssynchronisierung pausiert nun in ausgeblendeten Tabs und fasst überlappende Aktualisierungs- und Heartbeat-Anfragen zusammen. Node und Nginx beenden blockierte HTTP-Arbeit, PostgreSQL verwendet ein endliches Anweisungszeitlimit und MariaDB begrenzt die Warteschlange für Abfragen, damit eine fehlerhafte Abhängigkeit nicht so lange Arbeit ansammelt, bis Seite oder Dienst nicht mehr reagieren.

## Präsenzverkehr bei inaktiven Seiten stoppen

Präsenz-Tracker reduzieren ihre Häufigkeit nun adaptiv und stoppen alle wiederkehrenden Anfragen, sobald der Benutzer inaktiv wird, das Fenster den Fokus verliert oder der Tab ausgeblendet ist. Whiteboard-Composer binden die Bereinigung an ihr eigenes Navigationssignal, sodass SPA-Navigation Präsenz-, Zeiger-, Zeichenflächen- und Echtzeit-Hooks sofort entfernt, ohne eine spätere Einbindung zu beeinflussen.

## Eigentümerzugriff ohne Passwort und ausstehende Browseranfragen begrenzen

Der authentifizierte Eigentümer einer kontogebundenen Benutzerfreigabe kann seine eigene Freigabe nun ohne erneute Eingabe des Empfängerpassworts auflösen; maßgeblich bleibt das Token des Eigentümerkontos, statt das Passwort in den Schlüsselbund zu kopieren. Browser-API- und Lokalisierungsanfragen haben nun endliche Fristen, gleichzeitige Lokalisierungs- und Präsenzanfragen werden zusammengefasst und die Navigationsbereinigung bricht verbleibende Präsenzanfragen ab.

## Aktiven Whiteboard-Präsenzverkehr reduzieren

Aktive Präsenzaktualisierungen laufen nun höchstens alle 2,5 Sekunden und Heartbeat-Schreibvorgänge höchstens alle 10 Sekunden; ohne Änderungen verlangsamen sich beide auf 30 Sekunden. Zeigeraktualisierungen sind auf eine pro Sekunde begrenzt und serverseitige Zeitstempel der letzten Aktivität gelten nicht mehr als bedeutsame UI-Änderungen, die adaptives Polling dauerhaft auf Höchstgeschwindigkeit halten.

## Bestehende und geschützte Kontofreigaben abgesichert

Bestehende Freigaben werden bei Upgrades in die Ressourcenregistrierung übernommen. Passwortgeschützte Kontofreigaben erfordern nun vor dem Anbieterzugriff eine dauerhafte serverseitige Entsperrung, entfernte Ablaufdaten bleiben entfernt und die Widerrufsabfrage endet nach der Navigation.

## Geteilte Kalender und aktive Meeting-Links wiederhergestellt

Benutzerkalenderfreigaben werden sofort in den Kalender der empfangenden Person übertragen und über das vom Anbieter verwaltete Ziel aufgelöst. Aktive über Links geteilte Meetings übernehmen keinen veralteten Beendet-Status mehr und Versionszusammenfassungen bleiben während Gastsitzungen verborgen.

## Steuerelemente geteilter Kalender und Gastzusammenfassungen stabilisiert

Ansichts- und Zeitraumsteuerungen geteilter Kalender verwenden nun einen einzigen Listener für den Seitenlebenszyklus, der jedes erneute Composer-Rendering übersteht. Anmeldungen mit Gastrolle werden neben begrenzten Freigabegästen erkannt, wodurch Versionszusammenfassungen und reine Kontoanfragen verhindert werden.

## Gast-Erkennung und Eingaben geteilter Kalender verbindlich gemacht

Steuerelemente geteilter Kalender lauschen nun an der Dokument-Capture-Grenze und akzeptieren nur Klicks aus ihrem eingebundenen Kalender, sodass Composer- oder Shell-Handler die Navigation nicht zuerst verbrauchen. Die Gast-Erkennung berücksichtigt begrenzte Sitzungen, synthetische Freigabekonten und Gast-/Freigabeanbieter, bevor Versionszusammenfassungen oder Anwesenheitsanfragen starten.

## Gastfreigabe-Shells vom Kontostart isoliert

Öffentliche Freigabe- und geteilte Kalender-Composer deaktivieren nun ausdrücklich reine Kontoerweiterungen der Shell. Dadurch starten keine Änderungsprotokoll-, Profil-, Anwesenheits- oder Passwortprüfungsanfragen, bevor die Gastauthentifizierung feststeht. Die Navigation bei Widerruf verwendet die Router-Fähigkeit statt eines anfälligen Laufzeitimports und greift nur ohne eingebundenen Router direkt auf die Freigabe-URL zurück.

## Widerrufene Freigaben und Gaststeuerung klargestellt

Das Löschen einer eigenen Freigabe bestätigt nun „Freigabe gelöscht“, während Empfangende beim Entfernen des Zugriffs eine eigene Meldung erhalten. Widerrufene geteilte Kalender öffnen beim Auswählen ihren Entfernen-Dialog, schreibgeschützte Whiteboards verwenden einen Zeiger und die Seitenlayout-Bearbeitung bleibt für Freigabegäste immer verborgen.
