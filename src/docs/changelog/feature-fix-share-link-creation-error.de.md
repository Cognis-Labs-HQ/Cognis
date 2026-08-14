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

Geteilte Seiten verwenden nun während ihres gesamten Lebenszyklus dieselbe aufgelöste Gastsitzung, statt beim Initialisieren einer eingebundenen Komponente eine neue Gastidentität aufzulösen. Gastschlüsselbunde bleiben auf die Sitzung beschränkt, bewahren Zugangsdaten geschützter Besprechungen und rufen weder Konto-Schlüsselbund- noch Versionshinweis-APIs auf. Steuerelemente für den Zeigerstil werden bei der SPA-Navigation ebenfalls entfernt, sofern die Zielseite die Zeigerverfolgung nicht in ihrem Composer-Manifest aktiviert. Benachrichtigungen über Benutzerfreigaben öffnen nun die kanonische Seite des Share-Gateways, und Gastidentitäten führen weder Kontoprüfungen noch Anfragen zur Social-Verfügbarkeit aus. Angemeldete Empfänger von Benutzerfreigaben behalten nun ihre Kontositzung und erhalten den Ressourcenzugriff über das Share-Gateway, statt in Gastidentitäten umgewandelt zu werden. Neue Benutzerfreigaben senden nun ein internes, ressourcenspezifisches Ziel mit der Kennung des Freigabedatensatzes, statt die öffentliche Gast-URL zu verteilen. Inhaltsanbieter übergeben beim Öffnen von Share nur noch ihre normale interne Inhalts-URL; das Share-Gateway validiert, speichert und übermittelt diese URL und bleibt die alleinige Instanz für den Empfängerzugriff. Öffentliche Share-URLs werden nun durch das Share-Gateway aufgelöst und leiten autorisierte Betrachter zur gespeicherten internen Route weiter; nicht verfügbare Routen bleiben auf der Share-Fehlerseite. Share-Token verweisen über einen Datenbank-Fremdschlüssel auf gatewayeigene Ressourcenzeilen. Aktive Freigaben wechseln nun sofort zur Zugriffsverweigerungsansicht von Share, wenn eine Ressourcenanfrage einen widerrufenen Zugriff meldet. Freigabequellen geben die Unterstützung für schreibgeschützten Zugriff ausdrücklich an: Besprechungen bieten nur Schreibzugriff, während Whiteboards und Kalender Lese- und Schreibzugriff anbieten; schreibgeschützte Whiteboards werden geladen, ohne geschützte Schreibvorgänge zu versuchen. Freigabegäste behalten nun ihre aufgelöste Gastidentität und den internen Freigabekontext, während der Router ein Whiteboard öffnet, sodass kein Profilname erforderlich ist. Gäste mit Lesezugriff können ihre Zeigerpräsenz veröffentlichen und anzeigen; beim Verlassen des Whiteboards werden die Präsenzabfragen sofort beendet und der inaktive Zustand gemeldet. Benachrichtigungen zu Benutzerfreigaben führen nun über die kanonische Share-URL, damit Kalender und Besprechungen den Zugriff vor der Navigation zu ihren Cognis-Inhaltsrouten prüfen und bereitstellen können. Freigabeempfänger sehen keine Freigabesteuerung mehr; Karten ohne Berechtigungsunterstützung lassen Lese-/Schreibangaben weg, beim Bearbeiten bleibt dieselbe Terminologie erhalten und leere Ablaufaktualisierungen erzeugen keine ungültigen PATCH-Anfragen mehr. Empfänger von Besprechungsfreigaben erhalten dynamischen Teilnehmerzugriff nur solange die Freigabe gültig ist; freigegebene Besprechungen überspringen kontospezifische Startanfragen und Kalenderfreigaben werden ohne kontospezifisches Profilladen eingebunden.

## Kalender-Ereignisformulare repariert

Kalender-Ereignisformulare laden ihre Abhängigkeit zur HTML-Escapierung jetzt ausdrücklich. Dadurch tritt beim Öffnen oder Erstellen von Ereignissen kein Fehler `escapeHtml is not defined` mehr auf.

## Zugriff auf geteilte Meetings verbessert

Freigabedialoge verwenden jetzt eine neutrale Aktion „Schließen“ und eine destruktive Aktion „Widerrufen“. Für Benutzer freigegebene Meetings behalten die vollständige Seitenstruktur bei, ohne Steuerelemente zum erneuten Teilen anzuzeigen. Abgelehnte Link-Freigaben bleiben auf der Zugriffsseite, statt wiederholt neu zu laden.

## Freigaben zentral verwalten

Das Benutzermenü enthält jetzt eine Seite „Freigaben“, auf der gesendete und empfangene Freigaben geöffnet werden können. Erstellende können gesendete Freigaben verwalten oder löschen, Empfangende können Freigaben ablehnen, und Cognis benachrichtigt betroffene Personen, wenn Freigaben gelöscht werden, ablaufen oder abgelehnt werden.

## Aktivitäten geteilter Seiten bei Zugriffsende stoppen

Die Whiteboard-Anwesenheit wird nun sofort beendet, wenn eine Freigabe widerrufen wird, und bei der SPA-Navigation vollständig getrennt. Seitenaktionsschaltflächen verwenden eine gemeinsame, über CTX verwaltete Leiste, damit Zeiger-, Design- und Layoutsteuerungen einheitlich angeordnet sind und mit dem Seitenlebenszyklus hinzugefügt, aktualisiert oder entfernt werden können. Freigabedialoge zeigen stets eine Beschriftung „Schließen“, und angemeldete Empfänger von Meeting-Freigaben laden die vollständige Kontoseitenstruktur.

## Freigabeübersicht vereinfachen

Gesendete und empfangene Freigaben erscheinen jetzt in einer einheitlichen, responsiven Tabelle mit klaren Angaben zu Freigabeziel und Freigabequelle. Der Freigabetitel öffnet den Inhalt direkt. Die symbolbasierte Aktion „Verwalten“ öffnet den vorhandenen Freigabeeditor mit den Daten aus der Gateway-Datenbank, sodass Eigentümer Empfänger, Berechtigungen, Namen, Ablaufzeit und Schutz bearbeiten können, ohne die Freigabeseite zu verlassen.

## Veraltete Navigation und Freigabestatus verhindern

Überlappende SPA-Navigationen brechen ältere Routenladevorgänge ab, bevor diese eingebunden werden können. Abgelaufene Freigaben werden als inaktiv gemeldet. Ablaufbenachrichtigungen gelten erst nach erfolgreicher Zustellung an alle Empfänger als abgeschlossen, sodass vorübergehende Fehler protokolliert und erneut versucht werden.
