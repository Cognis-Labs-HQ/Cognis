# Mit Cognis-Benutzern teilen

## Das Teilen-Popup unterstützt jetzt Benutzer als Empfänger

Cognis-Benutzer können im gemeinsamen Popup gesucht und mit Lesezugriff zu einer neuen Freigabe hinzugefügt werden. Empfänger bestehender Freigaben lassen sich dort prüfen und entfernen. Sämtliche Empfängersuchen und Freigabeänderungen laufen über das Share-Gateway.

## Link und Benutzer sind jetzt Share-Gateway-Adapter

Das Popup zeigt unterstützte Methoden in einer oberen Leiste und öffnet für Link- oder Benutzerfreigaben eine eigene, methodenspezifische Seite. Bestehende Freigaben werden nach der ausgewählten Methode gefiltert, während beide Typen für dieselbe Ressource gleichzeitig bestehen können.

## Jede Freigabemethode zeigt eigene Steuerelemente

Die Linkfreigabe zeigt Einstellungen für Linkbezeichnung und Ablaufzeit, während die Benutzerfreigabe Empfängersuche, Lese-/Schreibberechtigung und Ablaufzeit anbietet. Beim Methodenwechsel wird außerdem nur der Verlauf dieses Freigabetyps angezeigt.

## Seiten der Freigabemethoden werden jetzt korrekt geladen

Das Share-Gateway registriert nun das statische Verzeichnis jedes erkannten Adapters, sodass die Popup-Seiten für Link und Benutzer ohne 404-Antwort geladen werden.

## Der Methodenwechsel ersetzt jetzt die Seite

Das Popup bindet nur noch die Seite des ausgewählten Adapters ein. Bei Benutzerfreigaben sind keine Linkfelder vorhanden; beim Erstellen eines Links fehlen Benutzersuche und Berechtigungsfelder vollständig.

## Freigaben unterstützen genaue Ablaufzeiten, Zugriffsarten und Passwörter

Link- und Benutzerseiten verwenden nun eine optionale Datum-/Uhrzeitauswahl für den Ablauf sowie optionalen Passwortschutz. Komponenten können außerdem Link-Zugriffsarten festlegen, sodass der Kalender schreibgeschützte von beschreibbaren Links unterscheidet und nur die passenden Fähigkeiten gewährt.

## Erkennung geschützter Kalender

Kalender-Clients erhalten nun beim Prüfen einer gültigen passwortgeschützten Kalenderfreigabe eine Authentifizierungsaufforderung statt einer nicht unterscheidbaren Nicht-gefunden-Antwort.

## Sichere Token-Prüfung

Share kann die Existenz und Gültigkeit eines Tokens prüfen, ohne dessen Passwort zu umgehen. Dadurch kann Calendar Anmeldedaten anfordern, bevor freigegebene Inhalte zurückgegeben werden.

## Eindeutige Client-Metadaten

Kalenderfeeds veröffentlichen nun Kalendername sowie Lese- oder Schreibstatus. Die CalDAV-Erkennung behält dabei die authentifizierte Freigabeadresse bei.

## CalDAV-Freigaben mit Schreibrecht

Kalender-Clients können über beschreibbare Linkfreigaben und authentifizierte Benutzerfreigaben Termine erstellen, bearbeiten und löschen. Schreibgeschützte Freigaben lehnen Änderungen weiterhin ab.

## Einheitliche Pflichtfelder

Passwörter für private Freigaben verwenden nun die übliche Pflichtfeldmarkierung und native Formularprüfung ohne getrennte Warnmeldungen.

## Benannte ICS-Ressourcen

ICS-Varianten enden nun mit dem kodierten aktuellen Kalendernamen und `.ics`. Ältere Adressen, die nur ein Token enthalten, leiten nach der Authentifizierung zur benannten Ressource weiter, damit Import-Clients den richtigen Kalendernamen ableiten.

## Erzwungener Schreibschutz

Schreibgeschützte ICS- und CalDAV-Freigaben lehnen jede verändernde WebDAV-Methode mit `403` und einer `DAV:need-privileges`-Antwort ab. Beschreibbare CalDAV-Freigaben akzeptieren weiterhin unterstützte Terminänderungen.

## Aktualisierte Kalendersymbole

Öffentliche Kalender verwenden nun ein themenabhängiges Globus-SVG, und das Freigabesymbol ist zur besseren Erkennbarkeit zehn Prozent größer.

