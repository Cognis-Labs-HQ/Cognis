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

## Meeting-Gastsitzungen bei Seitenwechseln erhalten

Page Composer beendet nun den Anwesenheits-Tracker der vorherigen Seite auch dann, wenn das Ziel keine Anwesenheitskonfiguration hat. Dadurch widerrufen veraltete Whiteboard-Anfragen keine Meeting-Gastsitzung mehr. Soziale Anwesenheit und die Bereinigung der Passwortbestätigung lösen für Gäste keine globalen Zugriff-verweigert-Ereignisse mehr aus, und Meetings unterscheiden Zugriffsfehler von tatsächlich beendeten Meetings.

## Meeting-Deep-Links direkt geöffnet

Die Meetings-Seite löst nun jede `meetingId`-URL direkt auf, stellt die Teilnehmerauswahl aus den Meeting-Daten wieder her und tritt automatisch bei, ohne dass das Meeting zuerst in der Liste aktiver Meetings erscheinen muss. Über Shares geöffnete Meeting-Ziele führen dadurch zum referenzierten Meeting.

## Begrenzte Zugangsdaten für geteilte Ziele verwendet

Meeting-Linkfreigaben senden beim Laden des Meetings nun ausdrücklich ihre aufgelösten Gastzugangsdaten und vermeiden Konflikte mit Konto- oder vorherigen Freigabetokens. Passwortgeschützte Benutzerfreigaben verwenden ihre bekannten Schutzmetadaten, um den Entsperrvorgang direkt zu öffnen, statt absichtlich eine erste nicht autorisierte Anfrage auszulösen.

## Gastlayouts sperren und Whiteboard-Markierungen sichtbar halten

Gastsitzungen entfernen nun die Schaltfläche zum Bearbeiten des Seitenlayouts, anstatt sich auf eine verspätete Funktionsprüfung zu verlassen. Whiteboard-Flächen wählen außerdem kontrastreiche Striche, Auswahlbeschriftungen und Anwesenheitsschattierungen für helle und dunkle Designs, sodass Markierungen und Mitwirkende nach einem Designwechsel sichtbar bleiben.

## Meeting-Direktlinks wiederherstellen und Whiteboard-Tastaturverlauf ergänzen

Meeting-URLs laden nun ihre gespeicherte Teilnehmerbühne, berücksichtigen vor dem automatischen Start die ausdrückliche Option `start=1` und entfernen ungültige Meeting-Kennungen nach einer Benachrichtigung. Meeting-Freigabelinks fordern den automatischen Start an und lösen die Share-Berechtigung zur Anfragezeit auf, während Whiteboard die Verlaufskürzel Strg/Befehl+Z und Strg/Befehl+Y unterstützt.

## Meeting-Wiederherstellung vereinfachen und Gastfreigabe-Steuerelemente stabilisieren

Gespeicherte Meeting-Links stellen Eingeladene nun über die normale Teilnehmerbühne wieder her, schließen den aktuellen Benutzer aus und starten nur dann automatisch, wenn `start=1` ausdrücklich vorhanden ist. Die Meeting-Gastautorisierung nutzt den Vertrag des Share-Gateways, Kalendersteuerungen werden direkt an ihre eingebundene Seite gebunden, die Kontoanwesenheit pausiert sofort auf Share-Routen und geschützte Gastlinks zeigen das Cognis-Branding in der Passwortabfrage.

## Share-Branding angleichen und Meeting-Gastzugriff vervollständigen

Die Abfrage für geschützte Freigaben entspricht nun exakt der kompakten Cognis-Kopfzeilenmarke und das anfängliche Share-Dokument besitzt einen aufgelösten Titel. Inhalts-URLs für Meeting-Freigaben fordern den Startmodus ausdrücklich an, Gast-Chat-Lese- und Sendevorgänge verwenden die begrenzten Zugangsdaten, Jitsi löst Gastzugriff über Share auf und Freigabeeigentümer umgehen Passwortabfragen, die nur für Empfänger gelten.

## Ältere Meeting-Links wiederherstellen und Kalendersteuerungen je Darstellung binden

Die Meeting-Gastautorisierung bleibt nun mit älteren Meeting-Links kompatibel, deren Datensätze noch keine ausdrücklichen Berechtigungsbereiche enthalten, wobei das Token weiterhin zum angeforderten Meeting passen muss. Freigegebene Kalendersteuerungen werden nach jeder Composer-Aktualisierung an die neu dargestellte Kalenderkarte gebunden, damit Ansichts- und Zeitraumwechsel interaktiv bleiben.

