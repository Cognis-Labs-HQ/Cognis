# Plattform-Features

## Überblick

Cognis ist eine selbst gehostete Sprachlernplattform, die strukturierte Lerninhalte mit sozialen Features, pluggbarer Authentifizierung, flexibler Persistenz und einer Echtzeit-Kollaborationsbereitschaftsschicht kombiniert.

## Kernfähigkeiten

- **Authentifizierung und Identität** — pluggbare Auth-Adapter unterstützen lokale Anmeldedaten, LDAP-Verzeichnisdienste, SAML 2.0 und OAuth2/OIDC-Anbieter.
- **Modulare Sprachinhaltslieferung** — das Modulsystem erlaubt Lehrplaneinheiten als Module zu verpacken und zur Laufzeit zu installieren.
- **Konfigurierbare UI-Seiten** — jede Seite verwendet `createPageComposer` für wiederverwendbare Layout-Slots und Pro-Benutzer-Präferenzpersistenz.
- **Leichtgewichtiges soziales Netzwerk** — öffentliche Profile, Microblog-Posts, Follower-/Following-Graphen und Blockierungsverwaltung.
- **API-First-Architektur** — jedes Feature ist über eine versionierte HTTP-API mit stabilen `{ data }` / `{ error }` Antwort-Envelopes zugänglich.

## Lernmodi

- **Unabhängige Lernende** arbeiten in ihrem eigenen Tempo durch modulare Sprachinhalte.
- **Lehrer und Tutoren** leiten Sitzungen mit der `teacher`-Rolle.
- **Gemeinschaften** organisieren gemeinsame Lernrhythmen mit sozialen Features.

## Adapter-Abdeckung

| Bereich            | Eingebaute Adapter              |
| ------------------ | ------------------------------- |
| Datenbank          | `memory`, `mariadb`, `postgres` |
| Auth               | `local`, `ldap`, `saml`, `oidc` |
| Dateispeicher      | `local`                         |
| Benachrichtigungen | `smtp`                          |

## Admin-Fähigkeiten

- Vollständiges Gateway-Management (aktivieren/deaktivieren, Auth-Adapter konfigurieren).
- Modul-Installation und Lifecycle-Management.
- Pro-Kategorie-Dateigrößenbeschränkungen.
- System-Health- und Diagnose-Endpunkte.

## Registrierung und Suche

Die Administration speichert die öffentliche Registrierung lokaler Konten unabhängig vom Registrierungsadapter. Bei aktiviertem öffentlichen Adapter und ausgeschalteter lokaler Registrierung können SSO-Konten angelegt werden, ohne öffentliche Benutzername/Passwort-Registrierung zu erlauben. Das Deaktivieren des Adapters sperrt auch diesen Bereitstellungspfad; Einladungstoken bleiben über ihren eigenen Adapter verfügbar. Die globale Suche liefert Teilergebnisse, bricht ersetzte Suchanfragen ab und begrenzt die Laufzeit der Suchanbieter. Dokumenttitel erscheinen vor den Inhalten; vier abbrechbare Arbeitsabläufe indizieren Dokumenttexte statt die gesamte Bibliothek gleichzeitig abzurufen.

## Verbindung und Konten

Offline-Richtlinien und Routenmetadaten verwenden einen getrennten Steuercache. Kataloganfragen werden zusammengefasst, Richtlinienänderungen behalten ihre Reihenfolge, Nachrichten schließen ihre Ports und die Asset-Bereinigung im Hintergrund verzögert keine Bestätigungen. Die Installation ruft höchstens vier Assets gleichzeitig ab. Die Anmeldung wartet nicht auf öffentliche Cache-Wartung und zeigt das gemeinsame Laderad bei Zugangsdaten-, TFA-Code- und SSO-Anfragen. Interaktive Einrichtung bleibt bedienbar. Die Erreichbarkeitsprüfung antwortet sofort; ausführliche Komponentenprüfungen bleiben unter `/api/v1/system/health`.

