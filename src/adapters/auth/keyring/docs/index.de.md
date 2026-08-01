# Benutzerschlüsselbund-Adapter

## Überblick

Der Benutzerschlüsselbund-Adapter speichert undurchsichtige, im Browser verschlüsselte Tresore für authentifizierte Konten. Er ist ein erforderlicher Authentifizierungsadapter, damit Passwörter, Verschlüsselungsschlüssel und andere benutzerspezifische Geheimnisse unabhängig vom aktiven Anmeldeanbieter über eine stabile Fähigkeit verfügbar sind.

Die Browser-Schnittstelle bleibt `src/adapters/auth/keyring/ui/keyring.js`. Ver- und Entschlüsselung erfolgen im Browser; der Adapter erhält niemals Klartextgeheimnisse.

## Verantwortlichkeiten

- Den Tresorspeicher über die Fähigkeit `db:executor` initialisieren.
- Routenfabrik und Tresorspeicher über `ctx` bereitstellen.
- Validierte, undurchsichtige Tresorumschläge speichern und zurückgeben.

Nicht verantwortlich für: Benutzeranmeldung, Schlüsselableitung oder Interpretation gespeicherter Geheimnisse.

## Architektur

`src/adapters/auth/keyring/index.ts` wird vom Authentifizierungs-Gateway entdeckt und stellt `auth:keyringVaultStore` sowie `auth:keyringRouteFactory` bereit. Das Gateway übergibt seinen Routenkontext an die Fabrik, sodass Authentifizierungsprüfungen injiziert bleiben. `src/adapters/auth/keyring/store.ts` greift ausschließlich über die Datenbank-Executor-Fähigkeit auf die Persistenz zu.

## Konfiguration

Der erforderliche Adapter besitzt keine konfigurierbaren Felder und verwendet den aktiven `db:executor`-Anbieter.

## API-Routen

| Methode | Pfad                   | Beschreibung                     | Authentifizierung |
| ------- | ---------------------- | -------------------------------- | ----------------- |
| GET     | `/api/v1/auth/keyring` | Verschlüsselten Tresor lesen.    | Benutzer          |
| PUT     | `/api/v1/auth/keyring` | Verschlüsselten Tresor ersetzen. | Benutzer          |
| DELETE  | `/api/v1/auth/keyring` | Verschlüsselten Tresor löschen.  | Benutzer          |

## Browser-Capability-API

Komponenten beziehen Schlüsselbundfunktionen über `uiCtx.capabilities` und importieren keine Adapter-Interna. `keyring:forComponent` erstellt einen zugeordneten Bereich; Geheimnisse werden anschließend über eine stabile, capability-eigene Kennung aufgelöst. Die Auflösung prüft vorhandene Werte und kann bei fehlenden oder ungültigen Werten nachfragen oder eine maßgebliche Quelle abfragen. Sperrstatus, Eintragsverwaltung, Passwortänderungen, Ereignisseiten und temporäre Gast-Schlüsselbunde stehen ebenfalls als Capabilities bereit.

## Entsperrverhalten bei der Anmeldung

Während der Anmeldung versucht der Adapter lediglich, einen vorhandenen Tresor mit dem Kontopasswort zu entschlüsseln. Ein fehlgeschlagener Versuch lässt den Tresor gesperrt und öffnet weder einen Entsperrdialog noch blockiert er die Navigation zum Dashboard. Der kontextbezogene Entsperrdialog wird erst angefordert, wenn eine Komponente durch das Schlüsselbund geschützte Inhalte auflöst.

## Wiederherstellung der Entsperrung in der Browsersitzung

Nach erfolgreicher Entsperrung speichert der Adapter den nicht exportierbaren Web-Crypto-Schlüssel in seinem IndexedDB-Sitzungsschlüsselspeicher und schreibt nur eine nicht geheime Markierung in `sessionStorage`. Nach dem Neuladen kann der entsperrte Tresor in derselben Registerkartensitzung wiederhergestellt werden, ohne das Passwort oder einen exportierbaren Schlüssel aufzubewahren. Explizites Sperren, automatische Sperrung, eine abweichende Kontoinstanz und das Sitzungsende verhindern die Wiederherstellung. Komponenten fordern Zugriff weiterhin über ihren zugeordneten Schlüsselbundbereich an; dieser versucht zuerst die Wiederherstellung und öffnet den kontextbezogenen Entsperrdialog nur, wenn sie nicht verfügbar ist.