## Sichereres Löschen von Kalendern

Die Löschaktion befindet sich nun bei den anderen Popup-Aktionen und erfordert eine Bestätigung, bevor der Kalender und seine zugehörigen Freigaben entfernt werden.

## Themenabhängige Sichtbarkeit

Schreibgeschützte freigegebene Kalender verwenden nun ein Augensymbol mit dem Hinweis „Schreibgeschützt“, während private Kalender ein Sicherheitsschloss anzeigen. Beide Symbole besitzen eigene Varianten für das helle und dunkle Design.

## Authentifizierung bleibt erforderlich

Passwortgeschützte ICS- und CalDAV-Adressen enthalten keine abgeleiteten Zugangsdaten mehr. Kalender-Clients müssen sich mit dem festgelegten Freigabepasswort anmelden, bevor Kalenderdaten übertragen werden.

## Standardbasierte Berechtigungen

Die CalDAV-Erkennung veröffentlicht nun die in RFCs definierten aktuellen Benutzerrechte und den unterstützten VEVENT-Komponentensatz. ICS-WebDAV-Abfragen melden schreibgeschützte Rechte, da Abonnementfeeds keine Schreibzugriffe unterstützen.

## Kalendername in der Adresse

CalDAV-Varianten enthalten den kodierten Kalendernamen, sodass Clients einen verständlichen Namen aus der Sammlungsadresse ableiten können, ohne Anmeldedaten offenzulegen.

## Klare Kalenderzuständigkeit

Freigegebene Kalender verwenden nun ein themenabhängiges Freigabesymbol. Beim Löschen eines eigenen Kalenders werden Links, Benutzerfreigaben und Empfängerkopien entfernt; Standardkalender bleiben geschützt. Empfänger können einen erhaltenen Kalender löschen, um nur ihren Empfängereintrag zu entfernen. Wenn der letzte Empfänger die Freigabe verlässt, wird sie gelöscht.

## Kalendername in Freigaben

Kalenderfreigaben behalten nun den Kalendernamen, damit Links und E-Mails den Kalender statt einer internen Freigabekennung nennen.

## Zugriffsrechte für Clients

CalDAV-Clients erhalten eindeutige Lese- oder Schreibrechte und vermeiden Schreibversuche bei schreibgeschützten Freigaben.

## Sicheres privates Teilen

Private Kalender benötigen ein Freigabepasswort. Freigabe-E-Mails enthalten Absender, Kalendername, sichtbaren Link und eine Schaltfläche zum Öffnen.

## Zuverlässige Web-Kalenderfreigaben

Web-Kalenderfreigaben beenden den Ladevorgang zuverlässig, zeigen Gastinhalte und erzwingen Lese- oder Schreibrechte bei Terminaktionen.

## Klare Kalenderzugriffsmodi

Web-, ICS- und CalDAV-Varianten zeigen ihren Nur-Lese- oder Lese-und-Schreibmodus, und Kalenderantworten teilen Programmen den wirksamen Zugriffsmodus mit.

## Bearbeitbarer Freigabeverlauf

Die Auswahl einer Freigabe stellt ihre Werte im passenden Adapterformular wieder her und aktualisiert den bestehenden Eintrag. Linkfreigaben bieten den E-Mail-Versand mit Vorlagen, während Personenauswahlen Profilvorschaukarten ohne sichtbare Benutzernamen behalten.

## Aktuelle Kalendernamen

Kalender-Client-Adressen beziehen ihren Sammlungsnamen nun aus dem aktuellen Datensatz des Calendar-Gateways. Freigabemetadaten werden nur verwendet, wenn die aktuelle Ressource nicht verfügbar ist.

## Schreibgeschützte Benutzerfreigaben

Der Adapter für Benutzerfreigaben entfernt Schreibrechte, sobald die Berechtigung Lesen ausgewählt ist. Die CalDAV-Erkennung meldet dadurch nur Leserechte und Kalender-Clients deaktivieren die Bearbeitung.

## Doppelte Benutzerfreigaben werden verhindert

Ein Objekt kann nicht mehrfach mit demselben Benutzer geteilt werden, auch wenn ein anderer Zugriffsmodus gewählt oder eine vorhandene Freigabe auf diesen Benutzer geändert wird.

## Schreibgeschützte Kalender sind eindeutiger

