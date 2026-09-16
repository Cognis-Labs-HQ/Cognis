# Cognis UI

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
