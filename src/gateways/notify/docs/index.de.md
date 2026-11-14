# Benachrichtigungen

Das Gateway vermittelt Benachrichtigungen über optionale Sender-Adapter und setzt keinen E-Mail-Transport voraus. Adapter exportieren `createNotificationSender()` und verwalten Konfiguration, Verbindungen, Warteschlangen und Testzustellung selbst. Interne Benachrichtigungen bleiben ohne E-Mail-Dienst möglich.

## Anwendungsbeispiele

Komponenten verwenden ctx-Fähigkeiten statt der Gateway-Implementierung:

- `notify:dispatch` verwendet die vom Empfänger gewählten Kategorie-Sender und dauerhaft aktive Sender.
- `notify:dispatchToRole` ermittelt Konto-IDs und stellt an eine Rolle zu.
- `notify:listSenders` liefert öffentliche Senderdaten. `requiresVerifiedEmail` beschreibt die E-Mail-Anforderung unabhängig von der Sender-ID.
- `notify:registerCategory(id, label)` ist auf Bootstrap beschränkt. Jeder beteiligte Sender erstellt einen Kanal mit gebundener Zustellfunktion. Gemeinsame Besitzer behalten ihn bis zur Entfernung des letzten Besitzers.

Die Verträge werden aus `@cognis/core` exportiert. Der Adapter-Bootstrap erhält ctx-Fähigkeiten und begrenzte Registrierungsfunktionen, keine konkrete Gateway-Instanz. Tests verwenden `testSender(senderId, recipient, config)`.

## Technische Spezifikation

### E-Mail-Aktionen

Ein optionaler E-Mail-Anbieter stellt `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable` und `notify:emailDeliveryPolicy` bereit. Aufrufer liefern eigene Inhalte und registrieren ausschließlich während ihres Bootstraps einen besitzergebundenen Zweck. Der Versand benötigt diesen Zweck, Empfänger und Variablen und erstellt niemals eine Warteschlange. Ohne Anbieter bleiben gespeicherte Adressen lesbar.

Die Verifizierung gilt für lokale und SSO-Konten. Codes und Tokens binden die vollständige Konto-ID und Adresse. Die E-Mail-Verifizierung liest `codeLength` bei jeder Codeausgabe aus dem anbietereigenen Vertrag `notify:emailDeliveryPolicy` in Version 1. Bei SMTP gilt die Codelänge des Benachrichtigungsadapters auch für E-Mail-Code-TFA. Änderungen wirken auf nachfolgende Codes; bestehende Codes behalten ihre ursprüngliche Länge, bis sie verwendet, ersetzt oder abgelaufen sind. Fehlt der Richtlinienanbieter oder ist er deaktiviert oder nicht konfiguriert, schlägt die Codeausgabe ausdrücklich fehl. Zustellprobleme heben die Verifizierungspflicht nicht auf. Die Sicherheitseinstellung verwendet `userValidationMode: "email"` oder `"none"`.

### Lebenszyklus

Deaktivierung und Entfernen widerrufen eigene Registrierungen und ausstehende Zustellungen. Erneute Aktivierung erstellt frische Kanäle ohne Wiederholung abgebrochener Nachrichten. Andere Besitzer gemeinsamer Kategorien bleiben aktiv. Asynchrone Aktionen dürfen nach Aufhebung oder Ersetzung ihrer Registrierung nichts einreihen.

### Browser-Fähigkeiten

`notify:emailClient` stellt lebenszyklusgebundene eigene E-Mail-Anfragen, vertrauenswürdige Domänen, administrative `listUserEmails`, ausschließlich online nutzbares `resendUserEmail` sowie `emailAvailable` bereit. Einstellungen, Benutzerverwaltung und Administration lösen den Vertrag über ctx auf. Der zuständige Anbieter puffert E-Mail-Änderungen; Verifizierung bleibt online. Das authentifizierte `GET /api/v1/notify/email-delivery` liefert nur Verfügbarkeit, keine Konfiguration.

Offline-Modus und Broadcast teilen den Bannerstapel oberhalb des Kopfbereichs. Der Offline-Modus hat Vorrang, ist nicht schließbar und bietet Verbindungsprüfung sowie Aktualisierung nach Wiederherstellung. Bestätigung, Zielgruppen und Zeitpläne für Broadcast bleiben unabhängig wirksam. Hintergrund und Einklappbarkeit werden über die gemeinsame Banner-Fähigkeit festgelegt.

### Verträge des Anbieters