Administratoren und Eigentümer können `/invite` ohne Gründerstatus öffnen. Die Einladungsrichtlinie bestimmt weiterhin die Ausstellung. Der aktivierte Registrierungstoken-Adapter stellt `cognisctl invite:token:generate` für eigenständige Token ohne SMTP-Versand und `cognisctl invite:email:send person@example.com` für E-Mail-Einladungen bereit. Ohne E-Mail-Argument öffnet sich der CLI-Assistent. Beide Befehle nutzen die authentifizierte Registrierungs-API und beachten Rollen-, Domain- und Versandbeschränkungen.

## Benutzerliste

Die Benutzerliste nutzt die verfügbare Breite des Composers. Jedes Konto bildet eine vollständige aufklappbare Zeile mit Identität, Rolle, Status und Verwaltungsaktionen im Kopf; die ausgeklappten Metadaten erstrecken sich darunter über die ganze Zeile. Ein responsives Raster zeigt Beschriftungen und Werte, lokalisierte Rollen- und Anbieternamen sowie eigene E-Mail-Zeilen mit Hauptadress- und Verifizierungskennzeichen. Auf kleinen Bildschirmen werden die Steuerelemente umgebrochen und die Metadaten einspaltig angezeigt.

## Kontodatenschutz und Schlüsselbund-Isolation

SSO-Konten erhalten zufällige undurchsichtige IDs. Anbieter-IDs werden separat gespeichert und nur Administratoren angezeigt; öffentliche Benutzernamen enthalten sie nie. Auth reserviert Benutzernamen vor Profil- oder E-Mail-Änderungen: doppelte Namen desselben Anbieters werden abgelehnt, bei verschiedenen Anbietern wird bei Bedarf ein kurzes Zufallssuffix ergänzt. Benutzerlisten und Aktionsendpunkte unterscheiden den öffentlichen `username` von der internen `accountId`.

Vorhandene lokale Konten funktionieren auch bei vorhandenen alten SSO-Datensätzen weiter. Der Start erfordert kein Zurücksetzen der Datenbank. Anmeldung und Bereitstellung alter SSO-Konten werden einzeln abgelehnt, bis diese Konten mit undurchsichtigen IDs neu erstellt wurden. Konto-IDs, Beziehungen und Besprechungen werden weder automatisch migriert noch gelöscht.

Die Entsperrung bleibt beim Neuladen im selben authentifizierten Tab und derselben Sitzung erhalten. Das Passwort verschlüsselt weiterhin den Tresor; weder Passwort noch unverschlüsselter Entschlüsselungsschlüssel werden gespeichert. Der Sitzungsspeicher enthält nur eine mit AES-GCM verschlüsselte Entsperrung, deren Schlüssel mit HKDF aus dem aktiven Sitzungsgeheimnis abgeleitet und an Ursprung, Konto, serverseitige Kontoinstanz und Sitzung gebunden ist. Vor Wiederherstellung muss der Server diese Bindung bestätigen. Endliche Sperrfristen sind authentifiziert und bleiben beim Neuladen absolut. Sperren, Abmelden, Konto-, Instanz- oder Sitzungswechsel und Ablauf verhindern die Wiederherstellung. Nach Schließen des Tabs oder Beginn einer neuen Sitzung ist erneutes Entsperren nötig. Der alte unverschlüsselte IndexedDB-Cache bleibt stillgelegt.

## Offline-Status und Wiederherstellung der Navigation

Ein dauerhafter Hinweis im Kopfbereich nutzt die gemeinsamen Hinweisstile und zeigt den Offline-Modus an. Nach Wiederverbindung bietet er Aktualisieren an, statt automatisch neu zu laden; die Aktion beachtet ungespeicherte und gepufferte Änderungen. Eine nicht verfügbare Seite versucht zuerst, die vorherige nutzbare Seite wiederherzustellen. Schlägt dies fehl, wird nach Wiederverbindung eine geschützte automatische Aktualisierung aktiviert. Absolute und relative Links derselben Origin verwenden den SPA-Router. Der Offline-Katalog behält öffentliche zwischengespeicherte Seiten sowie vom Anbieter freigegebene private Routen.

## Abfragelimits im Offline-Modus

