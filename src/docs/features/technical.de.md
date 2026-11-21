# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Plattform-Features.

## Schnittstellen

Öffentliche Verträge gehören ihren Eigentümern: Auth verwaltet Sitzungen, Lernen Inhalte und Übungen, Social Profile, Räume und Signalisierung, Kalender Termine und Share Freigaben. Nicht jede UI-Funktion hat einen eigenen HTTP-Endpunkt. OIDC und SAML benötigen einen injizierten Protokollclient; Schemas allein implementieren keine Fernanmeldung.

## Konfiguration

### Bestätigte Einstellungskopien

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Konfigurierbare obere Banner

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

## Verhalten

### Begrenzte Kopien ersetzen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Benachrichtigungen per Konto-ID

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Überblick

Cognis ist eine selbst gehostete Sprachlernplattform, die strukturierte Lerninhalte mit sozialen Features, pluggbarer Authentifizierung, flexibler Persistenz und einer Echtzeit-Kollaborationsbereitschaftsschicht kombiniert.

### Kernfähigkeiten

- **Authentifizierung und Identität** — pluggbare Auth-Adapter unterstützen lokale Anmeldedaten, LDAP-Verzeichnisdienste, SAML 2.0 und OAuth2/OIDC-Anbieter.
- **Modulare Sprachinhaltslieferung** — das Modulsystem erlaubt Lehrplaneinheiten als Module zu verpacken und zur Laufzeit zu installieren.
- **Konfigurierbare UI-Seiten** — jede Seite verwendet `createPageComposer` für wiederverwendbare Layout-Slots und Pro-Benutzer-Präferenzpersistenz.
- **Leichtgewichtiges soziales Netzwerk** — öffentliche Profile, Microblog-Posts, Follower-/Following-Graphen und Blockierungsverwaltung.
- **API-First-Architektur** — jedes Feature ist über eine versionierte HTTP-API mit stabilen `{ data }` / `{ error }` Antwort-Envelopes zugänglich.

### Lernmodi

- **Unabhängige Lernende** arbeiten in ihrem eigenen Tempo durch modulare Sprachinhalte.
- **Lehrer und Tutoren** leiten Sitzungen mit der `teacher`-Rolle.
- **Gemeinschaften** organisieren gemeinsame Lernrhythmen mit sozialen Features.

### Adapter-Abdeckung

| Bereich            | Eingebaute Adapter              |
| ------------------ | ------------------------------- |
| Datenbank          | `memory`, `mariadb`, `postgres` |
| Auth               | `local`, `ldap`, `saml`, `oidc` |
| Dateispeicher      | `local`                         |
| Benachrichtigungen | `smtp`                          |

### Admin-Fähigkeiten

- Vollständiges Gateway-Management (aktivieren/deaktivieren, Auth-Adapter konfigurieren).
- Modul-Installation und Lifecycle-Management.
- Pro-Kategorie-Dateigrößenbeschränkungen.
- System-Health- und Diagnose-Endpunkte.

### Registrierung und Suche

Die Administration speichert die öffentliche Registrierung lokaler Konten unabhängig vom Registrierungsadapter. Bei aktiviertem öffentlichen Adapter und ausgeschalteter lokaler Registrierung können SSO-Konten angelegt werden, ohne öffentliche Benutzername/Passwort-Registrierung zu erlauben. Das Deaktivieren des Adapters sperrt auch diesen Bereitstellungspfad; Einladungstoken bleiben über ihren eigenen Adapter verfügbar. Die globale Suche liefert Teilergebnisse, bricht ersetzte Suchanfragen ab und begrenzt die Laufzeit der Suchanbieter. Dokumenttitel erscheinen vor den Inhalten; vier abbrechbare Arbeitsabläufe indizieren Dokumenttexte statt die gesamte Bibliothek gleichzeitig abzurufen.

### Verbindung und Konten

