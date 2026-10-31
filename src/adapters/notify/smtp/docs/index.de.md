# SMTP-E-Mail-Adapter

## Bootstrap und Kanäle

SMTP verwaltet die Registrierung von Aktionen, deren Darstellung und Warteschlangen. `notify:registerSmtpPurpose` erhält eine lokale Kennung und eine Aktionsfunktion, die aus Variablen eine Nachricht erstellt. Gateways, Adapter und externe Module registrieren nur innerhalb ihres eigenen Bootstraps; Kennungen enthalten den Besitzer. Auth, Registration, TFA und Share besitzen ihre Nachrichteninhalte. SMTP führt keine Liste anwendungsspezifischer Zwecke oder Vorlagen.

```js
const registerPurpose = ctx.getCapability("notify:registerSmtpPurpose");
const purpose = await registerPurpose("digest", (variables) => ({
    subject: variables.subject,
    body: variables.body,
}));
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, variables });
```

Jeder Aufruf von `notify:sendEmail` übergibt einen bestehenden Zweck und Variablen. `templateId` entfällt. Fehlende und unbekannte Zwecke werden abgewiesen; asynchrone Aktionen werden vor dem Einreihen erneut geprüft. Nach Abschluss, Fehler oder Zeitüberschreitung des Bootstraps ist die Registrierung gesperrt. Abschluss-Hooks laufen nach dem Start der Anbieter unter demselben Besitzer.

Benachrichtigungskategorien verwenden weiterhin `notify:registerCategory`. SMTP erstellt die Warteschlange bei der Registrierung und gibt dem Gateway eine gebundene Zustellfunktion zurück. Das Gateway bleibt unabhängig vom Sender. Kein Versand erstellt oder erschließt einen Zweck; direkte SMTP-Aufrufe benötigen einen ausdrücklich registrierten Zweck.

Beim Deaktivieren eines Gateways oder Entfernen eines Moduls werden dessen Aktionen und ausstehende Zustellungen beendet. Die erneute Aktivierung stellt frische Warteschlangen her, ohne abgebrochene E-Mails zu wiederholen. Gemeinsam genutzte Kategorien bleiben aktiv, solange ein weiterer Besitzer aktiv ist. Das Deaktivieren des SMTP-Senders schließt auch Verbindungen und bricht ausstehende Zustellungen ab; die Aktivierung stellt nur noch bestehende Registrierungen wieder her.

Die Standardpause beträgt fünfzehn Sekunden je normalisiertem Empfänger und Warteschlange. Unabhängige Warteschlangen laufen gleichzeitig. Nur erfolgreiche Zustellungen setzen die Pause fort. Im Arbeitsspeicher bleiben je Warteschlange bis zu 200 abgeschlossene Einträge erhalten. `sendEmail` gibt den tatsächlichen Warteschlangeneintrag zurück; das Einreihen bestätigt keine SMTP-Zustellung.

Der Sendervertrag verwendet `test(recipient, config)` und optionale Bootstrap-, Kanal- und Lebenszyklus-Hooks. Das Gateway ruft `testSender(senderId, recipient, config)` auf und enthält keine SMTP-spezifischen Test-, Verifizierungs-, Einladungs- oder Anmeldemethoden. Die bisherigen speziellen Gateway-Hilfsmethoden und die separate Vorlagenregistrierung entfallen.

## Konfiguration

Konfigurieren Sie `COGNIS_SMTP_HOST`, `COGNIS_SMTP_PORT` (587), `COGNIS_SMTP_FROM`, optional `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS` sowie `COGNIS_SMTP_SECURE` (`none`, `starttls` oder `tls`). Absendername, EHLO-Host, Zertifikats- und Anmelderichtlinien sowie Codelänge verwenden die bestehenden Adaptereinstellungen. Testnachrichten können eine abweichende Konfiguration in ihrer Warteschlange mitführen.