Notify besitzt unter `contracts/` transportneutrale Sender- und Zustellbelegtypen. Anbieterspezifische Laufzeitdefinitionen und optionale Aktionstypen gehören zum beitragenden Adapter. Anbieter liefern Konfigurationsschemata, Übersetzungen, bedingte Felder, Geheimnispräsenz und Testfelder; das Gateway reicht sie ohne Transportannahmen weiter. Notify trägt die E-Mail-Prüfrichtlinie bei Auth ein. Zustell- und Vorlagenfähigkeiten bestehen nur mit einem entsprechenden Adapter.

Konfigurationsfelder können einen optionalen lokalisierten `infoKey` angeben. Der gemeinsame Editor zeigt dessen Hilfetext als Informationshinweis neben der Beschriftung. Leere Zahlenfelder werden bei Konfigurationsänderungen ausgelassen, statt in null umgewandelt zu werden.

Anbieter können den optionalen reinen Hook `normalizeConfig(patch)` implementieren, um Konfigurationen ohne Änderung des Laufzeitzustands zu normalisieren. Notify führt die normalisierte Änderung mit der gespeicherten Konfiguration zusammen, behält ausgelassene Felder bei und speichert das Ergebnis vor der Anwendung auf den Sender. Schlägt die Anwendung zur Laufzeit fehl, deaktiviert Notify den Anbieter, stellt die vorherige gespeicherte Konfiguration mit `enabled: false` wieder her und gibt einen ausdrücklichen Fehler zurück. Ein Administrator muss die Konfiguration korrigieren und den Anbieter wiederherstellen, bevor die normale Zustellung fortgesetzt wird.

Das Speichern und Ändern der Konfiguration, Aktivierungsänderungen und das Laden gespeicherter Einstellungen werden pro Sender nacheinander ausgeführt, einschließlich der Rücknahme fehlgeschlagener Speichervorgänge. Verschiedene Sender bleiben unabhängig. Das Ersetzen eines registrierten Senders während laufender Konfigurationsvorgänge schlägt ausdrücklich fehl und ist erst nach deren Abschluss möglich. Konfigurations-Listener laufen nach Freigabe der Transaktion und können daher auf eine weitere Änderung warten. Die Daten von `notify:onSenderConfigChange` enthalten keine Felder, die im Anbieterschema als `password` deklariert oder von `getConfiguredSecretFields()` aufgeführt werden, auch keine neu übermittelten Werte. Öffentliche normalisierte Felder und der Aktivierungszustand bleiben verfügbar; Listener dürfen sich nicht auf ungeschützte Zugangsdaten verlassen.

Die Vertragsregistrierung von Adaptern folgt dem [gemeinsamen Gateway-Bootstrap-Vertrag](/docs/gateways).

### Zuverlässige Freigaben und Tests

Administratoren können Konfigurationen vor der Senderaktivierung testen. Tests aktivieren keine normale Zustellung; jeder Anbieter verwaltet seinen Diagnosetransport und dessen Bereinigung.

### Typisierte Zustellverträge

Die optionale Warteschlangenabfrage ist im Notify-Vertrag typisiert. Der Bootstrap lädt den Gateway-eigenen Speicher direkt und stellt dessen E-Mail- und Einstellungsmethoden ohne unvollständige Konstruktor-Typzusicherungen bereit. Die Broadcast-Prüfung liefert gültige Rollen und Zeitangaben vor dem Speichern.

### E-Mail beim Onboarding

Notify registriert notify:email:add und notify:email:verify über auth:onboarding. Erlaubt sind nur {email} und {email, code}; die Kontoidentität stammt aus dem geprüften Kontext. Die Operationen verwenden dieselben Regeln wie das gewöhnliche Hinzufügen und Bestätigen: Adresskonflikte, Zustellverfügbarkeit, Codegültigkeit und Wartezeiten. Auflisten, Löschen, Primäradressänderung, Fremdkontozugriff und Administration sind ausgeschlossen.

Nach asynchronen Lesevorgängen wird die Berechtigung vor Wirkungen erneut geprüft. Deaktivierung oder Entfernung von Notify entfernt die Operationen. Fehlende optionale Operationen dürfen nur ohne vorgeschriebene E-Mail-Prüfung übersprungen werden; registrierte Zustellfehler bleiben Fehler. Codes und E-Mail-Links behalten eigene Lebensdauern und erzeugen keine Sitzung. Das Tutorial der angemeldeten E-Mail-Einstellungen bleibt unverändert.

Eine Adresse kann bereits gespeichert sein, wenn Zustellung oder Widerruf fehlschlagen; ein gültiger Code kann vor einer späteren Berechtigungsprüfung oder einem Datenbankfehler verbraucht werden. Vor erneutem Versuch den aktuellen Zustand prüfen.
