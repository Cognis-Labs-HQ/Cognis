# Share Gateway

## Überblick

Das Share-Gateway verwaltet öffentliche Freigabetokens für Cognis-Ressourcen. Es erstellt, listet, widerruft und löst Freigabelinks über kanonische `ctx`-Flows auf, damit ressourcenbesitzende Gateways und Module teilnehmen können, ohne Share-Interna zu importieren.

## Share-Seite

Geteilte Ressourcen werden unter `/share/:token` geöffnet. Die Seite verwendet den Standard-Page-Composer mit einer reduzierten Shell, einer Cognis-Kopfzeile und einem Renderer, der von der besitzenden Komponente ausgewählt wird.

## Gast-Sitzungen

Beim Auflösen eines Share-Tokens stellt das Share-Gateway jetzt ein kurzlebiges Gast-Access-Token (`purpose: share`) bereit, das an genau diesen Share-Datensatz gebunden ist (`sub: share:<shareId>`). Die Share-Seite tauscht dieses Token temporär in `localStorage` ein, damit API-Aufrufe eingebetteter geteilter Seiten als anonyme Gast-Sitzung laufen, und stellt beim Verlassen das vorherige Token wieder her.

## Manifest-Vertrag

Freigabefähige Komponenten deklarieren in ihrem Manifest einen `share`-Block mit `shareable`, `mountScriptUrl`, `stringsBaseUrl` und `guestApiScopes`. Die Share-Seite priorisiert `mountScriptUrl`, damit geteilte Ressourcen echte Seitenkomponenten statt statischer Karten laden.

## Sicherheitsgrenze

Gast-Tokens sind auf genau einen Share-Datensatz begrenzt, laufen kurz aus (maximal vier Stunden und nie länger als das Share-Token) und schalten nur Routen frei, die Share-Umfang und Fähigkeiten explizit prüfen. Schreibende Routen behalten ihre bestehenden User-/Session-Prüfungen und lehnen Share-Gäste ab.

## Freigabesteuerung

Freigabedatensätze enthalten jetzt vom Gateway verwaltete Zugriffskontrollen: Lese-/Schreibberechtigungen, typisierte Empfänger für In-App-Benutzer, Gruppen/Klassen und E-Mail-Empfänger, optionalen Passwortschutz und ein Wasserzeichen-Flag für schreibgeschützte Freigaben. Das Share-Gateway stellt generische Routen zum Erstellen und Aktualisieren von Tokens bereit, sodass Module Freigaben über `ctx` oder `/api/v1/share/tokens` anfordern und weder Empfängerzustellung noch Berechtigungsbearbeitung selbst besitzen. Schreibgeschützte Freigaben erhalten standardmäßig ein Wasserzeichen, während schreibbare Freigaben diese Vorgabe entfernen, sofern der Aufrufer sie nicht ausdrücklich beibehält.
