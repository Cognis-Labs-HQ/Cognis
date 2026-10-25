# Offline-Navigation

**Feature-Zweig:** feature-offline-navigation

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