Schreibgeschützte geteilte Kalender zeigen in der Kalenderliste ein Schloss und werden nicht als Ziel im Ereigniseditor angeboten. Der Hinweis für geteilte Kalender stellt nun ausdrücklich klar, dass Empfänger den Kalendernamen nicht bearbeiten können.

## Direkter SMTP-Versand

Allgemeine E-Mail-Anfragen mit Vorlagen verwenden jetzt direkt den aktivierten SMTP-Sender, statt von Einstellungen für Benachrichtigungskategorien abzuhängen. Dadurch werden gültige Freigabe-E-Mails nicht mehr übersprungen.

## Klare Versandprüfung

Der Bestätigungsbutton im E-Mail-Dialog heißt jetzt Senden und zeigt eine Warnmeldung, wenn keine Empfänger hinzugefügt wurden.

## Vorlagen aus Komponenten

Komponenten können jetzt E-Mail-Vorlagen über die Fähigkeit des Benachrichtigungs-Gateways registrieren und diese Vorlagen beim Versand auswählen.

## Anbieterneutrales SMTP

Der SMTP-Adapter bietet nur noch allgemeinen vorlagenbasierten E-Mail-Versand und kennt weder Begriffe noch Nachrichteninhalte von Share. Share besitzt und registriert seine eigene E-Mail-Vorlage.

## Sofortige Verlaufsaktualisierung

Neue Freigaben erscheinen im Linkverlauf, sobald das Share-Gateway die Erstellung bestätigt, ohne dass im Kalendereditor Änderungen gespeichert werden müssen.

## Zuverlässige Verlaufsaktualisierung

Fehlgeschlagene Verlaufsanfragen ersetzen die sichtbare Liste nicht mehr durch ein leeres Ergebnis, sodass bestätigte Freigaben während der erneuten Synchronisierung verfügbar bleiben.

## Private Freigaben erklären die Passwortpflicht

Private Kalender-Linkfreigaben verwenden nun die einheitliche Informationsblase, um zu erklären, warum ein Passwort erforderlich ist.

## Sichere Passwörter lassen sich direkt erzeugen

Eine Aktualisieren-Schaltfläche neben dem Passwortfeld erzeugt ein sicheres, gut lesbares Freigabepasswort, ohne das Formular zu verlassen.

## Kalender-Freigabeadressen sind eindeutig

Neue ICS- und CalDAV-Links enthalten den Kalendernamen direkt und verwenden keine Kompatibilitätsrouten mehr, die nur aus einem Token bestehen.

## Eigene Freigabe-E-Mails

Linkfreigaben können jetzt mehrere markierte Empfänger über den SMTP-Benachrichtigungsdienst mit einer eigenen Freigabenachricht und Aktionsschaltfläche erreichen. Pro Absender und Empfänger ist der Versand auf einmal innerhalb von 12 Stunden begrenzt.

## Interaktive Kalenderfreigaben

Die Web-Variante zeigt jetzt einen einzelnen Gastkalender und erlaubt das Erstellen von Terminen nur bei erteilter Schreibberechtigung.

## Verständlichere Personenfreigabe

Suchergebnisse stehen direkt unter dem Suchfeld, ausgewählte Personen behalten ihre vollständige Profilkarte und leere Personenfreigaben verweisen nicht mehr auf Kalenderprogramm-Links.

## Eigenständiger E-Mail-Dialog

Die E-Mail-Aktion steht jetzt unter der Überschrift jeder Linkfreigabe und öffnet einen eigenen Empfängerdialog, ohne das Freigabeformular in den Bearbeitungsmodus zu versetzen.

## Bearbeitung einfach abbrechen

Formulare zum Aktualisieren von Link- und Personenfreigaben besitzen jetzt eine Schließen-Aktion, die wiederhergestellte Werte löscht und sofort zum Erstellmodus zurückkehrt.

## Einfachere Variantenbezeichnungen

Kalendervarianten verwenden kurze Bezeichnungen für Web, ICS und CalDAV, während Kalenderprogramme die Zugriffsregeln weiterhin über Antwortmetadaten erhalten.

## Widerruf und Ablauf

Bereitgestellte Objekte aus Benutzerfreigaben werden entfernt, wenn die Freigabe widerrufen wird oder abläuft. Spätere Schreibzugriffe werden abgelehnt, weil die Empfängerzuordnung nicht mehr aktiv ist.

## Kalenderverhalten

