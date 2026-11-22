# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Freigaben.

## Schnittstellen

### Manifest-Vertrag

Freigabefähige Komponenten deklarieren in ihrem Manifest einen `share`-Block mit `shareable`, `mountScriptUrl`, `stringsBaseUrl` und `guestApiScopes`. Die Share-Seite priorisiert `mountScriptUrl`, damit geteilte Ressourcen echte Seitenkomponenten statt statischer Karten laden.

### Vertrag für delegierten Zugriff

`share:resolveDelegatedAccess` akzeptiert Gast-Claims sowie `resourceType`, `resourceId` und `requiredCapability` des Ziels. Share löst die ursprüngliche Ressource des Tokens auf und führt `resolve-share-delegated-access` mit `{ source, target }` aus. Ein Hook der Quellressource darf nur autorisieren, indem er die exakten Quell- und Zielkennungen, eine nicht leere `sourceCapability` und `allowedCapabilities` zurückgibt. Share prüft unabhängig, dass das ursprüngliche Token `sourceCapability` gewährt; abweichende Kennungen oder Fähigkeiten werden sicher abgelehnt. Zielkomponenten importieren oder benennen den Quellanbieter niemals.

## Konfiguration

Teilbare Manifeste deklarieren Renderer und Gastbereiche. Freigaben speichern Rechte, Empfänger, Ablauf und Schutz; Adapter besitzen Eingabeseiten.

## Verhalten

### Share-Browserclient

Adapter deklarieren ihre eigenen Navbar-Anbieter, die ihrem Aktivierungszustand folgen. Die Senderermittlung nutzt `notify:listSenders` ohne konkrete Notification-Gateway-Instanz. Regelmäßige Share-Wartung stoppt bei Deaktivierung und beginnt bei Aktivierung erneut.

Der Share-Browserclient ermöglicht Modulen, das aktuell authentifizierte Freigabegastprofil über den öffentlichen Browservertrag des Share-Gateways abzurufen.

### Verwendungsbeispiele

`uiCtx` importieren, `share:uiClient` anfordern und `getGuestProfile()` aufrufen. Vor dem Lesen der JSON-Nutzdaten `{ data }` die zurückgegebene `Response` prüfen.

### Zuverlässige Freigaben und Tests

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/study/flashcards/technical).

Die Flashcard-Übung für Gäste verwendet eine vorübergehende Modusauswahl und deaktiviert Kontofunktionen sowie gespeicherte Layouteinstellungen. Sie liest oder schreibt keine Übungseinstellungen eines Kontos.

### Prüfung und Lebenszyklus

Share-Adapter können `defineContracts(ctx)` exportieren. Share ruft diese Funktion vor der Konstruktion der Methode mit der gemeinsamen Vertragsregistrierung und einem adaptereigenen Bootstrap-Bereich auf. Ungültige Methoden rollen ihre Definitionen zurück und protokollieren sichere Fehlermetadaten. Definitionen folgen der Deaktivierung und Reaktivierung des Gateways.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/study/flashcards/technical).

### Browsereigene Aktionen

Geteilte Ressourcen liefern `page.mountScriptUrl` mit einem exportierten `mount(root, options)`. Der Einstiegspunkt erhält den Freigabekontext, lokalisierte Texte und das Abbruchsignal der Seite. Fehlende Einstiegspunkte erzeugen den lokalisierten Rendererfehler.

### Überblick

Das Share-Gateway verwaltet öffentliche Freigabetokens für Cognis-Ressourcen. Es erstellt, listet, widerruft und löst Freigabelinks über kanonische `ctx`-Flows auf, damit ressourcenbesitzende Gateways und Module teilnehmen können, ohne Share-Interna zu importieren.

### Share-Seite

Geteilte Ressourcen werden unter `/share/:token` geöffnet. Die Seite verwendet den Standard-Page-Composer mit einer reduzierten Shell, einer Cognis-Kopfzeile und einem Renderer, der von der besitzenden Komponente ausgewählt wird.

Solange die aufgelöste Route für geteilte Inhalte aktiv ist, können sowohl angemeldete Teilnehmende mit direktem Zugriff als auch Gäste synchronisierte Komponentenfenster ohne erneute Browseraktivierung empfangen. Die Anfragen durchlaufen weiterhin die Prüfung des Komponenten-Seiten-Brokers für Host-Element und Lebenszyklus.