## Share-Routen zusammenführen und Aktivität gesendeter Freigaben erweitern

Die Freigabeverwaltung befindet sich nun unter `/share`, während öffentliche und kontogebundene Freigaben URLs unter `/share/shr_…` und `/share/usr_…` verwenden. Linkfreigabe-Zeilen bieten eine Kopieraktion, gesendete Zeilen erweitern sich zu Zeitstempel- und Empfängeransichten und Symbole für destruktive Aktionen sind einheitlich zentriert.

## SPA-Avatarressourcen gültig halten

Die Wiederverwendung der Dashboard-Shell widerruft beim Ersetzen des Navigationsleisten-Avatars keine Blob-URLs des Profilanbieters mehr. Zwischengespeicherte Avatar-URLs bleiben dadurch bei späteren SPA-Navigationen einschließlich der Study-Einstellungen ladbar, während ihr Anbieter die Lebenszykluskontrolle behält.

## Geteilte Kalender und Meeting-Beitritte wiederherstellen

Die Kalenderseite fordert nun beim Laden empfangener Kalender deren Entsperrung über den Schlüsselbund an. Gast-Kalendersteuerungen ersetzen außerdem die gerenderte Ansicht, anstatt veraltetes DOM beizubehalten. Gäste von Meeting-Links übermitteln ihre begrenzte Freigabeberechtigung nun auch an die abschließende Beitrittsanfrage, damit der Beitrittsvorgang abgeschlossen wird.

## Freigegebene Kalendersteuerung aktiv halten

Öffentliche Kalender verwenden nun eine einzige delegierte Interaktionsgrenze auf Seitenebene. Das Umschalten zwischen Tag, Woche, Monat und Jahr sowie die Periodennavigation bleiben dadurch nach jedem erneuten Rendern des Kalenders verbunden.

## Freigabeinhalte direkt öffnen

Kalenderlinks öffnen nun in der Monatsansicht und behalten ihre dauerhaften Ansichts- und Periodensteuerungen. Meetinglinks treten nun sofort dem freigegebenen Meeting bei, anstatt den fehlenden `start`-Abfrageparameter der Kontoseite als Anweisung zu verstehen, nicht beizutreten.

## Gast-Meetings ohne Karten beitreten

Gäste von Meetinglinks können nun einem freigegebenen Meeting beitreten, auch wenn die eingeschränkte Antwort absichtlich keine Teilnehmerkarten enthält. Die Steuerung freigegebener Kalender aktualisiert nun direkt die bestehende Ansicht, sodass das Steuerungs-DOM beim Wechsel von Ansicht und Zeitraum stabil bleibt.

## Freigabeaktivität im Zeitverlauf darstellen

Die Details jeder Freigabe vereinen nun Erstellungs-, Aktualisierungs- und Zugriffsaktivitäten in einem responsiven Punktdiagramm. Die Achsen für Ereignisanzahl und Zeitleiste passen sich dem verfügbaren Verlauf an; beim Darüberfahren oder Fokussieren eines Punkts erscheinen Ereignis und Zeitstempel.

## Vollständigen Freigabezugriffsverlauf erkunden

Jeder erfolgreiche Freigabezugriff wird nun in der einheitlichen Aktivitätszeitleiste gespeichert. Diagramme verwenden Zeitangaben für Zeiträume bis zu zwei Tagen und Datumsangaben für längere Verläufe, unterstützen die Bereichsauswahl durch Ziehen und nutzen die gesamte Detailbreite oberhalb der Empfängerliste.

## Diagrammbereiche und Kontositzungen bewahren

Aktivitätsdiagramme zeigen für kurze Verläufe nun Zeitangaben mit Sekunden und zeichnen nach einer Ziehauswahl exakt den gewählten Bereich neu. Vorhandene Freigabezeitstempel bilden den vollständigen Diagrammbereich, während der Besuch von `/share` die Kontositzung wiederherstellt, statt eine Gastsitzung weiterzuverwenden; die Gastaktivierung ist auf gültige öffentliche Link-Token beschränkt.

## Konten vor der Validierung wiederherstellen

Wenn `/share` nach einem Gastlink geladen wird, stellt das Share-Gateway die gespeicherten Kontoanmeldedaten nun wieder her, bevor das Authentication-Gateway die Browsersitzung prüft. Das Dashboard löst dadurch direkt das tatsächliche Konto auf, statt das eingeschränkte Gast-Token beizubehalten oder vorübergehend aufzulösen.

