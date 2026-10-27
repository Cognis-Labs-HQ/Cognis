# Offline-Navigation

**Feature-Zweig:** feature-offline-navigation

## Bannerhintergrund

Gemeinsame obere Banner behalten beim Scrollen einen undurchsichtigen, an das Design angepassten Hintergrund. Hinweise zu wiederhergestellter Verbindung, Warnungen und Gefahren verwenden die vorhandenen Designfarben.

## Offline-Vertrag

Produktions-Builds bereiten eine neutrale Wiederherstellungsseite vor. Lizenz und Fehlerseite funktionieren offline; nicht verfügbare Routenlinks werden deaktiviert und nicht verfügbare direkte Aufrufe bleiben ohne Fehlermeldung. Ein tatsächlicher Server-Verbindungsfehler aktiviert den Ersatzbetrieb auch bei einer vom Browser gemeldeten Netzwerkverbindung.

Deklarieren Sie `public: true` und `offline: { assets: [...] }` für eine SPA-Route. Listen Sie alle öffentlichen Laufzeitabhängigkeiten einschließlich Sprachkatalogen und Datendateien auf. Seiten müssen ohne API-Aufrufe, private Kontodaten oder die Erkennung sämtlicher Host-Anbieter funktionieren. Private Routen dürfen dies nicht aktivieren. Verwenden Sie Routenlinks für die Navigation. Unbekannte oder noch nicht geladene Abhängigkeiten bleiben nicht verfügbar.

Der Service Worker speichert keine API-Antworten, Zugangsdaten oder authentifiziertes HTML. Die Modulinvalidierung entfernt den öffentlichen Routenkatalog und Modulressourcen; Ressourcen mit Revision müssen dem aktuellen Katalog entsprechen. Entfernte Änderungen sind ohne Verbindung nicht erkennbar: Nur die zuletzt bekannte öffentliche Revision ist verfügbar. Bei Wiederherstellung werden der Katalog aktualisiert und ungespeicherte Änderungen vor dem Neuladen geprüft; danach gilt wieder die Serverautorisierung. Worker-Aktualisierungen warten auf das Schließen bestehender Tabs und bereiten die Wiederherstellungsressourcen vor der Aktivierung vor. Ein erster Besuch ohne installierten Worker funktioniert nicht offline.

## Erinnerungen auswählen

Mehrere Erinnerungen lassen sich mit den üblichen sichtbaren Kontrollkästchen auswählen und gemeinsam speichern. Werden alle abgewählt, bleiben Erinnerungen auch bei Kalenderstandardwerten deaktiviert. Bestehende benutzerdefinierte Zeitabstände bleiben beim Bearbeiten verfügbar.

## Offline lernen

Der Offline-Modus ist in den Einstellungen standardmäßig aktiviert. Deaktivieren stellt die bisherigen Verbindungswarnungen und Fehlermeldungen wieder her und schaltet den Worker-Fallback ab. Bei Aktivierung wechselt die Anwendung bei Verbindungsverlust ohne Fehlermeldung in den Offline-Modus; nicht verfügbare Navigation wird ohne Fehlerdialog blockiert.

Study behält begrenzte, kleine JSON-Schnappschüsse im aktuellen Tab: Schemas, erlaubte Zeichen- und Kartendaten, Speicherorte, gesehene IDs, Favoriten und zuvor geöffnete Kartensätze. Sprachschemas aktivieren dies mit `metadata.offline: { cache: "lightweight" }`. Der Library-Cache umfasst höchstens 16 MB und 100 Lesevorgänge; andere Lesecaches höchstens 4 MB und 100 Lesevorgänge. Audiodaten, Wörterbuchantworten, Zugangsdaten und authentifizierte Dokumente werden nicht dauerhaft gespeichert.

Explore-Vorschauen verwenden bereits autorisierte Cache-Daten. Zeichnen und Lernkarten funktionieren lokal. Abschlüsse, Bewertungen, gesehene IDs und endgültige Favoritenzustände werden zur Übertragung vorgemerkt; Fortschritt, XP und Belohnungen sind erst nach Serverbestätigung verbindlich. Audio sowie Wörterbuch- und ElevenLabs-Abfragen stoppen. Bearbeiten, Löschen und Freigaben benötigen eine Verbindung. Nur zuvor geladene Inhalte innerhalb der Cache-Grenzen sind verfügbar.

Privates Study benötigt dieselbe zuvor bestätigte, noch gültige Kontositzung im selben Tab. Nach Neuladen und beim Erstbesuch gilt weiterhin der ausschließlich öffentliche Offline-Vertrag. Konto- und Sitzungswechsel, geänderte Einstellungen, Modul-Lebenszyklusänderungen und die Freigabe eines Anbieters verwerfen private Schnappschüsse. Serverseitige Sperren können ohne Verbindung nicht erkannt werden. Die Wiederherstellung prüft ungespeicherte Änderungen und lädt die Serverautorisierung neu.

## Übertragung und Zustimmung

Der Host stellt `offline:outbox`, `offline:state` und `offline:accessPolicy` über ctx bereit. Komponenten registrieren Übertragungshandler für ihre Anbieter-Lebensdauer und stabile IDs über `offline:enqueue`; `offline:flush` autorisiert und überträgt. Die dauerhafte kontogebundene Warteschlange umfasst höchstens 1.000 Einträge und 1 MB für sieben Tage, ohne Tokens. IDs und Zeitstempel bleiben erhalten; temporäre Fehler werden wiederholt, bestätigte oder dauerhaft abgelehnte Einträge entfernt. Eine lokalisierte Warnung meldet Ablehnungen. Abmelden leert die Konto-Warteschlange; andere Konten erhalten keine fremden Einträge. Deaktivieren stoppt neue Offline-Einträge. Vorhandene Einträge können online übertragen werden.

