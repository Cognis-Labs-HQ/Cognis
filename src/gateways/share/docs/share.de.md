# Share Gateway

## Überblick

Das Share-Gateway verwaltet öffentliche Freigabetokens für Cognis-Ressourcen. Es erstellt, listet, widerruft und löst Freigabelinks über kanonische `ctx`-Flows auf, damit ressourcenbesitzende Gateways und Module teilnehmen können, ohne Share-Interna zu importieren.

## Share-Seite

Geteilte Ressourcen werden unter `/share/:token` geöffnet. Die Seite verwendet den Standard-Page-Composer mit einer reduzierten Shell, einer Cognis-Kopfzeile und einem Renderer, der von der besitzenden Komponente ausgewählt wird.

Solange die aufgelöste Route für geteilte Inhalte aktiv ist, können sowohl angemeldete Teilnehmende mit direktem Zugriff als auch Gäste synchronisierte Komponentenfenster ohne erneute Browseraktivierung empfangen. Die Anfragen durchlaufen weiterhin die Prüfung des Komponenten-Seiten-Brokers für Host-Element und Lebenszyklus.

Nach erfolgreicher Freigabeauthentifizierung verwirft die Seite jedes anonyme Ergebnis der SPA-Routenermittlung, bevor der Ressourcen-Renderer eingebunden wird. Die Auflösung von Komponentenfenstern lädt dadurch den aktivierten Komponenten-Seiten-Katalog mit den aktiven Gast- oder Kontozugangsdaten neu, statt einen leeren Cache aus der Zeit vor der Authentifizierung beizubehalten.

## Gast-Sitzungen

Beim Auflösen eines Share-Tokens stellt das Share-Gateway jetzt ein kurzlebiges Gast-Access-Token (`purpose: share`) bereit, das an genau diesen Share-Datensatz gebunden ist (`sub: share:<shareId>`). Die Share-Seite tauscht dieses Token temporär in `localStorage` ein, damit API-Aufrufe eingebetteter geteilter Seiten als anonyme Gast-Sitzung laufen, und stellt beim Verlassen das vorherige Token wieder her. Nachdem das eingeschränkte Gast-Token aktiv ist, lädt die Freigabeseite die UI-Capability-Provider des Hosts, bevor der Ressourcen-Renderer importiert wird, sodass freigegebene Komponenten deklarierte Capabilities wie die Profilavatar-Darstellung verwenden können.

Anonyme Gäste entsperren niemals einen Kontoschlüsselbund. Share aktiviert den zugestellten Gastschlüsselbund mit dem vom Server ausgegebenen Sitzungsmaterial, hält ihn während der Gastsitzung ohne Benutzerpasswort offen und löscht seinen ausschließlich sitzungsgebundenen verschlüsselten Tresor am Sitzungsende. Suche und Speicherung im Kontoschlüsselbund stehen nur Besuchern mit einer bestätigten Nicht-Gast-Kontositzung zur Verfügung, auch nach der Aktualisierung einer Gastseite.

## Manifest-Vertrag

Freigabefähige Komponenten deklarieren in ihrem Manifest einen `share`-Block mit `shareable`, `mountScriptUrl`, `stringsBaseUrl` und `guestApiScopes`. Die Share-Seite priorisiert `mountScriptUrl`, damit geteilte Ressourcen echte Seitenkomponenten statt statischer Karten laden.

## Sicherheitsgrenze

Gast-Tokens sind auf genau einen Share-Datensatz begrenzt, laufen kurz aus (maximal vier Stunden und nie länger als das Share-Token) und schalten nur Routen frei, die Share-Umfang und Fähigkeiten explizit prüfen. Schreibende Routen behalten ihre bestehenden User-/Session-Prüfungen und lehnen Share-Gäste ab.

## Freigabesteuerung

Freigabedatensätze enthalten jetzt vom Gateway verwaltete Zugriffskontrollen: Lese-/Schreibberechtigungen, typisierte Empfänger für In-App-Benutzer, Gruppen/Klassen und E-Mail-Empfänger, optionalen Passwortschutz und ein Wasserzeichen-Flag für schreibgeschützte Freigaben. Das Share-Gateway stellt generische Routen zum Erstellen und Aktualisieren von Tokens bereit, sodass Module Freigaben über `ctx` oder `/api/v1/share/tokens` anfordern und weder Empfängerzustellung noch Berechtigungsbearbeitung selbst besitzen. Schreibgeschützte Freigaben erhalten standardmäßig ein Wasserzeichen, während schreibbare Freigaben diese Vorgabe entfernen, sofern der Aufrufer sie nicht ausdrücklich beibehält. Der gatewayeigene Schaltflächen-Renderer kombiniert stets das kanonische Freigabesymbol mit der lokalisierten Bezeichnung „Teilen“.

## Adapter für Freigabemethoden

Das Popup erkennt Freigabemethoden über Adapter des Share-Gateways und zeigt sie in einer Methodenleiste. Link und Benutzer verwalten jeweils ihre Eingabeaufbereitung und Popup-Seite; der Verlauf wird nach der ausgewählten Methode gefiltert.

## Ablauf und Schutz

Beide integrierten Methoden akzeptieren optional ein genaues Ablaufdatum mit Uhrzeit; ohne Angabe läuft die Freigabe nicht ab. Hashing und Prüfung von Passwörtern verbleiben im Share-Gateway. Ressourcenkomponenten können Link-Zugriffsarten mit passenden Berechtigungen und Fähigkeiten bereitstellen.

## Rückmeldung zur Empfängerzustellung und Passwort-Aliasse

Eine Freigabekomponente kann eine allgemeine Zustellungsrückmeldung mit Übersetzungsschlüssel und Basis-URL der Komponentenübersetzungen zurückgeben. Die authentifizierte Benachrichtigungsaktion zeigt diese Rückmeldung vor der Navigation zur zugestellten Ressource an. Nach dem Auflösen eines geschützten Tokens speichert Share das bestätigte Passwort sowohl unter dem undurchsichtigen Link-Token als auch unter der kanonischen Freigabekennung, damit die empfangende Komponente es ohne erneute Abfrage verwenden kann.

## Auflösung und Widerrufsoberfläche

Der Browser prüft die Tokenauflösung, ohne den Kontoschlüsselbund zu öffnen. Erst eine `401 password_required`-Anforderung erlaubt die Wiederherstellung des Kontoschlüsselbunds und einen Versuch mit dem gespeicherten Passwort; `404`-Antworten zeigen den lokalisierten Zustand für nicht mehr vorhandene Freigaben. Jeder Widerruf erfordert einen Bestätigungsdialog, bevor die Löschanfrage gesendet wird.

## Grenze für Komponentenfenster

Eine eingebundene Link-Freigabeseite darf eine ansonsten gültige Komponentenseite programmgesteuert öffnen, was für synchronisierte Meeting-Peripherie erforderlich ist. Diese Autorisierung gilt nur für den Browser-Fenstervorgang: Das besitzende Modul muss weiterhin gastgeeignete Zustandsrouten bereitstellen und den Freigabegast gegen seine übergeordnete Ressource prüfen; eine untergeordnete Komponente muss delegierten Zugriff auf ihre Ressource ausdrücklich akzeptieren. Share deutet eine Meeting-Freigabe nicht als Whiteboard-Freigabe um und umgeht keine API-Autorisierung der Komponenten.