Offline-Richtlinien und Routenmetadaten verwenden einen getrennten Steuercache. Kataloganfragen werden zusammengefasst, Richtlinienänderungen behalten ihre Reihenfolge, Nachrichten schließen ihre Ports und die Asset-Bereinigung im Hintergrund verzögert keine Bestätigungen. Die Installation ruft höchstens vier Assets gleichzeitig ab. Die Anmeldung wartet nicht auf öffentliche Cache-Wartung und zeigt das gemeinsame Laderad bei Zugangsdaten-, TFA-Code- und SSO-Anfragen. Interaktive Einrichtung bleibt bedienbar. Die Erreichbarkeitsprüfung antwortet sofort; ausführliche Komponentenprüfungen bleiben unter `/api/v1/system/health`.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/registration/token/technical).

### Benutzerliste

Die Benutzerliste nutzt die verfügbare Breite des Composers. Jedes Konto bildet eine vollständige aufklappbare Zeile mit Identität, Rolle, Status und Verwaltungsaktionen im Kopf; die ausgeklappten Metadaten erstrecken sich darunter über die ganze Zeile. Ein responsives Raster zeigt Beschriftungen und Werte, lokalisierte Rollen- und Anbieternamen sowie eigene E-Mail-Zeilen mit Hauptadress- und Verifizierungskennzeichen. Auf kleinen Bildschirmen werden die Steuerelemente umgebrochen und die Metadaten einspaltig angezeigt.

### Kontodatenschutz und Schlüsselbund-Isolation

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/auth/technical).

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Status und Wiederherstellung der Navigation

Ein dauerhafter Hinweis im Kopfbereich nutzt die gemeinsamen Hinweisstile und zeigt den Offline-Modus an. Nach Wiederverbindung bietet er Aktualisieren an, statt automatisch neu zu laden; die Aktion beachtet ungespeicherte und gepufferte Änderungen. Eine nicht verfügbare Seite versucht zuerst, die vorherige nutzbare Seite wiederherzustellen. Schlägt dies fehl, wird nach Wiederverbindung eine geschützte automatische Aktualisierung aktiviert. Absolute und relative Links derselben Origin verwenden den SPA-Router. Der Offline-Katalog behält öffentliche zwischengespeicherte Seiten sowie vom Anbieter freigegebene private Routen.

### Abfragelimits im Offline-Modus

Im Offline-Modus stoppen die Einwilligungsabfragen und normalen Wiederherstellungsabfragen. Nur eine kleine Server-Gesundheitsabfrage läuft alle fünfzehn Minuten, auch bei wiederholten Online-Ereignissen des Browsers. Fehlgeschlagene Online-Verbindungsprüfungen werden bis auf fünfzehn Minuten verlangsamt. Einwilligungsabfragen werden bei Fehlern bis auf fünf Minuten verlangsamt, offline vollständig gestoppt und nach Wiederverbindung fortgesetzt. Die erforderliche zwischengespeicherte Zustimmung bleibt Voraussetzung für Offline-Zugriff.

### Plötzlicher Verbindungsverlust

Kann die aktuelle Seite offline nicht verwendet werden, beendet der Host ihren Seitenlebenszyklus und versucht ohne Fehlerdialog zur vorherigen offlinefähigen Seite zurückzukehren. Schlägt dies fehl, erklärt der Hinweis im Kopfbereich die nicht verfügbare Seite und der Inhalt wird geleert; bei erneuter Verbindung wird eine durch Navigationsschutz abgesicherte automatische Aktualisierung versucht. Präsenz-Timer pausieren offline und starten nach Wiederherstellung neu. Erfolgreich geladene öffentliche Übersetzungen werden im Tab wiederverwendet; geschützte Kataloge erfordern weiterhin authentifizierte Anfragen.

### Ein Offline-Hinweis