Die Wiederherstellung aktualisiert Anbieter und führt `authenticate-session` aus, bevor die abschließende Phase `afterSession` Aktivitäten überträgt. Erforderliche Anbieter deklarieren `offlineAccessGuard` im Serverkatalog. Unbekannte Anforderungen oder fehlende Zustimmung sperren Offline-Zugriff. Terms of Service speichert zuletzt abgerufene Dokumentversionen und serverbestätigte Zustimmung je Konto. Neue nicht akzeptierte Versionen sperren Offline-Lesen, Navigation und Einträge sofort sowie die Übertragung bis zur Online-Zustimmung. Offline-Zustimmung ist nicht möglich. Private Inhalte bleiben tablokal; nur begrenzte Warteschlangen und Rechtstexte überstehen Neuladen. Die anfängliche Phase `beforeSession` verwirft die bisherige Übertragungsverifikation vor jeder Authentifizierung.

## Soziale Offline-Änderungen

Profile- und Messages-Anbieter registrieren lebenszyklusgebundene HTTP-Aktionen über ctx. Zuvor geladene Profile, Beiträge, Raumlisten und verschlüsselte Verläufe bleiben im bestätigten Tab verfügbar. Profiltexte, Verfügbarkeit, Folgen-/Blockieren-Zustände, Bannerlayout, Beitragserstellung/-löschung, verschlüsselte Nachrichten in bestehenden Räumen, endgültige Reaktionszustände und Lesebestätigungen nutzen den kontogebundenen Offline-Puffer. Spätere Online-Änderungen warten auf gepufferte Änderungen desselben Anbieters. Konto- oder Sitzungswechsel während Vorbereitung oder Pufferwartezeit brechen die Aktion ab. Nachrichten und Beiträge verwenden stabile `operationId`-UUIDs; geänderte oder kontofremde Wiederholungen werden abgelehnt. Nachrichtenwiederholungen erzeugen keine weiteren Benachrichtigungen. Lesebestätigungen behalten die ursprüngliche Lesezeit.

Chats werden vor dem Puffern verschlüsselt: Klartext, Raumschlüssel und Zugangsdaten gelangen nie in die Warteschlange. Profiltexte und Beiträge liegen im Browserspeicher des aktuellen Kontos. Avatar-/Bannerdateien bis 350.000 Binärbytes teilen sich den bestehenden Puffer mit 1 MB, 1.000 Einträgen und sieben Tagen Aufbewahrung; größere Bilder benötigen eine Verbindung. Ein voller Puffer meldet einen übersetzten Fehler; Nachrichten- und Beitragsentwürfe werden erst nach erfolgreicher dauerhafter Abgabe geleert. Die Grenzen gelten für den gesamten Puffer.

Änderungen bleiben bis zur Serverbestätigung ausstehend. Nachrichten zeigen den Wartestatus; Profil-, Beitrags- und Medienaktionen nutzen die übliche Warteschlangenmeldung. Schließen und Neuladen lösen die native Browserbestätigung für ungespeicherte Änderungen aus, solange das aktuelle Konto gepufferte Einträge hat, auch bei deaktivierten Anbietern. Nach Bestätigung oder Kontobereinigung entfällt die Warnung. Wortlaut und erforderliche vorherige Interaktion bestimmt der Browser. Einträge überstehen weiterhin Neuladen; die Warnung verwirft sie nicht.

Zwischengespeicherte soziale Inhalte bleiben tablokal und zustimmungspflichtig. Erstbesuche, privates Offline-Neuladen, Raumerstellung, Mitgliedschafts-/Schlüsselverwaltung, Anrufe und große Uploads benötigen eine Verbindung. Tippen und Anwesenheit sind flüchtig und werden nicht nachgesendet. Beim Übertragen wird die aktuelle Serverautorisierung geprüft; Offline-Daten können entfernte Sperren nicht erkennen. Die ToS-Zustimmung bleibt vor Zugriff und Übertragung erforderlich.

## Sichtbare Online-Symbole

Die Modules-Werkzeugleiste behält ihre Symbolgröße, wenn gemeinsame Schaltflächenstile später laden. Erfolgreich geladene SVGs für Aktualisieren und Einstellungen werden nicht mehr durch Schaltflächenabstände auf einen schmalen Streifen gedrückt.

## Profilstart

Die Profilverfügbarkeit startet beim Einbinden des Anbieters, nachdem sein gepufferter Client registriert und die Avatar-Stile bereit sind. Der Import startet weder Anwesenheitsaufrufe noch Abfragen. Deaktivieren und fehlgeschlagenes Einbinden entfernen Abonnements, Seiten-Listener, Timer und zwischengespeicherte Verfügbarkeit; veraltete asynchrone Arbeit verändert keinen späteren Anbieterbereich. So entsteht beim Online-Start von Verwaltungsseiten kein Fehler `profile_client_unavailable`.

## Registrierung und Suche

Jede authentifizierte Sitzung prüft `/api/v1/auth/setup-status`, auch nach einer SSO-Weiterleitung. Der Benachrichtigungsdienst liefert erforderliche E-Mail-Einrichtung über `auth:getSetupIntegrations(accountId, role)`: Skripte desselben Ursprungs mit dem Export `enforceSetup({ accountId })`. Die Einrichtung endet vor der Freigabe für Navigation oder Offline-Nutzung. SMTP-Ausfälle heben die Verifizierungspflicht nicht auf; der ursprüngliche Gründeradministrator bleibt ausgenommen.

SMTP-Verifizierung gilt für SSO-Konten und lokale Konten. Erneutes Senden verwendet den konfigurierten Benachrichtigungsdienst. Codes und Bestätigungslinks binden die vollständige Konto-ID und E-Mail als undurchsichtiges Tupel, einschließlich SSO-Namensräumen. Abbrechen der Verifizierung in den Einstellungen erhält die vorhandene E-Mail-Adresse.