Nach erfolgreicher Freigabeauthentifizierung verwirft die Seite jedes anonyme Ergebnis der SPA-Routenermittlung, bevor der Ressourcen-Renderer eingebunden wird. Die Auflösung von Komponentenfenstern lädt dadurch den aktivierten Komponenten-Seiten-Katalog mit den aktiven Gast- oder Kontozugangsdaten neu, statt einen leeren Cache aus der Zeit vor der Authentifizierung beizubehalten.

Komponentenfenster für Gäste erhalten außerdem den aktiven Share-Kontext als Mount-Option des Anbieters. Eingebettete Komponenten können dadurch die Gastsitzung beibehalten und deren delegierten Ressourcenbereich verwenden, statt die Einbindung als gewöhnliche Seite nur für Konten zu behandeln.

### Gast-Sitzungen

Beim Auflösen eines Share-Tokens stellt das Share-Gateway jetzt ein kurzlebiges Gast-Access-Token (`purpose: share`) bereit, das an genau diesen Share-Datensatz gebunden ist (`sub: share:<shareId>`). Die Share-Seite tauscht dieses Token temporär in `localStorage` ein, damit API-Aufrufe eingebetteter geteilter Seiten als anonyme Gast-Sitzung laufen, und stellt beim Verlassen das vorherige Token wieder her. Nachdem das eingeschränkte Gast-Token aktiv ist, lädt die Freigabeseite die UI-Capability-Provider des Hosts, bevor der Ressourcen-Renderer importiert wird, sodass freigegebene Komponenten deklarierte Capabilities wie die Profilavatar-Darstellung verwenden können.

Anonyme Gäste entsperren niemals einen Kontoschlüsselbund. Share aktiviert den zugestellten Gastschlüsselbund mit dem vom Server ausgegebenen Sitzungsmaterial, hält ihn während der Gastsitzung ohne Benutzerpasswort offen und löscht seinen ausschließlich sitzungsgebundenen verschlüsselten Tresor am Sitzungsende. Suche und Speicherung im Kontoschlüsselbund stehen nur Besuchern mit einer bestätigten Nicht-Gast-Kontositzung zur Verfügung, auch nach der Aktualisierung einer Gastseite.

### Freigabesteuerung

Freigabedatensätze enthalten jetzt vom Gateway verwaltete Zugriffskontrollen: Lese-/Schreibberechtigungen, typisierte Empfänger für In-App-Benutzer, Gruppen/Klassen und E-Mail-Empfänger, optionalen Passwortschutz und ein Wasserzeichen-Flag für schreibgeschützte Freigaben. Das Share-Gateway stellt generische Routen zum Erstellen und Aktualisieren von Tokens bereit, sodass Module Freigaben über `ctx` oder `/api/v1/share/tokens` anfordern und weder Empfängerzustellung noch Berechtigungsbearbeitung selbst besitzen. Schreibgeschützte Freigaben erhalten standardmäßig ein Wasserzeichen, während schreibbare Freigaben diese Vorgabe entfernen, sofern der Aufrufer sie nicht ausdrücklich beibehält. Der gatewayeigene Schaltflächen-Renderer kombiniert stets das kanonische Freigabesymbol mit der lokalisierten Bezeichnung „Teilen“.

`PATCH /api/v1/share/tokens/:id` behält `grantedCapabilities` bei Auslassung bei und ersetzt sie bei Übergabe eines Arrays; `[]` entzieht alle Rechte. Empfänger-, Passwort- und Adapterbeschränkungen gelten weiterhin. Ressourcenbesitzer gleichen zugestellte Zugriffe nach Änderungen ab und autorisieren Anfragen anhand der aktuellen Rechte.

### Adapter für Freigabemethoden

Das Popup erkennt Freigabemethoden über Adapter des Share-Gateways und zeigt sie in einer Methodenleiste. Link und Benutzer verwalten jeweils ihre Eingabeaufbereitung und Popup-Seite; der Verlauf wird nach der ausgewählten Methode gefiltert.

### Ablauf und Schutz