Offline-Status und Angaben zur nicht verfügbaren Seite stehen gemeinsam in einem einzigen Hinweis im Kopfbereich ohne Schließen-Aktion. Nach Wiederverbindung erscheinen dort die Wiederherstellungsmeldung und eine Aktualisieren-Schaltfläche mit gemeinsamen Schaltflächenstilen und Aktionsabständen. Standardstile der Oberfläche erhalten ausdrücklich gewählte Bestätigen-, Abbrechen- und neutrale Schaltflächenstile. Seiten ohne Kopfbereich verwenden einen einzelnen Hinweis im Inhalt.

### Offline-Assets und Kalender

Die Auflösung von Produktions-Assets berücksichtigt nun Arrays, einschließlich benötigter Skripte und Stylesheets. Versionierte und unversionierte öffentliche Asset-URLs teilen sich Cache-Schlüssel; Modulrevisionen bleiben getrennt. Zwei Hintergrundprozesse bereiten unterstützten Seitencode und inaktive Styles vor, ohne Seiten einzuhängen. Offline-Links erfordern vorbereiteten Code und die nötigen konto- und sitzungsgebundenen Schnappschüsse. Das erneute Zeichnen der Navigation erhält die Sperre, sodass Meetings deaktiviert bleibt. Private APIs und authentifiziertes HTML gelangen weiterhin nicht in den Worker-Cache.

Nach bestätigter Anmeldung speichert Calendar Kalenderlisten, Einladungen und eigene Termine mit höchstens zwei gleichzeitigen Hintergrundanfragen. Eine Cache-Invalidierung erneuert diese Schnappschüsse, ohne die Anmeldung aufzuhalten. Gespeicherte Termine bleiben lesbar; neue Termine, Änderungen, Löschungen, Antworten, Statuspräferenzen und Kalenderänderungen werden gepuffert. Neue und geänderte Termine erscheinen in den zwischengespeicherten Listen. Neue Termine nutzen eine stabile Vorgangs-UUID; Wiederholungen liefern den vorhandenen Termin ohne weitere Serie oder erneuten Einladungsversand. Geänderte oder kontofremde Wiederverwendung wird abgelehnt. Beim Übertragen prüft der Server erneut die Berechtigung.

Kalender-Schnappschüsse bleiben im Tab und sind auf 4 MB und 100 Lesevorgänge begrenzt. Für die gemeinsame Warteschlange gelten weiterhin 1 MB, 1.000 Einträge und sieben Tage. Neue Serientermine zeigen bis zur serverseitigen Erweiterung den ersten Termin. Neue Kalender, Meetings, Freigaben, Passwortverwaltung und Gastzugänge benötigen eine Verbindung; Freigabepasswörter werden niemals gepuffert. Messages benötigt eine gespeicherte Raumliste, Study gespeicherte Sprach- und Präferenzdaten, bevor Offline-Navigation freigegeben wird.

### Anmeldung und Übertragung

Nach erfolgreicher Passwort- oder TFA-Anmeldung ersetzt die vorhandene SPA-Navigationsfunktion die Anmeldeseite durch das Dashboard. Der bestätigte Tab und gepufferte Arbeit bleiben dadurch erhalten, ohne die Schließwarnung des Browsers auszulösen. Die Ladeanzeige bleibt bis zum Abschluss der Navigation sichtbar; die optionale Zeitzonensynchronisierung folgt danach und verwirft Kontowechsel. Tatsächlich gepufferte Änderungen bleiben beim Schließen oder Neuladen eines authentifizierten Tabs durch die Warnung geschützt.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Prüfung und Warnungen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Entsperren und Modulladen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Gemeinsame obere Hinweise

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Leere Offline-Lernseiten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Direktes Laden und Stile

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Lernressourcen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