Die Administration speichert die öffentliche Registrierung lokaler Konten unabhängig vom Registrierungsadapter. Bei aktiviertem öffentlichen Adapter und ausgeschalteter lokaler Registrierung können SSO-Konten angelegt werden, ohne öffentliche Benutzername/Passwort-Registrierung zu erlauben. Das Deaktivieren des Adapters sperrt auch diesen Bereitstellungspfad; Einladungstoken bleiben über ihren eigenen Adapter verfügbar. Die globale Suche liefert Teilergebnisse, bricht ersetzte Suchanfragen ab und begrenzt die Laufzeit der Suchanbieter. Dokumenttitel erscheinen vor den Inhalten; vier abbrechbare Arbeitsabläufe indizieren Dokumenttexte statt die gesamte Bibliothek gleichzeitig abzurufen.

## Verbindung und Konten

Offline-Richtlinien und Routenmetadaten verwenden einen getrennten Steuercache. Kataloganfragen werden zusammengefasst, Richtlinienänderungen behalten ihre Reihenfolge, Nachrichten schließen ihre Ports und die Asset-Bereinigung im Hintergrund verzögert keine Bestätigungen. Die Installation ruft höchstens vier Assets gleichzeitig ab. Die Anmeldung wartet nicht auf öffentliche Cache-Wartung und zeigt das gemeinsame Laderad bei Zugangsdaten-, TFA-Code- und SSO-Anfragen. Interaktive Einrichtung bleibt bedienbar. Die Erreichbarkeitsprüfung antwortet sofort; ausführliche Komponentenprüfungen bleiben unter `/api/v1/system/health`.

Öffentliche SSO-Profilnamen enthalten keinen Anbieternamensraum. Bestehende Namen mit Anbieterpräfix werden bei der Profilinitialisierung ersetzt; bei Kollisionen kommt ein zufälliges Suffix hinzu. Anbieterneutrale Namen bleiben stabil. Konto-IDs, Identitätszuordnungen, Beiträge und Beziehungen bleiben unverändert. Mit dem Profilnamen ändert sich die öffentliche Profil-URL. Anbieterdaten sowie E-Mail- und Anmeldeinformationen bleiben in der nur für Administratoren zugänglichen Benutzerverwaltung. Die aufklappbaren Kontodetails verwenden die gemeinsamen Bereichsstile und laden autorisierte Metadaten beim Öffnen.

Administratoren und Eigentümer können `/invite` ohne Gründerstatus öffnen. Die Einladungsrichtlinie bestimmt weiterhin die Ausstellung. Der aktivierte Registrierungstoken-Adapter stellt `cognisctl invite:token:generate` für eigenständige Token ohne SMTP-Versand und `cognisctl invite:email:send person@example.com` für E-Mail-Einladungen bereit. Ohne E-Mail-Argument öffnet sich der CLI-Assistent. Beide Befehle nutzen die authentifizierte Registrierungs-API und beachten Rollen-, Domain- und Versandbeschränkungen.

## Benutzerliste

Die Benutzerliste nutzt die verfügbare Breite des Composers. Jedes Konto bildet eine vollständige aufklappbare Zeile mit Identität, Rolle, Status und Verwaltungsaktionen im Kopf; die ausgeklappten Metadaten erstrecken sich darunter über die ganze Zeile. Ein responsives Raster zeigt Beschriftungen und Werte, lokalisierte Rollen- und Anbieternamen sowie eigene E-Mail-Zeilen mit Hauptadress- und Verifizierungskennzeichen. Auf kleinen Bildschirmen werden die Steuerelemente umgebrochen und die Metadaten einspaltig angezeigt.

## Kontodatenschutz und Schlüsselbund-Isolation

SSO-Konten erhalten zufällige undurchsichtige IDs. Anbieter-IDs werden separat gespeichert und nur Administratoren angezeigt; öffentliche Benutzernamen enthalten sie nie. Auth reserviert Benutzernamen vor Profil- oder E-Mail-Änderungen: doppelte Namen desselben Anbieters werden abgelehnt, bei verschiedenen Anbietern wird bei Bedarf ein kurzes Zufallssuffix ergänzt. Benutzerlisten und Aktionsendpunkte unterscheiden den öffentlichen `username` von der internen `accountId`.

Dies ist eine inkompatible Umstellung ohne Konto-ID-Migration. Instanz stoppen und Datenbanken mit anbieterhaltigen SSO-Konto-IDs vor dem Upgrade zurücksetzen; Authentication verweigert den Start mit `provider_account_ids_require_clean_database`, statt solche IDs auszuliefern. Vorhandene Beziehungen und Besprechungen werden nicht migriert.

Verschlüsselte Browser-Tresore werden getrennt nach Origin, Konto-ID und serverseitiger Kontoinstanz-ID gespeichert. Vor dem Laden muss der Server Konto und Instanz bestätigen. Passwörter und Entschlüsselungsschlüssel bleiben ausschließlich im Arbeitsspeicher; alte IndexedDB-Entsperrschlüssel werden entfernt. Nach Neuladen ist das Schlüsselbund-Passwort erneut nötig, außer eine Passwortanmeldung entschlüsselt den Tresor erfolgreich. Kontowechsel brechen offene Dialoge und kryptografische Vorgänge ab. Entsperren erstellt keinen fehlenden Schlüsselbund; dafür ist die ausdrückliche Einrichtung oder Erstellen erforderlich.

Implementierung von Kontodatenschutz und Schlüsselbund-Isolation: `015e99106e7c190b999e55e73d413257fcb41725`.

## Start mit lokalen Konten erhalten

