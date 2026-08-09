# Teilen-Popups repariert

## Einheitliches Teilen-Popup

Whiteboards öffnen nun das direkt einsetzbare Popup des Teilen-Gateways mit ihrer Ressourcenkennung und ihren Fähigkeiten und folgen damit derselben Gateway-Integration wie andere Komponenten. Das Gateway bleibt für Teilen-Methoden und Token-Anfragen verantwortlich.

## Anwesenheitsavatare bleiben platziert

Profilbilder der Seitenanwesenheit erhalten ihre Darstellung nun aus dem gemeinsamen Anwesenheits-Stylesheet. Dadurch bleiben sie Avatare in der Werkzeugleiste, statt als unformatierte Bildebenen über der Whiteboard-Zeichenfläche zu erscheinen.

## Share-Gäste bleiben authentifiziert

Beim Öffnen eines Whiteboard-Share-Links bleibt die eingeschränkte Gastsitzung jetzt erhalten. Cognis prüft die temporäre Gastidentität nicht mehr als reguläres Benutzerkonto, löscht ihr Token nicht und meldet nicht mehr, dass das Konto gelöscht wurde.

## Gastgerechte Dashboard-Daten laden

Geteilte Seiten verwenden nun die Gastsitzungsfunktion des Share-Gateways, wenn sie Profil- und Dashboard-Anfragen auswählen. Dadurch schlagen beim geöffneten Whiteboard keine irrelevanten, ausschließlich für Konten bestimmten Anfragen mehr fehl.

## Geschützte Freigaben behalten ihren Gastschlüsselbund

Geteilte Seiten verwenden nun während ihres gesamten Lebenszyklus dieselbe aufgelöste Gastsitzung, statt beim Initialisieren einer eingebundenen Komponente eine neue Gastidentität aufzulösen. Gastschlüsselbunde bleiben auf die Sitzung beschränkt, bewahren Zugangsdaten geschützter Besprechungen und rufen weder Konto-Schlüsselbund- noch Versionshinweis-APIs auf. Steuerelemente für den Zeigerstil werden bei der SPA-Navigation ebenfalls entfernt, sofern die Zielseite die Zeigerverfolgung nicht in ihrem Composer-Manifest aktiviert. Benachrichtigungen über Benutzerfreigaben öffnen nun die kanonische Seite des Share-Gateways, und Gastidentitäten führen weder Kontoprüfungen noch Anfragen zur Social-Verfügbarkeit aus. Angemeldete Empfänger von Benutzerfreigaben behalten nun ihre Kontositzung und erhalten den Ressourcenzugriff über das Share-Gateway, statt in Gastidentitäten umgewandelt zu werden. Neue Benutzerfreigaben senden nun ein internes, ressourcenspezifisches Ziel mit der Kennung des Freigabedatensatzes, statt die öffentliche Gast-URL zu verteilen. Inhaltsanbieter übergeben beim Öffnen von Share nur noch ihre normale interne Inhalts-URL; das Share-Gateway validiert, speichert und übermittelt diese URL und bleibt die alleinige Instanz für den Empfängerzugriff. Öffentliche Share-URLs werden nun durch das Share-Gateway aufgelöst und leiten autorisierte Betrachter zur gespeicherten internen Route weiter; nicht verfügbare Routen bleiben auf der Share-Fehlerseite. Share-Token verweisen über einen Datenbank-Fremdschlüssel auf gatewayeigene Ressourcenzeilen. Aktive Freigaben wechseln nun sofort zur Zugriffsverweigerungsansicht von Share, wenn eine Ressourcenanfrage einen widerrufenen Zugriff meldet. Freigabequellen geben die Unterstützung für schreibgeschützten Zugriff ausdrücklich an: Besprechungen bieten nur Schreibzugriff, während Whiteboards und Kalender Lese- und Schreibzugriff anbieten; schreibgeschützte Whiteboards werden geladen, ohne geschützte Schreibvorgänge zu versuchen.