### Dauerhaft vorgemerkte Änderungen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Verfügbarkeit

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Gemeinsame Lernfavoriten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Öffentliche Ressourcen im Cache

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Dauerhafter Ressourcen-Cache

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Arbeitsbereich

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Offline-Übungen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Persönliche Offline-Optionen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Vorbereitete Lernkarten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Orbitron offline

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Sanfte Übergänge und Navigation

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Einheitliche Offline-Rückmeldung

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Sichtbare Offline-Ziele

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

### Direkter UI-Sprachwechsel

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Weniger Online-Anfragen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Abmeldung im Offline-Modus

Abmelden bleibt im Offline-Modus sichtbar, ist jedoch wie andere nicht verfügbare Menüeinträge deaktiviert. Nach Wiederherstellung der Verbindung ist die Aktion wieder verfügbar. Eine Offline-Aktivierung kann weder die Abmeldung starten noch die lokale Sitzung verwerfen, bevor das Sitzungstoken auf dem Server widerrufen werden kann.

### Sitzungs- und Modulgrenzen

Nur eine unmittelbar aufeinanderfolgende identische Änderung desselben Zustellungsanbieters wird unterdrückt. Andere Methoden, Pfade, Medientypen und dazwischenliegende Vorgänge behalten ihre Reihenfolge. Offline-Pufferung und erneute Zustellung erfordern neben der aktuellen Zustimmung die Auth-Fähigkeit `session:isOfflineValid`. Sie prüft bestätigte Einrichtungsbereitschaft, Konto, Token und Sitzungsablauf ohne Netzwerkanfrage, auch nach Wartezeiten auf Speichersperren. Fehlt der Auth-Vertrag, wird der Zugriff verweigert. Einstellungen binden Kontosteuerungen vor dem optionalen Laden der E-Mails. Bei deaktiviertem Notify wird die E-Mail-Verwaltung ausgeblendet; Archivieren, Deaktivieren und Löschen bleiben nutzbar. Benutzerverwaltung und Administration verwenden bereichsgebundene Notify-Fähigkeiten statt konkreter UI-Importe. Notify stellt administrative E-Mail-Abfragen, erneuten Versand nur bei Verbindung und SMTP-Verfügbarkeit bereit. Fehlende E-Mail-Metadaten werden als unbekannt angezeigt. Auth überspringt normale Kontoeinrichtung für alternative Gastsitzungen und verwendet Shares Klassifizierungsfähigkeit zur Gastprüfung an der Servergrenze. E-Mail- und TFA-Einrichtung echter Konten bleiben verbindlich.

### Kontogebundene Warteschlangen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Bestätigte Favoriten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Unabhängige Emoji-Nutzung

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Kontobezogene Benutzermenüs

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Vollständige Cache-Ressourcen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

## Sicherheit

### Zugriff auf Dashboard und Study

Das Dashboard deklariert privaten Offline-Zugriff innerhalb der Sitzung; Kontoübersicht und zwischengespeicherte bevorstehende Termine bleiben nutzbar. Beim erneuten Offline-Öffnen werden optionale, vom Server geladene Erweiterungen ausgelassen. Der Study-Anbieter registriert die Übersichtsroute und nutzt über `study:navigation`-Abläufe konto- und sitzungsgebundene Schnappschüsse von Sprachkatalogen, Lernpräferenzen und Modulverweisen. Beim Laden der Navigationsleiste werden diese kleinen Metadaten vorab geladen. Explore und Lernkarten behalten ihre anbietergebundenen Routendeklarationen; nicht unterstützte Seiten nutzen weiterhin die stille Wiederherstellung. Die Auswahl zu lernender Sprachen erfordert eine Verbindung. Beim erneuten Öffnen der Oberfläche wird keine Theme-Präferenz mehr automatisch geschrieben. Ausdrückliche Änderungen der Oberflächeneinstellungen nutzen den aktiven Profile-Client und damit dessen Offline-Puffer; verzögerte Zusammenführungen prüfen weiterhin das Konto.

## Referenz

- [src/api/reuse/ui-registry.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/reuse/ui-registry.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