## Diagrammauswahl und Datumsangaben ausrichten

Die Ziehauswahl im Diagramm folgt dem Mauszeiger nun über die SVG-Koordinatentransformation und entfernt ihre Hervorhebung stets beim Loslassen oder Abbrechen. Leere Zeiträume zeigen eine Warnmeldung; kurze Zeitachsen enthalten das gemeinsame Datum oder getrennte Datumsangaben, wenn die Endpunkte eine Tagesgrenze überschreiten.

## Diagramme verallgemeinern und Konten bewahren

Der wiederverwendbare Diagramm-Renderer unterstützt nun Punkt- und Liniendarstellungen, nutzt die gesamte responsive Breite und zählt die Ereignishäufigkeit je Typ und Zeitstempel, statt sie dauerhaft aufzusummieren. Die Gastaktivierung sichert nun alle gefundenen echten Kontoanmeldedaten, auch bei veraltetem Gaststatus, sodass die Rückkehr zu `/share` den Benutzer wiederherstellt, anstatt ihn abzumelden.

## Gültige Sitzungen und kompakte Diagramme bewahren

Der Authentifizierungs-Hook der Freigabeseite unterscheidet nun veraltete Gastmarkierungen von einem aktiven eingeschränkten Gast-Token und entfernt nur die veralteten Markierungen, wenn bereits gültige Kontoanmeldedaten vorliegen. Aktivitätsdiagramme verwenden ein niedrigeres, breiteres Seitenverhältnis und bleiben dadurch lesbar, ohne die erweiterten Freigabedetails zu dominieren.

## Freigabeverwaltung von Links trennen

Die authentifizierte Freigabeverwaltung befindet sich wieder unter `/shares`, während `/share/usr_…` und `/share/shr_…` die Zustellungsnamensräume für Konto- und öffentliche Linkfreigaben bleiben. Gültige Kontoanmeldedaten werden vor einem Rückgriff auf öffentliche Links geprüft, sodass Eigentümer beim Öffnen eigener Linkfreigaben ihre Benutzersitzung behalten und nicht zu Gästen werden. Das Verwaltungsdokument lädt die Gastsitzungs-Initialisierung überhaupt nicht mehr.

## Tooltips für Zugriffsereignisse verdeutlichen

Jeder Zugriffspunkt im erweiterten Aktivitätsdiagramm einer Freigabe heißt nun „Aufgerufen“ statt „Zuletzt aufgerufen“, da das Diagramm den vollständigen Zugriffsverlauf und nicht nur das neueste Ereignis anzeigt.

## Chat für Gäste von Besprechungslinks entsperrt halten

Gäste eines Besprechungslinks erhalten den Chatraumschlüssel nun über ihre begrenzte Freigabeberechtigung, ohne die einmalige Schlüsselzustellung eines Kontomitglieds zu verbrauchen. Der Schlüssel wird im bereits entsperrten temporären Schlüsselbund des Gastes gespeichert, sodass beim Laden des Besprechungschats keine wiederholten Entsperr- oder leeren Raumschlüssel-Popups mehr erscheinen.

## Besprechungen vor dem Einladen von Teilnehmern starten

Besprechungen können nun mit einer leeren Teilnehmerbühne gestartet werden. Sobald der Organisator der neu erstellten Konferenz tatsächlich beitritt, öffnet Cognis automatisch ein ausschließlich für Links bestimmtes Freigabe-Popup als Aufforderung, einen Gastlink zu erstellen; redundante Freigabemethoden für Kontobenutzer werden in diesem Besprechungs-Popup nicht angeboten.

## Konto-Kalender- und Gast-Besprechungsfreigaben vervollständigen

Das Freigabe-Popup für Besprechungen öffnet sich nun nur bei neu gestarteten Besprechungen mit leerer Teilnehmerbühne. Gäste über Besprechungslinks erhalten während der Aktivierung ihres temporären Schlüsselbunds keine Aufforderung für ein Kontoschlüsselbund-Passwort; ihr berechtigter Besprechungschat liefert Teilnehmernamen und Avatare, ohne die vollständige Teilnehmerauswahl offenzulegen. Für Benutzer freigegebene Kalender berücksichtigen beim Laden aktueller Eigentümertermine nun die serverseitige Konto-Entsperrfreigabe des Share-Gateways, auch bei passwortgeschützten Freigaben.
