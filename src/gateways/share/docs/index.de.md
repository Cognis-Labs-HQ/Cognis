# Share-Browserclient

Adapter deklarieren ihre eigenen Navbar-Anbieter, die ihrem Aktivierungszustand folgen. Die Senderermittlung nutzt `notify:listSenders` ohne konkrete Notification-Gateway-Instanz. Regelmäßige Share-Wartung stoppt bei Deaktivierung und beginnt bei Aktivierung erneut.

Der Share-Browserclient ermöglicht Modulen, das aktuell authentifizierte Freigabegastprofil über den öffentlichen Browservertrag des Share-Gateways abzurufen.

## Verwendungsbeispiele

`uiCtx` importieren, `share:uiClient` anfordern und `getGuestProfile()` aufrufen. Vor dem Lesen der JSON-Nutzdaten `{ data }` die zurückgegebene `Response` prüfen.

## Technische Spezifikation

Der Client besitzt `/api/v1/share/guest-profile`, gibt die ursprüngliche `Response` zurück und verwendet den Host-API-Client für Authentifizierung und Verbindungsbehandlung. Sein Anbieter ist nur mit dem Share-Gateway aktiv; abhängige Routen müssen `share:uiClient` deklarieren, wenn sie ihn beim Einhängen benötigen.

Browserkomponenten, die eine Freigabeaktion darstellen, benötigen `share:uiGateway` und rufen `mountTrigger(container, options)` auf. Das Gateway besitzt das lokalisierte Symbol-und-Beschriftung-Markup, die Aktionsgestaltung, die Unterdrückung in Gastsitzungen und den Bereinigungsgriff; Verbraucher liefern nur Container und Aktivierungsrückruf.

## Zuverlässige Freigaben und Tests

Die Freigabe-Hooks von Calendar und Flashcards berücksichtigen leere Ergebnisse anderer Ressourcenanbieter. Link- und Kontofreigaben lassen sich dadurch bei aktivierten Anbietern erstellen und auflösen. Ladeansicht, Kontofreigabestatus und Kalender-Gastansicht verwenden responsive Mindestgrößen statt acht verpflichtender Rasterspalten und bleiben auf schmalen Bildschirmen nutzbar. Die Freigabewartung läuft nacheinander, bündelt überlappende Aufrufe, beendet fehlgeschlagene Durchläufe und versucht es nach fünfzehn Minuten erneut. Deaktivierung stoppt weitere Arbeit; Reaktivierung setzt die Planung fort.

Die Flashcard-Übung für Gäste verwendet eine vorübergehende Modusauswahl und deaktiviert Kontofunktionen sowie gespeicherte Layouteinstellungen. Sie liest oder schreibt keine Übungseinstellungen eines Kontos.

## Prüfung und Lebenszyklus

Share-Adapter können `defineContracts(ctx)` exportieren. Share ruft diese Funktion vor der Konstruktion der Methode mit der gemeinsamen Vertragsregistrierung und einem adaptereigenen Bootstrap-Bereich auf. Ungültige Methoden rollen ihre Definitionen zurück und protokollieren sichere Fehlermetadaten. Definitionen folgen der Deaktivierung und Reaktivierung des Gateways.

Gastseiten prüfen den Abbruch nach Lokalisierung, Composer-Initialisierung, Sitzungs- und Anbieterladen sowie Stil- und Renderer-Importen. Composer, Kalender-Popups und Ressourcenanfragen verwenden das Seitensignal. Abgebrochene Seiten überschreiben keine Folgeseite und melden keine veralteten Ergebnisse. Wartungsdurchläufe übergeben ihren Aufgaben ebenfalls ein Abbruchsignal; die Deaktivierung von Share verhindert spätere Ablaufbenachrichtigungen innerhalb einer laufenden Prüfung.

## Browsereigene Aktionen

Geteilte Ressourcen liefern `page.mountScriptUrl` mit einem exportierten `mount(root, options)`. Der Einstiegspunkt erhält den Freigabekontext, lokalisierte Texte und das Abbruchsignal der Seite. Fehlende Einstiegspunkte erzeugen den lokalisierten Rendererfehler.

## Geltungsbereich der Anmeldung

Kontoaktionen erfordern bestätigte Kontositzungen. Aktionen für freigegebene Ressourcen prüfen Gastanmeldungen ausdrücklich und kontrollieren die aktuelle Freigabe vor den Ressourcenberechtigungen. Kontonamen bestimmen niemals den Anmeldetyp. Widerrufener oder abgelaufener Zugriff wird abgelehnt.