Vorhandene lokale Konten funktionieren auch bei vorhandenen alten SSO-Datensätzen weiter. Der Start erfordert kein Zurücksetzen der Datenbank. Anmeldung und Bereitstellung alter SSO-Konten werden einzeln abgelehnt, bis diese Konten mit undurchsichtigen IDs neu erstellt wurden. Konto-IDs, Beziehungen und Besprechungen werden weder automatisch migriert noch gelöscht.

Korrektur des Starts mit lokalen Konten: `894e74060ef7ff67fce1e8d45d94863ad5abd4a7`.

## Offline-Status und Wiederherstellung der Navigation

Ein dauerhafter Hinweis im Kopfbereich nutzt die gemeinsamen Hinweisstile und zeigt den Offline-Modus an. Nach Wiederverbindung bietet er Aktualisieren an, statt automatisch neu zu laden; die Aktion beachtet ungespeicherte und gepufferte Änderungen. Eine nicht verfügbare Seite versucht zuerst, die vorherige nutzbare Seite wiederherzustellen. Schlägt dies fehl, wird nach Wiederverbindung eine geschützte automatische Aktualisierung aktiviert. Absolute und relative Links derselben Origin verwenden den SPA-Router. Der Offline-Katalog behält öffentliche zwischengespeicherte Seiten sowie vom Anbieter freigegebene private Routen.

## Abfragelimits im Offline-Modus

Im Offline-Modus stoppen die Einwilligungsabfragen und normalen Wiederherstellungsabfragen. Nur eine kleine Server-Gesundheitsabfrage läuft alle fünfzehn Minuten, auch bei wiederholten Online-Ereignissen des Browsers. Fehlgeschlagene Online-Verbindungsprüfungen werden bis auf fünfzehn Minuten verlangsamt. Einwilligungsabfragen werden bei Fehlern bis auf fünf Minuten verlangsamt, offline vollständig gestoppt und nach Wiederverbindung fortgesetzt. Die erforderliche zwischengespeicherte Zustimmung bleibt Voraussetzung für Offline-Zugriff.

Implementierung von Offline-Status, Navigationswiederherstellung und Abfrageintervallen: `b889c1fd03d733da95b11af0bff65c7bb590b679`.

## Plötzlicher Verbindungsverlust

Kann die aktuelle Seite offline nicht verwendet werden, beendet der Host ihren Seitenlebenszyklus und versucht ohne Fehlerdialog zur vorherigen offlinefähigen Seite zurückzukehren. Schlägt dies fehl, erklärt der Hinweis im Kopfbereich die nicht verfügbare Seite und der Inhalt wird geleert; bei erneuter Verbindung wird eine durch Navigationsschutz abgesicherte automatische Aktualisierung versucht. Präsenz-Timer pausieren offline und starten nach Wiederherstellung neu. Erfolgreich geladene öffentliche Übersetzungen werden im Tab wiederverwendet; geschützte Kataloge erfordern weiterhin authentifizierte Anfragen.

## Zugriff auf Dashboard und Study

Das Dashboard deklariert privaten Offline-Zugriff innerhalb der Sitzung; Kontoübersicht und zwischengespeicherte bevorstehende Termine bleiben nutzbar. Beim erneuten Offline-Öffnen werden optionale, vom Server geladene Erweiterungen ausgelassen. Der Study-Anbieter registriert die Übersichtsroute und nutzt über `study:navigation`-Abläufe konto- und sitzungsgebundene Schnappschüsse von Sprachkatalogen, Lernpräferenzen und Modulverweisen. Beim Laden der Navigationsleiste werden diese kleinen Metadaten vorab geladen. Explore und Lernkarten behalten ihre anbietergebundenen Routendeklarationen; nicht unterstützte Seiten nutzen weiterhin die stille Wiederherstellung. Die Auswahl zu lernender Sprachen erfordert eine Verbindung. Beim erneuten Öffnen der Oberfläche wird keine Theme-Präferenz mehr automatisch geschrieben. Ausdrückliche Änderungen der Oberflächeneinstellungen nutzen den aktiven Profile-Client und damit dessen Offline-Puffer; verzögerte Zusammenführungen prüfen weiterhin das Konto.

