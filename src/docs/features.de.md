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