Im Offline-Modus stoppen die Einwilligungsabfragen und normalen Wiederherstellungsabfragen. Nur eine kleine Server-Gesundheitsabfrage läuft alle fünfzehn Minuten, auch bei wiederholten Online-Ereignissen des Browsers. Fehlgeschlagene Online-Verbindungsprüfungen werden bis auf fünfzehn Minuten verlangsamt. Einwilligungsabfragen werden bei Fehlern bis auf fünf Minuten verlangsamt, offline vollständig gestoppt und nach Wiederverbindung fortgesetzt. Die erforderliche zwischengespeicherte Zustimmung bleibt Voraussetzung für Offline-Zugriff.

## Plötzlicher Verbindungsverlust

Kann die aktuelle Seite offline nicht verwendet werden, beendet der Host ihren Seitenlebenszyklus und versucht ohne Fehlerdialog zur vorherigen offlinefähigen Seite zurückzukehren. Schlägt dies fehl, erklärt der Hinweis im Kopfbereich die nicht verfügbare Seite und der Inhalt wird geleert; bei erneuter Verbindung wird eine durch Navigationsschutz abgesicherte automatische Aktualisierung versucht. Präsenz-Timer pausieren offline und starten nach Wiederherstellung neu. Erfolgreich geladene öffentliche Übersetzungen werden im Tab wiederverwendet; geschützte Kataloge erfordern weiterhin authentifizierte Anfragen.

## Zugriff auf Dashboard und Study

Das Dashboard deklariert privaten Offline-Zugriff innerhalb der Sitzung; Kontoübersicht und zwischengespeicherte bevorstehende Termine bleiben nutzbar. Beim erneuten Offline-Öffnen werden optionale, vom Server geladene Erweiterungen ausgelassen. Der Study-Anbieter registriert die Übersichtsroute und nutzt über `study:navigation`-Abläufe konto- und sitzungsgebundene Schnappschüsse von Sprachkatalogen, Lernpräferenzen und Modulverweisen. Beim Laden der Navigationsleiste werden diese kleinen Metadaten vorab geladen. Explore und Lernkarten behalten ihre anbietergebundenen Routendeklarationen; nicht unterstützte Seiten nutzen weiterhin die stille Wiederherstellung. Die Auswahl zu lernender Sprachen erfordert eine Verbindung. Beim erneuten Öffnen der Oberfläche wird keine Theme-Präferenz mehr automatisch geschrieben. Ausdrückliche Änderungen der Oberflächeneinstellungen nutzen den aktiven Profile-Client und damit dessen Offline-Puffer; verzögerte Zusammenführungen prüfen weiterhin das Konto.

## Ein Offline-Hinweis

Offline-Status und Angaben zur nicht verfügbaren Seite stehen gemeinsam in einem einzigen Hinweis im Kopfbereich ohne Schließen-Aktion. Nach Wiederverbindung erscheinen dort die Wiederherstellungsmeldung und eine Aktualisieren-Schaltfläche mit gemeinsamen Schaltflächenstilen und Aktionsabständen. Standardstile der Oberfläche erhalten ausdrücklich gewählte Bestätigen-, Abbrechen- und neutrale Schaltflächenstile. Seiten ohne Kopfbereich verwenden einen einzelnen Hinweis im Inhalt.

## Offline-Assets und Kalender

Die Auflösung von Produktions-Assets berücksichtigt nun Arrays, einschließlich benötigter Skripte und Stylesheets. Versionierte und unversionierte öffentliche Asset-URLs teilen sich Cache-Schlüssel; Modulrevisionen bleiben getrennt. Zwei Hintergrundprozesse bereiten unterstützten Seitencode und inaktive Styles vor, ohne Seiten einzuhängen. Offline-Links erfordern vorbereiteten Code und die nötigen konto- und sitzungsgebundenen Schnappschüsse. Das erneute Zeichnen der Navigation erhält die Sperre, sodass Meetings deaktiviert bleibt. Private APIs und authentifiziertes HTML gelangen weiterhin nicht in den Worker-Cache.