Berechtigungskennzeichen folgen vor dem Erstellen dem ausgewählten Zugriffsmodus. Namen freigegebener Kalender erlauben einen lokalen Namen mit 30 Zeichen; der unveränderliche Hinweis auf den Freigebenden bleibt erhalten. Antworten auf bereits im freigegebenen Kalender gespeicherte Termine aktualisieren den globalen Termin, statt ein Duplikat zu importieren.

## Freigabeaktionen laden die vollständige Freigabeseite

Beim Öffnen einer Freigabebenachrichtigung wird für die Aktion unter `/share/…` nun die vollständige Seite geladen. Dadurch installiert die Freigabeseite ihre Authentifizierungs-, Passwort-Schlüsselbund- und Darstellungsfunktionen, statt vom Dashboard-SPA-Router ignoriert zu werden.

## Freigabepasswörter können direkt versendet werden

Nach dem Erstellen einer passwortgeschützten Link- oder Benutzerfreigabe zeigt ein Dialog das Passwort in einem verdeckten Feld mit der einheitlichen Einblenden-Funktion und einer Kopieraktion an.

## Freigabehistorie zeigt Erstellzeit und Formularbearbeitung

Jede Freigabekarte zeigt ihren Erstellzeitpunkt. Beim Auswählen einer Benutzerfreigabe werden Empfänger, Berechtigung, Ablaufzeit und weitere Werte zum gezielten Aktualisieren in das Freigabeformular geladen, statt Bearbeitungsfelder in der Verlaufskarte anzubieten.

## Benutzeranzahl und Benachrichtigungsaktionen funktionieren zuverlässig

Die Aktion für Benutzerfreigaben aktualisiert ihre Empfängeranzahl beim Hinzufügen oder Entfernen von Personen. Beim Öffnen einer internen Freigabebenachrichtigung kann diese nun über die eindeutige Posteingangsroute als gelesen markiert werden.

## Geschützte Freigaben fragen nach dem Passwort statt als fehlend zu erscheinen

Das Freigabe-Gateway unterscheidet nun ein gültiges passwortgeschütztes Token von einem ungültigen Token. Die Freigabeseite erhält eine Authentifizierungsanforderung, prüft den verschlüsselten Schlüsselbund, fragt bei Bedarf nach, speichert das bestätigte Passwort und lädt anschließend das freigegebene Objekt.

## Der Zugriff über Benachrichtigungen ersetzt den Anmeldestatus nicht mehr

Angemeldete Empfänger behalten beim Öffnen einer Freigabebenachrichtigung ihr Konto-Token. Ein getrenntes, eingeschränktes Freigabe-Token wird für gemeinsame API-Aktionen direkt an Komponenten übergeben, sodass Kalenderänderungen berechtigungsgesteuert bleiben, ohne den Benutzer abzumelden.

## Kalenderfarbe bleibt lokal

Empfänger können die Farbe eines geteilten Kalenders ändern, ohne den Kalender des Eigentümers zu verändern. Name, Freigabeeinstellungen und Löschen bleiben unter Kontrolle des Eigentümers.

## Ereignisrechte sind eindeutig

Schreibgeschützte Kalender zeigen keinen allgemeinen Bearbeitungsfehler mehr. Empfänger mit Schreibrecht können Ereignisse erstellen, ändern und löschen, aber über den geteilten Kalender keine Einladungen beantworten oder Teilnehmerantworten verändern.

## Freigabepasswörter bleiben verfügbar

Wenn der verschlüsselte Schlüsselbund gesperrt ist, bleibt ein neu bestätigtes Freigabepasswort sicher im Arbeitsspeicher der aktiven Sitzung, statt einen Speicherfehler auszulösen.

## SMTP-Sicherheitsdetails öffnen zuverlässig

Konfigurierte SMTP-Zwei-Faktor-Methoden können ihr Verwaltungsfenster öffnen, auch wenn keine anzeigbaren geheimen Details gespeichert sind.

## Einstufige Client-Authentifizierung

Passwortgeschützte Kalender-Client-Varianten enthalten nun einen begrenzten, reproduzierbaren Transportnachweis, sodass Clients keine zweite Passwortabfrage anzeigen müssen.

## Erkennbare Kalenderidentität

CalDAV-Sammlungsadressen enthalten den Kalendernamen. Die Erkennung veröffentlicht weiterhin Anzeigename und wirksame Lese- oder Schreibrechte.

## Passwortschutz bleibt erhalten

