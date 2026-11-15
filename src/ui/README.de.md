# Cognis UI

Implizites Absenden gebundener Formulare löst keine Dokumentanfrage des Browsers aus. Komponenten erhalten das Absendeereignis weiterhin. Interne Weiterleitungen verwenden den SPA-Router. Bewusste Wechsel zu serverseitig dargestellten Seiten beachten die Bestätigung ungespeicherter Änderungen und prüfen beim Fortsetzen erneut die Offline-Verfügbarkeit.

`openPopup({ signal })` bindet einen Dialog an seinen Besitzer. Das Abbrechen des Signals schließt ihn einschließlich einer Verwerfen-Bestätigung und entfernt Ereignisbehandler, Zeitgeber, Formularüberwachung und Scrollsperren. Beim Entfernen eines ungültigen Seiten- oder Identitätskontexts erscheint keine weitere Nachfrage. Gleichzeitige Abbruchversuche teilen eine Bestätigung.

## Struktur

- `src/layouts/`: wiederverwendbare Leitplanken für Seitenlayouts.
- `src/reuse/`: gemeinsam genutzte Utilities.
- `public/templates/`: HTML-Templates, die von JS importiert und als statische Assets ausgeliefert werden.
- `src/app/`: Seitenverhalten (Study-Oberflächen, Login, Doku, Administration/Einstellungen/Module).

## UX-Modell

Seiten (außer Login) sollen über ein Layout-Modul gerendert werden, damit Row/Column-Leitplanken konsistent bleiben und Widget-Anpassungen flexibel sind.

## API-gesteuerte Funktionen

- Login verwendet `/api/v1/auth/login`.
- Die Produktdokumentation liest `/api/v1/docs`.
- Benutzerseiteneinstellungen verwenden `/api/v1/social/users/:accountId/preferences/:pageId`.

## Internationalisierung (i18n)

Alle für Benutzer sichtbaren Texte müssen über den i18n-Helper aufgelöst werden — niemals in JS oder HTML-Templates hartkodieren.

### Neue Zeichenkette hinzufügen

1. Füge das Schlüssel/Wert-Paar in jedem Sprachpaket unter `src/ui/languages/<locale>/strings.xml` hinzu, beginnend mit `en`:

    ```xml
    <string name="ui.app.mypage.my_label">My label</string>
    ```

2. Nutze `ui.reuse.*`-Schlüssel für Labels, die auf mehreren Seiten erscheinen, und `ui.app.<page>.*` für seitenspezifische Texte.

3. Lies den Wert in JS mit `i18n.t()`:

    ```js
    const i18n = await createI18n();
    element.textContent = i18n.t("ui.app.mypage.my_label");
    ```

4. Für statische HTML-Templates füge ein `data-i18n`-Attribut hinzu und rufe `applyStaticTranslations(i18n)` nach dem Rendern einmal auf:

    ```html
    <span data-i18n="ui.app.mypage.my_label"></span>
    ```

    ```js
    applyStaticTranslations(i18n, root);
    ```

    Verwende `data-i18n-placeholder` für `placeholder`-Attribute und `data-i18n-aria-label` für `aria-label`-Attribute.

### Unterstützte Attribute

| Attribut                | Setzt                 |
| ----------------------- | --------------------- |
| `data-i18n`             | `element.textContent` |
| `data-i18n-placeholder` | `element.placeholder` |
| `data-i18n-aria-label`  | `element.ariaLabel`   |

### Sprachdateien

Sprachpakete liegen in `src/ui/languages/<iso>/strings.xml`. Die Laufzeit lädt sie bei Bedarf und cached sie für die Sitzung. Die Sprachpräferenz des Benutzers wird in `localStorage` und einem Cookie gespeichert und kann über die Einstellungsseite geändert werden.

Fallback-Reihenfolge: bevorzugte Sprachen (nach Priorität) → `en`.

### Durchsetzung

`src/ui/tests/hardcoded-strings.test.js` führt zwei Prüfungen aus:

- **Quoted string literals** — markiert mehrwortige Strings in einfachen/doppelten Anführungszeichen, die benutzerseitig wirken und keine Schlüsselreferenzen sind.
- **HTML template text nodes** — scannt Template-Literale nach Text zwischen HTML-Tags (z. B. `<th>ID</th>`) und markiert Fälle mit alphabetischen Zeichen ohne eingebetteten `i18n.t()`-Aufruf.

