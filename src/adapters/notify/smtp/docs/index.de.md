# SMTP-E-Mail-Adapter

SMTP unterstützt unverschlüsseltes TCP, STARTTLS und TLS, optionale Anmeldung sowie begrenzte Wiederholungen bei vorübergehenden Fehlern. Vorlagen werden über das Benachrichtigungs-Gateway beigetragen. Der Transport erstellt MIME, bereinigt Header und unterstützt Anhänge. Alle Versandwege verwenden die gewählte Warteschlange. `send` wartet auf die Zustellung; `sendTracked` liefert sofort einen Beleg.

## Zwecke beim Bootstrap

SMTP-Zwecke werden während des Gateway- oder Modul-Bootstraps über `ctx` registriert. Rufen Sie `notify:registerSmtpPurpose` mit einem lokalen Zwecknamen auf, warten Sie auf das Ergebnis und bewahren Sie die zurückgegebene besitzergebundene Kennung auf. Jede Registrierung erstellt eine eigene Warteschlange samt Empfänger-Sperrzeiten. Der Adapter besitzt keine feste Zweckliste.

```js
const registerPurpose = ctx.getCapability("notify:registerSmtpPurpose");
const purpose = await registerPurpose("digest");
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, templateId, variables });
```

Jeder Aufruf von `notify:sendEmail` muss einen bestehenden `purpose` angeben. Fehlende oder unbekannte Zwecke werden vor dem SMTP-Transport abgewiesen; ein Versand erstellt keine Zwecke. Nach Abschluss, Fehler oder Zeitüberschreitung des Bootstraps ist die Registrierung gesperrt, auch über gespeicherte Rückrufe und abgetrennte asynchrone Arbeit. Nach dem Start aktivierte Module dürfen während ihres eigenen Bootstraps registrieren. Deaktivierung und Deinstallation entfernen ihre Warteschlangen, lehnen ausstehende Zustellungen ab und schließen aktive SMTP-Verbindungen.

## Zustellung und Warteschlangen

Die Standardpause beträgt fünfzehn Sekunden je normalisiertem Empfänger und Zweck. Unabhängige Zwecke werden gleichzeitig abgearbeitet; langsame Verbindungen, Wiederholungen und Sperrzeiten blockieren keine andere Warteschlange. Nur erfolgreiche Zustellungen setzen die Sperrzeit fort. Die Übersicht kombiniert alle Zwecke, zeigt ihre Kennungen und bewahrt bis zu 200 abgeschlossene Einträge pro Warteschlange im Arbeitsspeicher auf.

Der allgemeine Umschlag enthält `purpose`; spezialisierte SMTP-Versand- und Warteschlangenmethoden erwarten den Zweck jetzt als erstes Argument. Die Gateway-Testmethode verwendet `(senderId, purpose, recipientEmail, config)`. Bestehende Gateway-Hilfsmethoden liefern ihre registrierten Zwecke selbst. Allgemeine Komponenten und Module registrieren eigene Zwecke beim Bootstrap und verwenden deren Kennungen zur Laufzeit.

## Konfiguration

Konfigurieren Sie `COGNIS_SMTP_HOST`, `COGNIS_SMTP_PORT` (587), `COGNIS_SMTP_FROM`, optional `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS` sowie `COGNIS_SMTP_SECURE` (`none`, `starttls` oder `tls`). Absendername, EHLO-Host, Zertifikats- und Anmelderichtlinien sowie Codelänge verwenden die bestehenden Adaptereinstellungen. Testnachrichten können eine abweichende Konfiguration in ihrer Warteschlange mitführen.