Der Transportnachweis wird aus der geschützten Freigabe abgeleitet und legt das gewählte Freigabepasswort nicht offen. Direkte Passwortanmeldung bleibt unterstützt.

## Freigaben auf der Seite entsperren

Benachrichtigungen zu Benutzerfreigaben öffnen die Passwortabfrage jetzt im angemeldeten Dashboard und verwenden ein gespeichertes Schlüsselbund-Passwort, ohne die öffentliche Freigabeseite zu öffnen.

## Geteilte Kalender im Empfängerkonto

Nach erfolgreicher Autorisierung fügt Calendar den geteilten Kalender dem Konto des Empfängers hinzu und öffnet ihn direkt. Calendar erzwingt weiterhin den Lese- oder Schreibzugriff und synchronisiert die Inhalte.

## Benutzerfreigaben benachrichtigen Empfänger

Beim Freigeben eines Elements für Cognis-Benutzer wird nun eine Benachrichtigung der Kategorie „Freigabe“ gemäß den Benachrichtigungseinstellungen jedes Empfängers gesendet. Die Benachrichtigung öffnet das freigegebene Element direkt.

## Passwörter bleiben im Schlüsselbund verschlüsselt

Passwortgeschützte Benutzerfreigaben fordern Empfänger einmalig zum Entsperren auf und speichern das bestätigte Passwort in einem Browser-Schlüsselbund, der mit dem Anmeldepasswort verschlüsselt wird. Komponenten greifen über benannte Schlüsselbund-Fähigkeiten statt über Klartextspeicher auf Einträge zu.

## Erneutes Sperren ist konfigurierbar

In den Sicherheitseinstellungen kann der Schlüsselbund bis zur Abmeldung geöffnet bleiben oder nach einer gewählten Zeit automatisch gesperrt werden. Lese- und Schreibrechte steuern weiterhin die freigegebenen Komponentendaten.

## Interne Pakete werden lokal installiert

Alle Obergrenzen für interne Cognis-Abhängigkeiten schließen nun die in diesem Repository vorhandenen Versionen ein. Dadurch versucht npm nicht mehr, private Workspace-Pakete aus der öffentlichen Registry herunterzuladen.

## Versionsänderungen bleiben atomar

Die Beitragsrichtlinien verlangen nun, Versionen, Manifeste, Abhängigkeitsspezifikationen, die Sperrdatei und alle übersetzten Versionsverzeichnisse gemeinsam zu aktualisieren und zu prüfen.

## Kalenderfähige Linkvarianten

Kalenderfreigaben bieten jetzt Web-, ICS- und CalDAV-Varianten mit demselben Token des Share-Gateways, damit Browser und Kalenderprogramme das erwartete Format erhalten.

## Korrekturen am Freigabefenster

Das Widerrufen von Kalenderfreigaben wird korrekt autorisiert, das Freigabefenster blockiert den Kalendereditor nicht mehr und die Benutzersuche zeigt verknüpfte Profilbilder.

## Geteilte Ereignisse bleiben bevorstehend

Ereignisse aus empfangenen Kalendern bleiben nun unter „Bevorstehende Ereignisse“ sichtbar, Überschriften im Seitenmenü sind zentriert und das Kalenderlayout kann nicht mehr über die Seitenkomposition verändert werden.

## Ein synchronisierter Benutzerschlüsselbund

Der verschlüsselte Browser-Schlüsselbund synchronisiert nur undurchsichtigen Chiffretext über authentifizierte Schlüsselbund-Endpunkte. In den Benutzereinstellungen können Geheimnisse nach ausdrücklicher Passwortbestätigung hinzugefügt, bearbeitet und entfernt werden.

## Besprechungen und Chats nutzen den Schlüsselbund

Erzeugte Besprechungspasswörter und Chat-Verschlüsselungsschlüssel werden automatisch im Schlüsselbund abgelegt. Ist ein bearbeitetes Geheimnis ungültig, entfernt die Schlüsselbundauflösung es und fordert einen aktuellen Wert an oder lädt ihn erneut, damit der Zugriff erhalten bleibt.

## Schlüsselbund-Steuerung und Übersicht

Die Schlüsselbund-Einstellungsseite zeigt ihre Erklärung jetzt in einem Informationsfenster, listet gespeicherte Geheimnisse in einer übersichtlichen Tabelle auf und bietet manuelles Sperren sowie passwortgeschütztes Entsperren. Die automatische Sperre wird nun direkt beim Schlüsselbund statt auf der allgemeinen Sicherheitsseite konfiguriert.

