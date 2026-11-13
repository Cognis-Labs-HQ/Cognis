# SMTP-E-Mail-Adapter

## Bootstrap und Kanäle

SMTP verwaltet die Registrierung von Aktionen, deren Darstellung und Warteschlangen. `notify:registerEmailPurpose` erhält eine lokale Kennung und eine Aktionsfunktion, die aus Variablen eine Nachricht erstellt. Gateways, Adapter und externe Module registrieren nur innerhalb ihres eigenen Bootstraps; Kennungen enthalten den Besitzer. Auth, Registration, TFA und Share besitzen ihre Nachrichteninhalte. SMTP führt keine Liste anwendungsspezifischer Zwecke.

```js
const registerPurpose = ctx.getCapability("notify:registerEmailPurpose");
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

## Fabriken und Empfängerthema

`notify:emailTemplates` bietet `blocks`, `compose`, `registerFactory`, `bindFactory`, `listFactories` und `render`. Vorgegeben sind `standard`, `code`, `action` und `digest`. Module registrieren beim Bootstrap eigene Fabriken mit `id`, `labelKey`, `stringsBaseUrl`, typisierten `options` und `render(message, { theme, variables, options })`. Die zurückgegebene Kennung enthält den Besitzer. Die Zweckregistrierung erhält `{ factory, options }` als drittes Argument. Optionen unterstützen Pflichtwerte, Standardwerte und Auswahllisten; unbekannte oder ungültige Werte werden vor Erstellung der Warteschlange abgelehnt. Bausteine umfassen Absätze, Überschriften, Codes, Listen, Tabellen, Trennlinien und HTTP(S)-Aktionslinks. Text wird maskiert und die Vorlage einmalig interpoliert. HTML und Klartext enthalten denselben Inhalt. Marke, Logo, Vorschau und Fußzeile sind konfigurierbar. Maßgeblich ist `ui-preferences.mode` des Empfängerkontos; unbekannte Empfänger oder fehlende Einstellungen verwenden den hellen Modus. Metadaten des Aufrufers überschreiben dies nicht. Deaktivierung oder fehlgeschlagener Bootstrap entfernt Fabriken und verwirft laufende Ergebnisse widerrufener Besitzer.

```js
export async function registerReport(ctx, heading) {
    const templates = ctx
        .getCapability("system:contracts")
        .resolve("notify:emailTemplates", 1);
    const factory = await templates.registerFactory({
        id: "report",
        labelKey: "module.example.report",
        stringsBaseUrl: "/static/modules/example/languages",
        options: {
            heading: {
                type: "string",
                labelKey: "module.example.heading",
                required: true,
            },
        },
        render(message, { options }) {
            return templates.compose(message, {
                blocks: [
                    templates.blocks.heading(options.heading),
                    templates.blocks.paragraph(message.body),
                ],
            });
        },
    });
    const purpose = await ctx.getCapability("notify:registerEmailPurpose")(
        "report",
        (variables) => ({ subject: variables.subject, body: variables.body }),
        { factory, options: { heading } },
    );
    return purpose;
}
```

## Lesbarer E-Mail-Text

E-Mail-Inhalte verwenden einen Blockcontainer statt verschachtelter Absätze um erzeugte Blöcke. Absätze, Codes, Listeneinträge und Tabellenzellen erhalten explizite Themenfarben. Fußzeilen im dunklen Modus und Links im hellen Modus bieten einen lesbaren Kontrast.

## Vertragsbesitz von SMTP

SMTP deklariert seine Verträge für E-Mail-Zwecke, Zustellung, Richtlinien und Vorlagenfabriken im eigenen Bootstrap. Laufzeitdefinitionen liegen in `contracts/declarations.ts`, optionale öffentliche Aktionstypen in `contracts/action-delivery.ts`. Das Benachrichtigungs-Gateway deklariert diese Anbieter-APIs nicht; dort bleiben allgemeine Sender- und Zustellbelegtypen. Andere Adapter verwenden denselben Registrierungsmechanismus ohne zusätzliche Core-Dateien.

## Zuverlässige Freigaben und Tests

SMTP-Konfigurationstests funktionieren bei deaktiviertem Sender, ohne normale Zustellung einzuschalten. Tests verwenden eine eigene, beim Bootstrap registrierte Diagnosewarteschlange und einen gestuften Ablauf; die Gateway-Deaktivierung beendet diese Warteschlange. Leere Passwortüberschreibungen behalten das gespeicherte, verborgene Passwort bei. Diagnoseprotokolle enthalten sichere Transportfehler- und Protokollantwortcodes, jedoch keine Zugangsdaten oder Serverantworttexte.

## Prüfung und Lebenszyklus

Für den SMTP-Verbindungsaufbau und die TLS-Aushandlung gilt jeweils eine Frist von dreißig Sekunden. Eine blockierte Verbindung wird geschlossen, statt die Diagnoseanfrage offen zu halten. Direktes TLS und STARTTLS verwenden den konfigurierten Hostnamen für die TLS-Identität und SNI mit DNS-Namen; IP-Adressen werden nicht als SNI-Namen gesendet.

## Typisierte Zustellverträge

SMTP-Warteschlangeneinträge behalten ihren erforderlichen Betreff bei Zustellung und Wiederholungen. TLS-Verbindungsoptionen enthalten das Abbruchsignal für direktes TLS und STARTTLS; Zertifikatsprüfung, Zeitlimits und Verbindungsbereinigung bleiben unverändert.