Ausführen mit:

```
node --test src/ui/tests/hardcoded-strings.test.js
```

Jeder commitete Code in `src/ui/app` und `src/ui/layouts` muss beide Prüfungen bestehen.

## Erweiterte Einstellungsbearbeitung

Unter Erweitert → Einstellungen kann nach einer einmaligen, im serverseitigen Benutzerprofil gespeicherten Sicherheitsbestätigung das vollständige Dokument der UI-Einstellungen als JSON bearbeitet werden. Gültige Änderungen werden über das normale Einstellungssystem gespeichert und angewendet. Bestätigungen von Versionshinweisen werden getrennt gespeichert, damit sie dieses Dokument nicht unübersichtlich machen.

Seitenüberlagerungen werden am Dokumentkörper eingehängt, damit Hintergrundfilter und Begrenzungsblöcke des Arbeitsbereichs die Fensterposition nicht verschieben. Das Zeichenfeld bleibt auf den sichtbaren Seitenbereich begrenzt und behält beim Scrollen seine verschobene Position.

## Administrationssteuerung

Unter Administration → Komponenten nutzen Statusbeschriftung, Zustandsanzeige und Ein-/Ausschalter ihre Inhaltsbreite. Schmale Komponentenzeilen zeigen den Namen über den Bedienelementen und die Aufklappsteuerung daneben; die Bedienelemente können innerhalb der verfügbaren Breite umbrechen. Lange Namen, Statusbeschriftungen und Versionsdetails bleiben lesbar.

Ein-/Ausschalter und Aufklappsteuerung haben 44 Pixel hohe Bedienflächen. Tab fokussiert einen verfügbaren Schalter, die Leertaste schaltet ihn um, und ein Fokusring markiert den sichtbaren Schieber. Erforderliche Gateways sowie gesperrte oder nicht verfügbare Adapter behalten deaktivierte Schalter. Die Komponenten-Anleitung erklärt die Tastaturbedienung und verwendet weiterhin dieselben Ziele für Schalter, Aufklappen, Metadaten und Konfiguration.

Im Bereich Sicherheit sind Sitzungsdauer, Validierungsmodus und Genehmigungsschalter mit ihren sichtbaren übersetzten Überschriften verknüpft. Der Zahlenwert behält den Namen der Standard-Anmeldesitzungsdauer; die Auswahl Einheit ergänzt diesen Kontext um ihre eigene sichtbare Beschriftung. Informationsschaltflächen stehen außerhalb der Feldbeschriftungen. Sicherheitswerte verwenden weiterhin den bisherigen Ablauf zum Speichern und Verwerfen.

Die gemeinsame Schalterdarstellung hält das native Kontrollkästchen zugänglich, statt `display: none` zu verwenden, und zeigt einen Fokusrahmen am sichtbaren Schieber. Das gilt auch für Mitteilungen, deren Beschriftungen und Entwürfe im Arbeitsspeicher unverändert bleiben. Die nativen Zustände für Auswahl und Deaktivierung bleiben maßgeblich; Abmessungen der Komponentenzeilen und Schutzregeln für Schalter bleiben erhalten.