## Passwörter privater Freigaben sind erkennbar

Bestätigte Passwörter für geschützte Kalenderfreigaben werden mit aussagekräftigen Schlüsselbund-Metadaten gespeichert und als Teil des verschlüsselten Tresors synchronisiert. Dadurch erscheinen sie in der Übersicht, ohne dass der Server Klartext erhält.

## Anbieterabhängige Passwortbestätigung

Die Passwortbestätigung gehört nun zum Authentifizierungs-Gateway und steht sensiblen Abläufen als Fähigkeit `auth:confirmPassword` zur Verfügung. Die Bestätigung wird über den aktiven Anbieter des Kontos geleitet, einschließlich separat benannter LDAP-Quellen, statt für jedes Konto einen lokalen Passworteintrag vorauszusetzen.

## Schlüsselbund folgt der Bestätigung

Das Entsperren des Schlüsselbunds verwendet nun die anbieterabhängige Passwortabfrage des Authentifizierungs-Gateways und deren normales Gültigkeitsfenster. Beim Sperren wird dieses Bestätigungsfenster ungültig, sodass die nächste Geheimnisabfrage das Kontopasswort verlangt. Die automatische Sperrzeit bleibt auch bei gesperrtem Tresor änderbar, und die Schlüsselbundseite besitzt ein großzügigeres responsives Layout.

## Einsehbare Komponenten-Geheimnisse

Schlüsselbund-Einträge nennen nun die Komponente, die sie gespeichert hat, lassen sich per Klick erweitern und bieten eine SVG-Augensteuerung zum Anzeigen des Geheimnisses. Beim Öffnen der Schlüsselbund-Einstellungen wird automatisch die anbieterabhängige Bestätigung angefordert und der Tresor nach Möglichkeit entsperrt. Gesperrte Einträge bleiben sichtbar verschleiert, und die themenfähige Sperrzeit des Schlüsselbunds bleibt mit ihrer Beschriftung gruppiert.

## Datenbankgestützte und undurchsichtige Schlüsselbund-Tresore

Verschlüsselte Schlüsselbund-Umschläge werden nun in einer eigenen Authentifizierungs-Datenbanktabelle statt im allgemeinen Einstellungsspeicher dauerhaft gespeichert. Der Browser lädt und entschlüsselt den Umschlag nur beim Entsperren; gesperrte Schlüsselbund-Einstellungen zeigen künstliche Platzhalter ohne geheime Kennungen, Metadaten oder Werte im DOM.

## Erneut geprüfter Zugriff auf geschützte Kalender

Bei jedem Laden eines passwortgeschützten Empfängerkalenders wird das Freigabepasswort nun erneut auf dem Server geprüft. Das Laden entsperrt und prüft zuerst den Schlüsselbund des Benutzers, fragt bei einem fehlenden oder ungültigen Schlüssel nach und bietet ein ausdrückliches Abwahlfeld, mit dem Empfänger das Speichern des bestätigten Passworts ablehnen können.

## Abgelehnte Geheimnisabfragen bleiben gesperrt

Das Abbrechen von Schlüsselbund- und Geheimnisabfragen lässt das geschützte Objekt nun nicht verfügbar, anstatt mit teilweisem Zugriff fortzufahren. Gesperrte freigegebene Kalender erscheinen grau mit einem erklärenden Hinweis und versuchen beim Anklicken erneut, sich zu entsperren. Sobald der Schlüsselbund entsperrt ist, können seine Funktionen zum Hinzufügen, Bearbeiten, Löschen und Anzeigen ohne wiederholte Bestätigung des Kontopassworts verwendet werden.

## Freigegebene Kalender bedeuten keine Termineinladungen mehr

Beim Erstellen eines Termins in einem Kalender mit Benutzerfreigaben werden nicht mehr alle Freigabeempfänger als Teilnehmer hinzugefügt. Empfänger können den Termin weiterhin im freigegebenen Kalender sehen, während Einladungen nur an ausdrücklich ausgewählte Teilnehmer gesendet werden. Die Schlüsselbundseite verwendet einen bereits entsperrten Tresor weiter; bei gesperrtem Tresor nutzt die Abfrage nun den eindeutigen Titel „Schlüsselbund entsperren“ und einen verzögerten Seitenaktionsablauf, damit die Navigation vor dem Popup abgeschlossen wird.