Nach bestätigter Anmeldung speichert Calendar Kalenderlisten, Einladungen und eigene Termine mit höchstens zwei gleichzeitigen Hintergrundanfragen. Eine Cache-Invalidierung erneuert diese Schnappschüsse, ohne die Anmeldung aufzuhalten. Gespeicherte Termine bleiben lesbar; neue Termine, Änderungen, Löschungen, Antworten, Statuspräferenzen und Kalenderänderungen werden gepuffert. Neue und geänderte Termine erscheinen in den zwischengespeicherten Listen. Neue Termine nutzen eine stabile Vorgangs-UUID; Wiederholungen liefern den vorhandenen Termin ohne weitere Serie oder erneuten Einladungsversand. Geänderte oder kontofremde Wiederverwendung wird abgelehnt. Beim Übertragen prüft der Server erneut die Berechtigung.

Kalender-Schnappschüsse bleiben im Tab und sind auf 4 MB und 100 Lesevorgänge begrenzt. Für die gemeinsame Warteschlange gelten weiterhin 1 MB, 1.000 Einträge und sieben Tage. Neue Serientermine zeigen bis zur serverseitigen Erweiterung den ersten Termin. Neue Kalender, Meetings, Freigaben, Passwortverwaltung und Gastzugänge benötigen eine Verbindung; Freigabepasswörter werden niemals gepuffert. Messages benötigt eine gespeicherte Raumliste, Study gespeicherte Sprach- und Präferenzdaten, bevor Offline-Navigation freigegeben wird.

## Anmeldung und Übertragung

Nach erfolgreicher Passwort- oder TFA-Anmeldung ersetzt die vorhandene SPA-Navigationsfunktion die Anmeldeseite durch das Dashboard. Der bestätigte Tab und gepufferte Arbeit bleiben dadurch erhalten, ohne die Schließwarnung des Browsers auszulösen. Die Ladeanzeige bleibt bis zum Abschluss der Navigation sichtbar; die optionale Zeitzonensynchronisierung folgt danach und verwirft Kontowechsel. Tatsächlich gepufferte Änderungen bleiben beim Schließen oder Neuladen eines authentifizierten Tabs durch die Warnung geschützt.

Die Übertragung beginnt erst nach erfolgreicher Sitzungsautorisierung und erforderlicher Zustimmung im Hintergrund. Eine separate Browsersperre serialisiert die Übertragung zwischen Tabs; kurze Speichersperren schützen Schnappschüsse und Bestätigungen, ohne auf Netzwerkantworten zu warten. Lesen und neue gepufferte Änderungen bleiben während langsamer Übertragungen möglich. Bestätigungen lesen den Speicher erneut, damit gleichzeitige Änderungen erhalten bleiben. Leere Warteschlangen werden bei der Authentifizierung nicht neu geschrieben; nicht authentifizierte Seiten warnen nicht vor dem Puffer eines anderen Kontos.

## Offline-Prüfung und Warnungen

Der Offline-Hinweis bietet Verbindung erneut prüfen mit gemeinsamen Schaltflächenstilen und Ladeanzeige. Die Aktion ruft sofort `/api/v1/system/healthcheck` auf, bündelt gleichzeitige Prüfungen, autorisiert bei erreichbarem Server die Sitzung erneut und versucht die Übertragung der Warteschlange. Erforderliche Zustimmung bleibt Voraussetzung. Bei Fehlern bleibt der Offline-Modus ohne Fehlerdialog aktiv. Automatische Prüfungen bleiben auf einmal je fünfzehn Minuten begrenzt; die ausdrückliche Aktion darf früher prüfen. Nach Wiederherstellung bleibt Aktualisieren verfügbar.

Hintergrundanalysen bleiben gespeichert, lösen aber keine Schließwarnung aus. Anbieter wählen `offline:outbox.register(owner, send, signal, { protectOnClose: false })`; Benutzeränderungen bleiben standardmäßig geschützt. Jeder neue Datensatz speichert die Einstufung, damit Anbieterfreigabe und Neuladen Telemetrie nicht zu einer ungespeicherten Änderung machen. Ältere Einträge nutzen die Erklärung aktiver Anbieter; unbekannte Anbieter bleiben geschützt. Die automatische Zeitzonenerkennung nutzt `saveUiPreferences(patch, { bufferOffline: false })`; der gebundene HTTP-Client lehnt dies offline ab, statt es zu puffern. Ausdrückliche Einstellungen, Nachrichten und Kalenderänderungen werden weiterhin gepuffert und geschützt.

## Entsperren und Modulladen

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