Die Anleitungen für Sicherheit, Komponenten und Mitteilungen behalten Schritte, Ziele und Ablauf. Die Änderungen an Beschriftung und Darstellung führen keine neue Aktion ein. Grundlage sind die [W3C-Hinweise zu Formularbeschriftungen](https://www.w3.org/WAI/tutorials/forms/labels/) und das [APG-Beispiel für Kontrollkästchen als Schalter](https://www.w3.org/WAI/ARIA/apg/patterns/switch/examples/switch-checkbox/). Renderer- und CSS-Tests belegen weder native Tastaturnavigation noch gezeichneten Fokus, Screenreader-Ausgabe oder Gerätekompatibilität.

## Gemeinsame Formularüberschriften

Der gemeinsame Formularbaukasten fasst jede Feldüberschrift und ihre Pflichtfeldmarkierung in einem Textcontainer zusammen. Beschriftungen können in schmalen Formularen umbrechen; die Markierung verwendet ein geschütztes Leerzeichen und bleibt im Textfluss, statt eine eigene Rasterzelle zu bilden. Native Feldbeschriftungen, Pflichtattribute, Links in Beschriftungen und Hilfeschaltflächen behalten ihre Funktionen. `setFieldRequired` aktualisiert dieselbe Überschrift für Textfelder, Auswahllisten, mehrzeilige Felder, Kontrollkästchen und Optionsfelder.
Die Überschrift verhindert einen Umbruch zwischen Inhalt und Markierung, während der innere Beschriftungstext auch innerhalb langer ungetrennter Wörter umbrechen darf.

Formularüberschriften bleiben in ihren bisherigen Feldern. Ziele und Ablauf der Kalender- und Freigabeanleitungen ändern sich nicht; es ist keine neue Aktion oder Anleitungsetappe nötig.

## Passwortformular-Texte

Komponentenübergreifende Passwortformulare verwenden `ui.reuse.password_requirements` und `ui.reuse.passwords_match` aus den Host-XML-Katalogen. Auth und Registration nutzen dieselben Schlüssel auf Englisch, Deutsch, Indonesisch und Japanisch. Liefern Sie die Host-Kataloge mit Auth 2.2.13 und Registration 1.2.9 aus; Integrationen müssen diese gemeinsamen Schlüssel übernehmen. Die Auflösung desselben englischen Schlüssels bleibt strikt und meldet fehlende oder leere englische Werte ausdrücklich als Fehler.

## Kontexthilfe

Verwenden Sie `renderInfoTooltip(localizedText, localizedLabel, optionalId)` neben der vorhandenen Beschriftung oder Überschrift. Hilfetext und Schaltflächenbeschriftung stammen aus dem zuständigen XML-Katalog; Beschreibungen bleiben reiner Text. Die gemeinsame Hilfekomponente hat keine eigene Komponentenversion.

Bewegen Sie den Zeiger auf die Informationsschaltfläche oder fokussieren Sie sie, um die Hilfe zu lesen. Sie bleibt geöffnet, solange die Schaltfläche fokussiert ist oder der Zeiger auf ihr oder dem Hilfefeld liegt. Eine andere Hilfeschaltfläche zeigt ihre Erklärung; beim Verlassen erscheint wieder eine noch fokussierte oder mit dem Zeiger berührte Erklärung. Escape schließt die Hilfe, ohne den Fokus zu verschieben oder andere Escape-Handler zu unterdrücken. Die geschlossene Interaktion muss enden, bevor dieselbe Schaltfläche die Hilfe erneut öffnet. Scrollen und Größenänderungen schließen das Hilfefeld weiterhin.
Wechselt der Tastaturfokus die Erklärung, während der Zeiger auf dem gemeinsamen Hilfefeld bleibt, gehört diese Zeigerinteraktion zur neu angezeigten Erklärung, bis der Zeiger das Feld verlässt oder die Hilfe geschlossen wird.

Das nicht fokussierbare Hilfefeld verwendet `role="tooltip"`; die aktive Schaltfläche ergänzt dessen ID in `aria-describedby`, ohne andere Beschreibungen zu ersetzen. Wird die Schaltfläche entfernt, verschwindet ihre Hilfe. Ein Dokumentwechsel entfernt alte Listener und Beobachter; beim Verlassen der Seite wird die aktive Hilfe geschlossen. Das feste, themenabhängige Hilfefeld behält seine Platzierungsregeln und überbrückt den Abstand mit einer transparenten Zeigerfläche ohne verzögerte Rückrufe.

Vorhandene Seitentutorials behalten Beschriftungen, Ziele und Ablauf: Die Hilfe bleibt neben denselben Bedienelementen verfügbar, ohne neue Aktion oder Tutorialschritt. Orientierung bieten [W3C-Inhalte bei Zeigerkontakt oder Fokus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) und das [APG-Tooltip-Muster](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/). Das APG-Muster ist noch in Arbeit und hat keinen Konsens der Arbeitsgruppe. DOM-Ereignistests bestätigen weder Konformität noch tatsächliche Geometrie, Berührungsbedienung oder die Ausgabe assistiver Technologien.