## Einstellung zum Speichern des Passworts

Die Eingabeaufforderung für geschützte Freigaben fragt nun mit einer positiven Formulierung, ob das Passwort im Schlüsselbund gespeichert werden soll. Die Option ist standardmäßig ausgewählt und kann deaktiviert werden, um das Passwort zu verwenden, ohne es zu speichern.

## Verschlüsselte Geheimnisse in den erforderlichen Schlüsselbund-Adapter der Authentifizierung verschieben

Schlüsselbund-Client, Persistenzspeicher und API-Route gehören jetzt zu einem erforderlichen Authentifizierungsadapter. Die Migration alter Einstellungen und der Klartextabruf von Chatraumschlüsseln wurden entfernt, sodass Geheimnisse ausschließlich über den verschlüsselten Schlüsselbund aufgelöst werden.

## Freigabeaufgaben in den zuständigen Adaptern belassen

Der Benutzerfreigabe-Adapter erzwingt nun die Eindeutigkeit der Empfänger, während ausschließlich SMTP die Ratenbegrenzung seiner E-Mail-Warteschlange verwaltet. Das Freigabe-Gateway orchestriert nur diese Adapterrichtlinien.

## Schlüsselbund-Bootstrap an die Fähigkeitsarchitektur anpassen

Der wiederverwendbare Browser-Schlüsselbund ist vollständig im erforderlichen Authentifizierungsadapter enthalten. Der erforderliche Authentifizierungsadapter initialisiert seine Tresor- und Routenfähigkeiten nun selbst während der Gateway-Erkennung, erhält die Authentifizierung über den injizierten Routenkontext und enthält komponenteneigene Dokumentation.

## Quellgrößen- und Abhängigkeitskonformität wiederherstellen

Große Kalender-Routen- und Testdateien wurden in fokussierte Module aufgeteilt, berührte übergroße Dateien unterschreiten nun die Grenze von 1.000 Zeilen, und die Abhängigkeitsobergrenzen für Freigaben entsprechen der getesteten Workspace-Version.

## Den vollständigen Schlüsselbund im Authentifizierungsadapter kapseln

Der Browser-Schlüsselbund liegt nun zusammen mit Speicher, Routen, Manifest und Dokumentation im Adapter. Der Adapter registriert sein eigenes statisches UI-Verzeichnis bei der Erkennung, und alle Verbraucher importieren die adaptereigene Browser-Schnittstelle.

## Freigabe- und Schlüsselbund-Adapter in der Administration sichtbar

Die Manifeste der Schlüsselbund-, Link- und Benutzer-Adapter weisen nun ihr übergeordnetes Authentifizierungs- oder Freigabe-Gateway aus. Die erforderlichen verschlüsselten Schlüsselbund-, Link- und Benutzer-Adapter stellen gesperrte Komponentenmetadaten und kanonische Administrationssteuerungen einschließlich gültiger leerer Konfigurationsoberflächen bereit.

## E-Mail-Versand verwendet eine einzige Fähigkeit

SMTP-Testnachrichten, Benutzerbestätigungen, Einladungen, Einmal-Anmeldenachrichten und eingereihte Bestätigungsnachrichten verwenden nun die adaptereigene ctx-Fähigkeit `notify:sendEmail`. Tests der Administrations- und E-Mail-Bestätigungsrouten prüfen die erfolgreiche Weiterleitung, damit Regressionen nicht mehr als unerklärliche `400`-Antworten auftreten.

## Adapterzugehörigkeit wird zentral erkannt

Der zentrale Gateway-Bootstrap leitet `hasAdapters` nun aus dem Feld `gateway` jedes Adaptermanifests ab. Gateways benötigen keine doppelten Angaben zur Adapterpräsenz mehr in ihrem eigenen Manifest oder ihrer Bootstrap-Registrierung.

## Raumschlüssel werden automatisch bereitgestellt

Beim Öffnen eines Raums wird ein fehlender Raumschlüssel nun auf dem Server erzeugt und ausschließlich an ein bestätigtes Raummitglied ausgeliefert. Messages fordert bei Bedarf zum Entsperren des verschlüsselten Schlüsselbunds auf, prüft den ausgelieferten Schlüssel, speichert ihn unter der Fähigkeitskennung des Raums und öffnet anschließend den verschlüsselten Verlauf.