Implementierung: [f05ea0a](https://github.com/Cognis-Labs-HQ/Cognis/commit/f05ea0a48325a7a1e58ea22ca46c613f7cd85b87)

## Ein Offline-Hinweis

Offline-Status und Angaben zur nicht verfügbaren Seite stehen gemeinsam in einem einzigen Hinweis im Kopfbereich ohne Schließen-Aktion. Nach Wiederverbindung erscheinen dort die Wiederherstellungsmeldung und eine Aktualisieren-Schaltfläche mit gemeinsamen Schaltflächenstilen und Aktionsabständen. Standardstile der Oberfläche erhalten ausdrücklich gewählte Bestätigen-, Abbrechen- und neutrale Schaltflächenstile. Seiten ohne Kopfbereich verwenden einen einzelnen Hinweis im Inhalt.

Implementierung: [9cfab80](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cfab806b213cc6b48525e22ddd6b7fee8677ed4)

## Offline-Assets und Kalender

Die Auflösung von Produktions-Assets berücksichtigt nun Arrays, einschließlich benötigter Skripte und Stylesheets. Versionierte und unversionierte öffentliche Asset-URLs teilen sich Cache-Schlüssel; Modulrevisionen bleiben getrennt. Zwei Hintergrundprozesse bereiten unterstützten Seitencode und inaktive Styles vor, ohne Seiten einzuhängen. Offline-Links erfordern vorbereiteten Code und die nötigen konto- und sitzungsgebundenen Schnappschüsse. Das erneute Zeichnen der Navigation erhält die Sperre, sodass Meetings deaktiviert bleibt. Private APIs und authentifiziertes HTML gelangen weiterhin nicht in den Worker-Cache.

Nach bestätigter Anmeldung speichert Calendar Kalenderlisten, Einladungen und eigene Termine mit höchstens zwei gleichzeitigen Hintergrundanfragen. Eine Cache-Invalidierung erneuert diese Schnappschüsse, ohne die Anmeldung aufzuhalten. Gespeicherte Termine bleiben lesbar; neue Termine, Änderungen, Löschungen, Antworten, Statuspräferenzen und Kalenderänderungen werden gepuffert. Neue und geänderte Termine erscheinen in den zwischengespeicherten Listen. Neue Termine nutzen eine stabile Vorgangs-UUID; Wiederholungen liefern den vorhandenen Termin ohne weitere Serie oder erneuten Einladungsversand. Geänderte oder kontofremde Wiederverwendung wird abgelehnt. Beim Übertragen prüft der Server erneut die Berechtigung.

Kalender-Schnappschüsse bleiben im Tab und sind auf 4 MB und 100 Lesevorgänge begrenzt. Für die gemeinsame Warteschlange gelten weiterhin 1 MB, 1.000 Einträge und sieben Tage. Neue Serientermine zeigen bis zur serverseitigen Erweiterung den ersten Termin. Neue Kalender, Meetings, Freigaben, Passwortverwaltung und Gastzugänge benötigen eine Verbindung; Freigabepasswörter werden niemals gepuffert. Messages benötigt eine gespeicherte Raumliste, Study gespeicherte Sprach- und Präferenzdaten, bevor Offline-Navigation freigegeben wird.

Nach bestätigter Authentifizierung bereitet Study Sprachkataloge, Präferenzen und Modulverweise der ausgewählten Sprachen im Hintergrund vor, mit höchstens zwei gleichzeitigen Modulanfragen. Die Unternavigation nutzt denselben anbietereigenen Cache, sodass der erste Besuch der Übersicht offline erfolgen kann. Nach einer Cache-Ungültigkeit wird die Vorbereitung erneut geplant, ohne die Anmeldung zu blockieren.

## Anmeldung und Übertragung

Nach erfolgreicher Passwort- oder TFA-Anmeldung ersetzt die vorhandene SPA-Navigationsfunktion die Anmeldeseite durch das Dashboard. Der bestätigte Tab und gepufferte Arbeit bleiben dadurch erhalten, ohne die Schließwarnung des Browsers auszulösen. Die Ladeanzeige bleibt bis zum Abschluss der Navigation sichtbar; die optionale Zeitzonensynchronisierung folgt danach und verwirft Kontowechsel. Tatsächlich gepufferte Änderungen bleiben beim Schließen oder Neuladen eines authentifizierten Tabs durch die Warnung geschützt.

Die Übertragung beginnt erst nach erfolgreicher Sitzungsautorisierung und erforderlicher Zustimmung im Hintergrund. Eine separate Browsersperre serialisiert die Übertragung zwischen Tabs; kurze Speichersperren schützen Schnappschüsse und Bestätigungen, ohne auf Netzwerkantworten zu warten. Lesen und neue gepufferte Änderungen bleiben während langsamer Übertragungen möglich. Bestätigungen lesen den Speicher erneut, damit gleichzeitige Änderungen erhalten bleiben. Leere Warteschlangen werden bei der Authentifizierung nicht neu geschrieben; nicht authentifizierte Seiten warnen nicht vor dem Puffer eines anderen Kontos.

## Offline-Prüfung und Warnungen

Der Offline-Hinweis bietet Verbindung erneut prüfen mit gemeinsamen Schaltflächenstilen und Ladeanzeige. Die Aktion ruft sofort `/api/v1/system/healthcheck` auf, bündelt gleichzeitige Prüfungen, autorisiert bei erreichbarem Server die Sitzung erneut und versucht die Übertragung der Warteschlange. Erforderliche Zustimmung bleibt Voraussetzung. Bei Fehlern bleibt der Offline-Modus ohne Fehlerdialog aktiv. Automatische Prüfungen bleiben auf einmal je fünfzehn Minuten begrenzt; die ausdrückliche Aktion darf früher prüfen. Nach Wiederherstellung bleibt Aktualisieren verfügbar.

Die native Schließen-/Neuladen-Warnung schützt nur Datensätze, die in der aktuellen Seite und Sitzung neu erstellt wurden. Nach einem echten Neuladen ist die Warnung zurückgesetzt; gespeicherte Aufträge bleiben zur Wiederholung erhalten. Neue bewusste Änderungen aktivieren sie erneut. Study-Gesehen-Markierungen und Analysen sind Hintergrundaktivitäten ohne Warnung. Datensätze anderer Tabs, bereits gespeicherte Aufträge und bloßes Rendern lösen keine Warnung aus. Der Abbau eines Providers hebt den Schutz aktueller Seitenänderungen bis zur Übertragung oder Entfernung nicht auf.

## Entsperren und Modulladen

Die Entsperrung bleibt beim Neuladen im selben authentifizierten Tab und derselben Sitzung erhalten. Das Passwort verschlüsselt weiterhin den Tresor; weder Passwort noch unverschlüsselter Entschlüsselungsschlüssel werden gespeichert. Der Sitzungsspeicher enthält nur eine mit AES-GCM verschlüsselte Entsperrung, deren Schlüssel mit HKDF aus dem aktiven Sitzungsgeheimnis abgeleitet und an Ursprung, Konto, serverseitige Kontoinstanz und Sitzung gebunden ist. Vor Wiederherstellung muss der Server diese Bindung bestätigen. Endliche Sperrfristen sind authentifiziert und bleiben beim Neuladen absolut. Sperren, Abmelden, Konto-, Instanz- oder Sitzungswechsel und Ablauf verhindern die Wiederherstellung. Nach Schließen des Tabs oder Beginn einer neuen Sitzung ist erneutes Entsperren nötig. Der alte unverschlüsselte IndexedDB-Cache bleibt stillgelegt.

Die Vorbereitung von Routen-Assets registriert ihren Ablauf und ihre Cache-Funktionen einmal pro gemeinsamem ctx. Gebündelte Skripte und Quellimporte externer Module verwenden dieselben Registrierungen und vorbereiteten Routen. Meetings scheitert dadurch nicht mehr am doppelten Ablauf `offline:prepareRouteAssets`.

## Gemeinsame obere Hinweise

Der Host stellt `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` vor dem Einhängen von Anbietern und Seiten bereit. Beschreibungen enthalten den Klartexttitel `title`, bereinigtes `bodyHtml`, vertrauenswürdiges `actionsHtml` und die Variante `info`, `success`, `warning` oder `danger`. Der Rückgabewert bietet `element` und `remove()`. Dieselbe ID ersetzt nur den eigenen Hinweis; ein älterer Aufräumaufruf entfernt keinen Ersatz. `signal` bindet die Lebensdauer. Niedrigere Prioritäten erscheinen zuerst. Titel werden maskiert; Anbieter müssen Rich Text bereinigen.

Offline-Modus und Broadcast verwenden einen gemeinsamen fixierten Stapel ganz oben im Dokument über dem App-Kopf. Offline-Modus hat Vorrang, ist nicht schließbar und behält Verbindungsprüfung und Aktualisieren nach Wiederherstellung. Das Entfernen einer Ankündigung entfernt Offline-Modus nicht. Broadcast überspringt Netzwerkanfragen ohne Verbindung; sein Anbieter entfernt beim Beenden Leiste und Timer.

## Leere Offline-Lernseiten

Vorbereitete Study-Seiten bleiben in einer bestätigten Offline-Sitzung mit gültiger Zustimmung auch ohne private Inhalte erreichbar. Fehlende Sprach- und Präferenzdaten ergeben eine leere Navigation. Explore zeigt seine normale leere Ansicht und den gezielten Hinweis „Keine offline gespeicherten Inhalte verfügbar“ statt einer nicht verfügbaren Route oder Fehlermeldungen. Flashcards behält eine leere Seite, wenn Kartendaten oder notwendige Ansichtsressourcen fehlen. Hinweise sind an die Seite gebunden und werden nicht doppelt angezeigt. Cache-Fehler verbergen keine Zugriffs- oder Zustimmungsverweigerung. Library und Flashcards bereiten öffentliche Übersetzungen und kleine Vorlagen online vor; private Daten bleiben in begrenzten tablokalen Caches.

## Direktes Laden und Stile

Direktes Laden und Aktualisieren behalten ihre Seitenstile, während Offline-Assets vorbereitet werden. Host- und Komponenten-Builds bewahren die Quellidentität der Stylesheets; logische und erzeugte URLs teilen sich dieselbe Verwaltung. Asset-Antworten warten nicht mehr auf Cache-Schreibvorgänge im Hintergrund; Fehler werden protokolliert und verzögern die Auslieferung nicht. Webfonts werden getrennt vom Design geladen, damit ein nicht erreichbarer Schriftserver weder die Seite noch das Laderad blockiert. Die gewählte Schrift wird angewendet, sobald sie verfügbar ist; währenddessen gilt der vorhandene Browser-Ersatz.

## Offline-Lernressourcen

Study bereitet verzögert benötigte Popup-Symbole, Zeichenvorlage, Zeichenstile und Schließen-Symbole online vor, ohne das Zeichenfeld zu öffnen oder die Anmeldung zu blockieren. Nach Wiederherstellung wird die Vorbereitung wiederholt; mit dem Anbieter wird sie beendet. Bereits zwischengespeicherte Zeichen können das Zeichenfeld erstmals offline öffnen. Inhalte lassen sich offline nicht bearbeiten; ein offenes Detailfenster deaktiviert Bearbeiten bei Verbindungsverlust. Fehlende dekorative Popup-Symbole behalten ihre übersetzte Aktionsbeschriftung, statt einen Ressourcenfehler anzuzeigen.

## Dauerhaft vorgemerkte Änderungen

Sobald eine Änderung dauerhaft vorgemerkt ist, machen Fehler bei optionaler Aktivitätserfassung oder Ansichtsaktualisierung sie nicht zu einer fehlgeschlagenen Änderung. Kalender öffnet Details aus zwischengespeicherten Terminlisten, einschließlich neuer vorgemerkter Termine und späterer Änderungen. Gleichzeitige Terminübermittlungen teilen sich eine Anfrage. Nachrichten löschen den Entwurf erst nach Bestätigung oder Speicherung; ein Fehler beim Aktualisieren des Chats erhält diesen Beleg. Auch Profiltext, Beiträge und Bilder behalten ihren abgeschlossenen Status bei Ansichtsfehlern. Die Verfügbarkeitsanzeige verzögert keine abgeschlossenen Kalenderänderungen.

Fehler im Anbieterlebenszyklus protokollieren jetzt den betroffenen Skriptpfad ohne Abfragedaten und die fehlgeschlagene Import- oder Bereitstellungsphase. Fehler optionaler Aktivitätserfassung werden getrennt von der dauerhaft gespeicherten Benutzeraktion protokolliert.

## Offline-Verfügbarkeit

Die Offline-Routenregistrierung bleibt bei wiederholten gebündelten und direkt ausgelieferten Importen erhalten. Vorbereitete Routen behalten ihre Verfügbarkeit bei neu erzeugten Beschreibungen mit denselben Skripten, Stilen und Funktionsanbietern; geänderte Assets müssen erneut vorbereitet werden. Nachrichten bereitet Chatlisten, Übersetzungen und Emoji-Kataloge nach bestätigter Anmeldung vor. Die Seite kann vor dem ersten Online-Besuch offline geöffnet werden. Automatisch öffnen nur zwischengespeicherte Chats mit zwischengespeichertem Verlauf; ein nicht gespeicherter Verlauf zeigt einen gezielten Informationstoast. Explore behält verfügbare Sammlungen, wenn eine andere Sammlung oder der Gelesen-Status fehlt. Zugriffs- und Einwilligungsverweigerungen werden weiterhin weitergegeben. Banneraktionen stehen direkt in der gemeinsamen Aktionszeile und verlieren den geerbten vertikalen Versatz.

## Gemeinsame Lernfavoriten

Der Study-Anbieter stellt `study:favourites` mit lebenszyklusgebundenen Operationen `load`, `toggle` und `has` bereit. Darstellungsfunktionen verwenden diese ctx-Funktion statt eines eigenen Caches pro Lader. Favoriten werden nach bestätigter Anmeldung vorbereitet, berücksichtigen vorgemerkte Änderungen und teilen konto- und sitzungsgebundenen Zustand zwischen Explore, Lernkarten und wiederholten Importen. Fehlt ein optionaler Favoriten-Snapshot, bleibt die Auswahl mit vorgemerkten Änderungen nutzbar; Inhalte werden nicht verborgen und kein Aktualisierungsfehler angezeigt. Ein Kontowechsel leert die sichtbare Auswahl. Zugriffsverweigerungen gelten niemals als Cache-Fehltreffer.

## Öffentliche Ressourcen im Cache

Gemeinsame Styles für Wiederverwendung, einschließlich Toasts und Sichtbarkeitssteuerung für Geheimnisse, stehen im Startmanifest des Workers sowohl mit logischen als auch gebauten URLs. Calendar bereitet sein verzögert geladenes Status-Stylesheet über seinen Provider vor. Der SPA-Routenkatalog wird über ctx zwischen gebündelten und direkt bereitgestellten Importen geteilt. Dadurch bleiben autorisierte Study-Routen erhalten, wenn ein weiterer Loader den Katalog erstmals offline liest. Private Seitenschnappschüsse bleiben an Konto und Sitzung gebunden; Berechtigungs- und Zustimmungsprüfungen gelten weiterhin.

Öffentliche Ressourcen aus dem Cache werden sofort geliefert. Hintergrundprüfungen bei Bedarf werden zusammengefasst und gedrosselt. Vor einem Austausch werden vollständige Antwortinhalte verglichen; unveränderte Daten bleiben bestehen. Eine Antwort mit älterem Last-Modified-Datum ersetzt keine neuere Datei. Fehlende Dateien, Verbindungsfehler, abgebrochene Übertragungen und fehlgeschlagene Cache-Schreibvorgänge behalten die zuvor vollständige Datei. Geänderte Inhalte ersetzen sie erst nach erfolgreichem atomarem Schreiben. Explizite Zugriffsverweigerung, private/no-store-Antworten, Zustimmungsänderungen und entzogener Modulzugriff setzen die Richtlinien weiterhin durch. API-Antworten und authentifizierte Dokumente bleiben im Worker ausschließlich netzwerkbasiert.

## Dauerhafter Ressourcen-Cache

Der Worker bereitet alle gebauten öffentlichen Seiten-Bundles, dynamischen Chunks, Styles und ausgegebenen Medien vor, ohne Seiten auszuführen oder private Daten abzurufen. Später abgerufene öffentliche Antworten werden automatisch gespeichert. Bei der Aktivierung werden vollständige öffentliche Dateien in die neue Generation übernommen, bevor alter Speicher freigegeben wird. Modulrevisionen werden nur übernommen, wenn der aktuelle Katalog sie erlaubt. Für das Herunterladen öffentlicher Bundles ist kein Seitenbesuch erforderlich. Private Inhalte benötigen weiterhin einen autorisierten, vom zuständigen Provider vorbereiteten Schnappschuss.

## Offline-Arbeitsbereich

Nach bestätigter Anmeldung bereitet Study Schemas, lesbare Speicherorte, Formulare, Gesehen-Markierungen und ausdrücklich erlaubte leichte Sammlungen für eingeschriebene Lern- und Unterrichtssprachen vor. Flashcards bereitet seine Liste und bis zu 80 passende Stapel mit Kartendetails innerhalb des bestehenden begrenzten Caches vor. Änderungen der Einschreibung starten die Vorbereitung erneut. Zwei Worker begrenzen gleichzeitige Lesevorgänge; Provider-Abbau, Kontowechsel, Zugriffsverweigerung und zwischengespeicherte rechtliche Zustimmung bleiben wirksam. Ein vorheriger Seitenbesuch ist nicht erforderlich. Private Schnappschüsse bleiben an den bestätigten Tab und die Sitzung gebunden.

Offline-Profilzugriff erfordert einen vollständig vorbereiteten Schnappschuss des eigenen Profils: Text, Beiträge, Verbindungen, Einstellungen sowie begrenzte Avatar- und Bannerbilder. Fremde Profile sind auch bei vorhandenem Cache gesperrt. Administration, Modules, Users und Shares bleiben offline nicht verfügbar. Settings öffnet seine lokalen Kernfunktionen. Gespeicherte Schrift-, Design-, Sprach-, Zeitzonen- und Anzeigeeinstellungen gelten lokal und werden zur Serverübertragung gepuffert. E-Mail-Verifizierung, Kontoaktionen und beitragende Einstellungen mit Serverbedarf bleiben offline nicht verfügbar.

Die native Schließen-/Neuladen-Warnung schützt nur Datensätze, die in der aktuellen Seite und Sitzung neu erstellt wurden. Nach einem echten Neuladen ist die Warnung zurückgesetzt; gespeicherte Aufträge bleiben zur Wiederholung erhalten. Neue bewusste Änderungen aktivieren sie erneut. Study-Gesehen-Markierungen und Analysen sind Hintergrundaktivitäten ohne Warnung. Datensätze anderer Tabs, bereits gespeicherte Aufträge und bloßes Rendern lösen keine Warnung aus. Der Abbau eines Providers hebt den Schutz aktueller Seitenänderungen bis zur Übertragung oder Entfernung nicht auf.

Der Host stellt `ui:languageCatalog.load` über ctx bereit und bereitet den gemeinsamen Sprachkatalog nach bestätigter Anmeldung vor. Die Kern-Sprachkataloge gehören zum öffentlichen Startbestand. Settings und die Navigationsleiste nutzen denselben lebenszyklusgebundenen Lesezugriff. Das Offline-Speichern einer Sprachpräferenz hält die nutzbare Seite offen und wendet die Präferenz bei späterer clientseitiger Navigation an.

## Offline-Übungen

Die Library-Verwaltung und ihre Bearbeitungs-, Such- und Anfrageseiten benötigen eine Verbindung. Study-Startseite und Untermenü blenden diese Links offline aus, auch unmittelbar nach einem Verbindungsabbruch. Explore bleibt zum Lesen gespeicherter Inhalte und zum Zeichnen verfügbar. Der Library-Provider meldet nur Explore als Offline-Sitzungsroute an.

Die Vorbereitung eingeschriebener Sprachen speichert den gemeinsamen Schemakatalog zusätzlich zu den sprachspezifischen Katalogen. Zeichnen und Flashcards können ihre üblichen Schemaabfragen ohne vorherigen Online-Seitenbesuch nutzen. Flashcards bereitet Share- und Study-Übersetzungen sowie die Galerievorlage vor und liest Sammlungen der ausgewählten Sprache mit denselben schemaqualifizierten Anfragen wie die Einschreibungsvorbereitung. Vorbereitete Stapel öffnen Galerie und Übungen offline. Audio, Wörterbuchabrufe, Inhaltsbearbeitung sowie Zugriffs- und Zustimmungsprüfungen behalten ihre bisherigen Beschränkungen.

## Commits

- [bfc96cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/bfc96cbe42c045aa334dedb15f9991c41fa146a2)
- [980643a](https://github.com/Cognis-Labs-HQ/Cognis/commit/980643a2d392559194e361745e7aae10f04c7bf2)
- [9e208d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e208d34f2a8b9b117c4029e7a26c712efc11dd5)
- [39bc5c3](https://github.com/Cognis-Labs-HQ/Cognis/commit/39bc5c3c81a7b87b096d8ed665aa3ddeee7e4c93)
- [5cfeb11](https://github.com/Cognis-Labs-HQ/Cognis/commit/5cfeb11f0684d87760f8cc697bd42df4fcdd72b9)
- [f9e9412](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9e94123bf209c424d03113bd35a4b6eb307163f)
- [7fe3dfe](https://github.com/Cognis-Labs-HQ/Cognis/commit/7fe3dfe17d68047602ae510a892503e7f0bbdc5e)
- [09ca5a5](https://github.com/Cognis-Labs-HQ/Cognis/commit/09ca5a58239ff2a21195d9b3f8d755c64753d977)
- [950309c](https://github.com/Cognis-Labs-HQ/Cognis/commit/950309c0c732d732f3558c8f153b697214378cc2)
- [5e3abf8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5e3abf80c5046e5e9f783ce8900f84506cac817f)
- [a087357](https://github.com/Cognis-Labs-HQ/Cognis/commit/a087357f0eed1acfa938fa449c92ea5fd7ef63b3)
- [9ddc4fb](https://github.com/Cognis-Labs-HQ/Cognis/commit/9ddc4fb3086075e50448928439eb30d543a3dd0d)
- [9cfab80](https://github.com/Cognis-Labs-HQ/Cognis/commit/9cfab806b213cc6b48525e22ddd6b7fee8677ed4)
- [da5a324](https://github.com/Cognis-Labs-HQ/Cognis/commit/da5a324b48014feab2905dfc8a69a2cab4dd3599)
- [d895d67](https://github.com/Cognis-Labs-HQ/Cognis/commit/d895d67d17cdc3888f665a5ea06395fe746d2e2b)
- [b90e0cd](https://github.com/Cognis-Labs-HQ/Cognis/commit/b90e0cda258130cc9b30db1f8c388385cdce4e1b)
- [dde15f4](https://github.com/Cognis-Labs-HQ/Cognis/commit/dde15f4c898abb129a31228e0894272f0366f811)
- [f6b4ede](https://github.com/Cognis-Labs-HQ/Cognis/commit/f6b4ede722b7a14cfe67f2eb758670bc28071fb3)
- [341087c](https://github.com/Cognis-Labs-HQ/Cognis/commit/341087c11a97fa9cfdd578beffa9761cffcbf9db)
- [d203bf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/d203bf0cdc967809fc9adb9aad37b373d3c1620d)
- [be70890](https://github.com/Cognis-Labs-HQ/Cognis/commit/be708903dd542514d8cd16f5e2651341e1c60dbc)
- [1118229](https://github.com/Cognis-Labs-HQ/Cognis/commit/1118229c6cb20351d6cb86282427e0ce3d96058b)
- [070f1b7](https://github.com/Cognis-Labs-HQ/Cognis/commit/070f1b7bf2e1d6ac2dfb1b58b1f50103adb72fb9)
- [b38bc93](https://github.com/Cognis-Labs-HQ/Cognis/commit/b38bc93e45e269ae465e33e700110e116668f5df)
- [41b573b](https://github.com/Cognis-Labs-HQ/Cognis/commit/41b573b56b646acaf3f9bb9064ca6211c6657e92)
- [bb3fbfd](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb3fbfd7ea7e3cf4f021c2a3cafab7f58bc7fe2c)
