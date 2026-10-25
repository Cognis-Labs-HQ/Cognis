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

Verschlüsselte Browser-Tresore werden getrennt nach Origin, Konto-ID und serverseitiger Kontoinstanz-ID gespeichert. Vor dem Laden muss der Server Konto und Instanz bestätigen. Passwörter und Entschlüsselungsschlüssel bleiben ausschließlich im Arbeitsspeicher; alte IndexedDB-Entsperrschlüssel werden entfernt. Nach Neuladen ist das Schlüsselbund-Passwort erneut nötig, außer eine Passwortanmeldung entschlüsselt den Tresor erfolgreich. Kontowechsel brechen offene Dialoge und kryptografische Vorgänge ab. Entsperren erstellt keinen fehlenden Schlüsselbund; dafür ist die ausdrückliche Einrichtung oder Erstellen erforderlich.

## Offline-Status und Wiederherstellung der Navigation

Ein schließbarer Hinweis im Kopfbereich nutzt die gemeinsamen Hinweisstile und zeigt den Offline-Modus an. Nach Wiederverbindung bietet er Aktualisieren an, statt automatisch neu zu laden; die Aktion beachtet ungespeicherte und gepufferte Änderungen. Eine nicht verfügbare Seite versucht zuerst, die vorherige nutzbare Seite wiederherzustellen. Schlägt dies fehl, wird nach Wiederverbindung eine geschützte automatische Aktualisierung aktiviert. Absolute und relative Links derselben Origin verwenden den SPA-Router. Der Offline-Katalog behält öffentliche zwischengespeicherte Seiten sowie vom Anbieter freigegebene private Routen.

## Abfragelimits im Offline-Modus

Im Offline-Modus stoppen die Einwilligungsabfragen und normalen Wiederherstellungsabfragen. Nur eine kleine Server-Gesundheitsabfrage läuft alle fünfzehn Minuten, auch bei wiederholten Online-Ereignissen des Browsers. Fehlgeschlagene Online-Verbindungsprüfungen werden bis auf fünfzehn Minuten verlangsamt. Einwilligungsabfragen werden bei Fehlern bis auf fünf Minuten verlangsamt, offline vollständig gestoppt und nach Wiederverbindung fortgesetzt. Die erforderliche zwischengespeicherte Zustimmung bleibt Voraussetzung für Offline-Zugriff.