Beide integrierten Methoden akzeptieren optional ein genaues Ablaufdatum mit Uhrzeit. Ein leerer Ablaufwert ist unbegrenzt; ungültige nichtleere Werte verweigern den Zugriff. Direkte Benutzerzugriffe prüfen den aktuellen Ablauf bei jeder Autorisierung, auch bei aufbewahrten und per Passwort entsperrten Freigaben. Hashing und Prüfung von Passwörtern verbleiben im Share-Gateway. Ressourcenkomponenten können Link-Zugriffsarten mit passenden Berechtigungen und Fähigkeiten bereitstellen.

### Rückmeldung zur Empfängerzustellung und Passwort-Aliasse

Eine Freigabekomponente kann eine allgemeine Zustellungsrückmeldung mit Übersetzungsschlüssel und Basis-URL der Komponentenübersetzungen zurückgeben. Die authentifizierte Benachrichtigungsaktion zeigt diese Rückmeldung vor der Navigation zur zugestellten Ressource an. Nach dem Auflösen eines geschützten Tokens speichert Share das bestätigte Passwort sowohl unter dem undurchsichtigen Link-Token als auch unter der kanonischen Freigabekennung, damit die empfangende Komponente es ohne erneute Abfrage verwenden kann.

### Auflösung und Widerrufsoberfläche

Der Browser prüft die Tokenauflösung, ohne den Kontoschlüsselbund zu öffnen. Erst eine `401 password_required`-Anforderung erlaubt die Wiederherstellung des Kontoschlüsselbunds und einen Versuch mit dem gespeicherten Passwort; `404`-Antworten zeigen den lokalisierten Zustand für nicht mehr vorhandene Freigaben. Jeder Widerruf erfordert einen Bestätigungsdialog, bevor die Löschanfrage gesendet wird.

### Grenze für Komponentenfenster

Eine eingebundene Link-Freigabeseite darf eine ansonsten gültige Komponentenseite programmgesteuert öffnen. Diese Autorisierung gilt nur für den Browser-Fenstervorgang. Für API-Zugriff löst das Share-Gateway Delegierungen allgemein über den Flow `resolve-share-delegated-access` auf: Der Besitzer der Quellressource weist seine Beziehung zum angeforderten Ziel nach und deklariert die erlaubten Zielfähigkeiten, während Share prüft, dass das Gasttoken die erforderliche Quellfähigkeit gewährt, und das Ergebnis an beide Ressourcenkennungen bindet. Share codiert keine Ressourcenpaare fest und behandelt eine Ressourcenfreigabe niemals als eine andere.

Die Freigabeseite prüft nach asynchroner Vorbereitung das Abbruchsignal. Schließen verhindert spätes Rendern; Deaktivieren beendet Wartungsaufgaben und spätere Ablaufhinweise.

## Sicherheit

### Sicherheitsgrenze

Gast-Tokens sind auf genau einen Share-Datensatz begrenzt, laufen kurz aus (maximal vier Stunden und nie länger als das Share-Token) und schalten nur Routen frei, die Share-Umfang und Fähigkeiten explizit prüfen. Schreibende Routen behalten ihre bestehenden User-/Session-Prüfungen und lehnen Share-Gäste ab.

## Referenz

### Technische Spezifikation

Der Client besitzt `/api/v1/share/guest-profile`, gibt die ursprüngliche `Response` zurück und verwendet den Host-API-Client für Authentifizierung und Verbindungsbehandlung. Sein Anbieter ist nur mit dem Share-Gateway aktiv; abhängige Routen müssen `share:uiClient` deklarieren, wenn sie ihn beim Einhängen benötigen.

Browserkomponenten, die eine Freigabeaktion darstellen, benötigen `share:uiGateway` und rufen `mountTrigger(container, options)` auf. Das Gateway besitzt das lokalisierte Symbol-und-Beschriftung-Markup, die Aktionsgestaltung, die Unterdrückung in Gastsitzungen und den Bereinigungsgriff; Verbraucher liefern nur Container und Aktivierungsrückruf.

### Technische Spezifikation

| Seite / Bereich | Anleitung         | Zugriff             |
| --------------- | ----------------- | ------------------- |
| `/shares`       | Freigabeanleitung | Angemeldeter Nutzer |

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

Bei leerer Liste bleiben Übersicht und Filter erklärt; Empfänger- und Verwaltungsschritte entfallen auch in der Anzahl.
