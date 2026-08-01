# Share Gateway

## Überblick

Das Share-Gateway verwaltet öffentliche Freigabetokens für Cognis-Ressourcen. Es erstellt, listet, widerruft und löst Freigabelinks über kanonische `ctx`-Flows auf, damit ressourcenbesitzende Gateways und Module teilnehmen können, ohne Share-Interna zu importieren.

## Share-Seite

Geteilte Ressourcen werden unter `/share/:token` geöffnet. Die Seite verwendet den Standard-Page-Composer mit einer reduzierten Shell, einer Cognis-Kopfzeile und einem Renderer, der von der besitzenden Komponente ausgewählt wird.

## Gast-Sitzungen

Beim Auflösen eines Share-Tokens stellt das Share-Gateway jetzt ein kurzlebiges Gast-Access-Token (`purpose: share`) bereit, das an genau diesen Share-Datensatz gebunden ist (`sub: share:<shareId>`). Die Share-Seite tauscht dieses Token temporär in `localStorage` ein, damit API-Aufrufe eingebetteter geteilter Seiten als anonyme Gast-Sitzung laufen, und stellt beim Verlassen das vorherige Token wieder her.

Anonyme Gäste entsperren niemals einen Kontoschlüsselbund. Share aktiviert den zugestellten Gastschlüsselbund mit dem vom Server ausgegebenen Sitzungsmaterial, hält ihn während der Gastsitzung ohne Benutzerpasswort offen und löscht seinen ausschließlich sitzungsgebundenen verschlüsselten Tresor am Sitzungsende. Suche und Speicherung im Kontoschlüsselbund stehen nur Besuchern mit einer bestätigten Nicht-Gast-Kontositzung zur Verfügung, auch nach der Aktualisierung einer Gastseite.

## Manifest-Vertrag

Freigabefähige Komponenten deklarieren in ihrem Manifest einen `share`-Block mit `shareable`, `mountScriptUrl`, `stringsBaseUrl` und `guestApiScopes`. Die Share-Seite priorisiert `mountScriptUrl`, damit geteilte Ressourcen echte Seitenkomponenten statt statischer Karten laden.

## Sicherheitsgrenze

Gast-Tokens sind auf genau einen Share-Datensatz begrenzt, laufen kurz aus (maximal vier Stunden und nie länger als das Share-Token) und schalten nur Routen frei, die Share-Umfang und Fähigkeiten explizit prüfen. Schreibende Routen behalten ihre bestehenden User-/Session-Prüfungen und lehnen Share-Gäste ab.

## Freigabesteuerung

Freigabedatensätze enthalten jetzt vom Gateway verwaltete Zugriffskontrollen: Lese-/Schreibberechtigungen, typisierte Empfänger für In-App-Benutzer, Gruppen/Klassen und E-Mail-Empfänger, optionalen Passwortschutz und ein Wasserzeichen-Flag für schreibgeschützte Freigaben. Das Share-Gateway stellt generische Routen zum Erstellen und Aktualisieren von Tokens bereit, sodass Module Freigaben über `ctx` oder `/api/v1/share/tokens` anfordern und weder Empfängerzustellung noch Berechtigungsbearbeitung selbst besitzen. Schreibgeschützte Freigaben erhalten standardmäßig ein Wasserzeichen, während schreibbare Freigaben diese Vorgabe entfernen, sofern der Aufrufer sie nicht ausdrücklich beibehält.

## Adapter für Freigabemethoden

Das Popup erkennt Freigabemethoden über Adapter des Share-Gateways und zeigt sie in einer Methodenleiste. Link und Benutzer verwalten jeweils ihre Eingabeaufbereitung und Popup-Seite; der Verlauf wird nach der ausgewählten Methode gefiltert.

## Ablauf und Schutz

Beide integrierten Methoden akzeptieren optional ein genaues Ablaufdatum mit Uhrzeit; ohne Angabe läuft die Freigabe nicht ab. Hashing und Prüfung von Passwörtern verbleiben im Share-Gateway. Ressourcenkomponenten können Link-Zugriffsarten mit passenden Berechtigungen und Fähigkeiten bereitstellen.

## Rückmeldung zur Empfängerzustellung und Passwort-Aliasse

Eine Freigabekomponente kann eine allgemeine Zustellungsrückmeldung mit Übersetzungsschlüssel und Basis-URL der Komponentenübersetzungen zurückgeben. Die authentifizierte Benachrichtigungsaktion zeigt diese Rückmeldung vor der Navigation zur zugestellten Ressource an. Nach dem Auflösen eines geschützten Tokens speichert Share das bestätigte Passwort sowohl unter dem undurchsichtigen Link-Token als auch unter der kanonischen Freigabekennung, damit die empfangende Komponente es ohne erneute Abfrage verwenden kann.

## Auflösung und Widerrufsoberfläche

Der Browser prüft die Tokenauflösung, ohne den Kontoschlüsselbund zu öffnen. Erst eine `401 password_required`-Anforderung erlaubt die Wiederherstellung des Kontoschlüsselbunds und einen Versuch mit dem gespeicherten Passwort; `404`-Antworten zeigen den lokalisierten Zustand für nicht mehr vorhandene Freigaben. Jeder Widerruf erfordert einen Bestätigungsdialog, bevor die Löschanfrage gesendet wird.

## Eingebettete Komponenten-Renderer

Ein Komponenten-Seitendeskriptor kann `preserveShareShell: true` zusammen mit `mountScriptUrl` setzen. Share behält dann Standard-Page-Composer, Kopfzeile, Theme-Steuerung, Fußzeile, Stile und Lebenszyklus bei und übergibt der Komponente einen eigenen `#share-resource-mount-root`. Vollseitenanwendungen können die Shell weiterhin ersetzen, indem sie dieses Flag weglassen.
