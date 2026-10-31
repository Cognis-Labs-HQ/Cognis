# Benachrichtigungen

Das Gateway vermittelt Benachrichtigungen über optionale Sender-Adapter und setzt keinen E-Mail-Transport voraus. Adapter exportieren `createNotificationSender()` und verwalten Konfiguration, Verbindungen, Warteschlangen und Testzustellung selbst. Interne Benachrichtigungen bleiben ohne E-Mail-Dienst möglich.

## Zustellverträge

Komponenten verwenden ctx-Fähigkeiten statt der Gateway-Implementierung:

- `notify:dispatch` verwendet die vom Empfänger gewählten Kategorie-Sender und dauerhaft aktive Sender.
- `notify:dispatchToRole` ermittelt Konto-IDs und stellt an eine Rolle zu.
- `notify:listSenders` liefert öffentliche Senderdaten. `requiresVerifiedEmail` beschreibt die E-Mail-Anforderung unabhängig von der Sender-ID.
- `notify:registerCategory(id, label)` ist auf Bootstrap beschränkt. Jeder beteiligte Sender erstellt einen Kanal mit gebundener Zustellfunktion. Gemeinsame Besitzer behalten ihn bis zur Entfernung des letzten Besitzers.

Die Verträge werden aus `@cognis/core` exportiert. Der Adapter-Bootstrap erhält ctx-Fähigkeiten und begrenzte Registrierungsfunktionen, keine konkrete Gateway-Instanz. Tests verwenden `testSender(senderId, recipient, config)`.

## E-Mail-Aktionen

Ein optionaler E-Mail-Anbieter stellt `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable` und `notify:emailCodeLength` bereit. Aufrufer liefern eigene Inhalte und registrieren ausschließlich während ihres Bootstraps einen besitzergebundenen Zweck. Der Versand benötigt diesen Zweck, Empfänger und Variablen und erstellt niemals eine Warteschlange. Ohne Anbieter bleiben gespeicherte Adressen lesbar.

Die Verifizierung gilt für lokale und SSO-Konten. Codes und Tokens binden die vollständige Konto-ID und Adresse. Die Codelänge stammt vom E-Mail-Anbieter, unabhängig von TFA-Adaptern. Zustellprobleme heben die Verifizierungspflicht nicht auf. Die Sicherheitseinstellung verwendet `userValidationMode: "email"` oder `"none"`.

## Lebenszyklus

Deaktivierung und Entfernen widerrufen eigene Registrierungen und ausstehende Zustellungen. Erneute Aktivierung erstellt frische Kanäle ohne Wiederholung abgebrochener Nachrichten. Andere Besitzer gemeinsamer Kategorien bleiben aktiv. Asynchrone Aktionen dürfen nach Aufhebung oder Ersetzung ihrer Registrierung nichts einreihen.

## Browser-Fähigkeiten

`notify:emailClient` stellt lebenszyklusgebundene eigene E-Mail-Anfragen, vertrauenswürdige Domänen, administrative `listUserEmails`, ausschließlich online nutzbares `resendUserEmail` sowie `emailAvailable` bereit. Einstellungen, Benutzerverwaltung und Administration lösen den Vertrag über ctx auf. Der zuständige Anbieter puffert E-Mail-Änderungen; Verifizierung bleibt online. Das authentifizierte `GET /api/v1/notify/email-delivery` liefert nur Verfügbarkeit, keine Konfiguration.

Offline-Modus und Broadcast teilen den Bannerstapel oberhalb des Kopfbereichs. Der Offline-Modus hat Vorrang, ist nicht schließbar und bietet Verbindungsprüfung sowie Aktualisierung nach Wiederherstellung. Bestätigung, Zielgruppen und Zeitpläne für Broadcast bleiben unabhängig wirksam. Hintergrund und Einklappbarkeit werden über die gemeinsame Banner-Fähigkeit festgelegt.
