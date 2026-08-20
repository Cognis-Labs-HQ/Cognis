# Dokumentationsstandard

## Übersicht

Dieses Dokument legt fest, wie die Dokumentation im Cognis-Quellcode verfasst und organisiert ist. Jedes Gateway, jeder Adapter, jedes Modul und jede plattformübergreifende Komponente liefert ihre eigene Dokumentation als Markdown-Dateien, die automatisch vom Docs-Route entdeckt und über den In-App-Dokumentationsbrowser bereitgestellt werden.

Das Ziel ist Einheitlichkeit: Ein Mitwirkender, der ein beliebiges Dokument liest, sollte die Abschnittsstruktur sofort erkennen, das Gesuchte finden und wissen, wie ein neues Dokument verfasst werden muss, das demselben Muster entspricht. Dokumente werden für Entwickler geschrieben, nicht für Endbenutzer. Es wird davon ausgegangen, dass der Leser HTTP, Node.js und TypeScript versteht.

Die Dokumentation liegt neben dem Code, den sie beschreibt. Gateway-Docs befinden sich in `src/gateways/<id>/docs/`, Adapter-Docs in `src/adapters/<gateway-id>/<adapter-id>/docs/`, und plattformweite Querschnittsdokumente befinden sich in `src/docs/`. Der Docs-Route erkennt beim Start automatisch alle `docs/`-Verzeichnisse, sodass kein zentrales Registrierungsschritt für ein neues Dokument erforderlich ist.

## Verantwortlichkeiten

- Die kanonische Abschnittsstruktur für alle Komponentendokumentation definieren.
- Das kanonische Wurzel-Layout für Module, Gateways, Adapter und Core-nahe Oberflächen definieren.
- Dateinamenskonventionen und Sprachanforderungen definieren.
- Tiefenebenen definieren, damit Autoren wissen, wie detailliert jedes Dokument sein soll.

Nicht verantwortlich für: das Durchsetzen der Existenz von Docs (das ist eine Code-Review-Angelegenheit), automatische Rechtschreibprüfung oder Link-Validierung.

## Architektur

### Kanonisches Komponenten-Wurzel-Layout

Neue oder neu organisierte Komponenten sollen auf dieselben Top-Level-Namen für Zuständigkeiten zusammenlaufen, damit Mitwirkende nicht für jeden Verzeichnisbaum ein neues Muster lernen müssen. Wenn eine Komponente eine Dokumentations-, Server- oder Browser-Oberfläche besitzt, reserviere am Komponentenstamm das passende Verzeichnis `docs/`, `api/` oder `ui/` und halte den Einstiegspunkt vorhersehbar.

| Familie                | Wurzel                         | Kanonische Wurzeln     | Hinweise                                                                                                                                                                    |
| ---------------------- | ------------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plattform / Core-Ebene | `src/`                         | `docs/`, `api/`, `ui/` | `src/docs/` enthält Entwicklerdokumentation, `src/api/` HTTP-/Server-Code und `src/ui/` Browser-Assets. `src/core/` bleibt die anbieterneutrale Vertrags- und Diensteebene. |
| Gateway                | `src/gateways/<id>/`           | `docs/`, `api/`, `ui/` | Gateway-eigene Server-Handler, Routenregistrierung und Bootstrap-Helfer gehören unter `api/`; Admin-/Browser-Assets unter `ui/`.                                            |
| Adapter                | `src/adapters/<gateway>/<id>/` | `docs/`, `api/`, `ui/` | `api/` ist für adaptereigene Bootstrap- oder Server-Helfer, `ui/` für adaptereigene Browser-Assets, wenn der Adapter sie bereitstellt.                                      |
| Modul                  | `<module-repository>/`         | `docs/`, `api/`, `ui/` | `docs/` und `ui/` sind die stabilen Orte für Moduldokumentation und Browser-Assets. `api/` ist der stabile Ort für modulseitigen Server-Code.                               |

Unterstützende Verzeichnisse wie `tests/`, `languages/`, `sql/`, `templates/`, `bootstrap/`, `cli/`, `db/`, `content/` und `reuse/` dürfen daneben liegen, ergänzen diese Wurzeln aber nur und dürfen sie nicht ersetzen. Für neue oder neu organisierte Komponenten `api/routes/` statt eines Top-Level-`routes/`-Geschwisters und `docs/index.<lang>.md` statt benutzerdefinierter Dokumentations-Einstiegsdateien bevorzugen.

### Abschnittsstruktur

Jede Dokumentdatei ist eine Markdown-Datei. Abschnitte erscheinen in dieser Reihenfolge; ein Abschnitt wird nur weggelassen, wenn dies in den Tiefenebenregeln ausdrücklich angegeben ist:

**1. `# Komponentenname`** — Ein klarer H1-Titel. Verwenden Sie den vollständigen lesbaren Namen der Komponente, keine Bezeichnungszeichenkette (z. B. `# Authentifizierungs-Gateway`, nicht `# auth`).

**2. `## Übersicht`** — Zwei bis vier Absätze für einen Entwickler, der neu in der Codebasis ist. Erklärt, was diese Komponente ist, welches Problem sie löst und warum sie in Cognis existiert. Fachjargon vermeiden; technische Details der Architektur überlassen. Beispiel:

> Das Authentifizierungs-Gateway ist der einzige Einstiegspunkt für alle Anmelde- und Identitätsoperationen in Cognis. Es entkoppelt den Rest der Plattform von einem bestimmten Anmeldeinformationsanbieter, indem es zwischen Routen-Handlern und den konkreten Auth-Adaptern sitzt. Das Hinzufügen eines neuen Identitätsanbieters — LDAP, SAML oder ein benutzerdefiniertes internes System — erfordert nur einen neuen Adapter; kein Routen-Handler muss geändert werden.

**3. `## Verantwortlichkeiten`** — Eine Aufzählungsliste dessen, was diese Komponente besitzt und wofür sie verantwortlich ist. Ergänzen Sie die Liste mit einer kurzen Notiz beginnend mit `Nicht verantwortlich für:`, die eine klare Grenze zieht, z. B. `Nicht verantwortlich für: das Speichern von Benutzerprofildetails (das ist die Aufgabe des Profil-Gateways)`.

**4. `## Architektur`** — Wichtige Designentscheidungen, Datenfluss und Schlüsselschnittstellen. Prosa mit Dateipfad-Zitaten wie `src/gateways/auth/gateway.ts` und kurzen Code-Snippets mischen, die wichtige Schnittstellen oder Typsignaturen zeigen, wo dies erhellend ist. Dieser Abschnitt sollte die Frage beantworten: „Wie funktioniert das auf einem hohen Niveau?"

**5. `## Konfiguration`** — Umgebungsvariablen oder Manifestfelder, die ein Betreiber beim Bereitstellen oder Konfigurieren dieser Komponente anpasst. Als Tabelle mit den Spalten `Variable | Standard | Beschreibung` darstellen. Diesen Abschnitt vollständig weglassen, wenn kein Betreiber etwas konfiguriert.

**6. `## Erweiterungspunkte`** — Wie ein anderer Mitwirkender diese Komponente erweitern oder in sie einbinden kann: welche Schnittstelle implementiert werden muss, welche Methode die Erweiterung registriert, wie der Lebenszyklus aussieht. Weglassen, wenn die Komponente keine Erweiterungspunkte hat.

**7. `## API-Routen`** — Eine Tabelle der HTTP-Routen mit den Spalten `Methode | Pfad | Beschreibung | Auth`. Alle von dieser Komponente registrierten Routen einschließen. Weglassen, wenn die Komponente keine Routen registriert.

### Tiefenebenen

Verschiedene Komponententypen erfordern unterschiedliche Tiefe:

| Ebene            | Komponenten                    | Erforderliche Abschnitte                                                            |
| ---------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| Plattform / Core | `src/docs/`-Plattformdocs      | Alle Abschnitte vollständig                                                         |
| Gateway          | `src/gateways/<id>/docs/`      | Leichtere Architektur; Konfiguration + API-Routen einschließen                      |
| Adapter          | `src/adapters/<gw>/<id>/docs/` | Vollständiger Standard (alle anwendbaren Abschnitte)                                |
| Modul            | `<module-repository>/docs/`    | Vollständiger Standard; API-Routen einschließen, wenn das Modul welche bereitstellt |

### Code-Snippets

- Zwei-Leerzeichen-Einrückung in allen Code-Blöcken verwenden.
- Einfache Anführungszeichen für TypeScript/JavaScript-Zeichenfolgenliterale verwenden.
- Code-Snippets keine Kommentare hinzufügen, es sei denn, sie erklären eine nicht offensichtliche Einschränkung.
- Dateipfad-Referenzen verwenden die repo-relative Form: `src/gateways/auth/gateway.ts`.

### Tabellen

Pipe-Syntax mit einer Header-Trennzeile verwenden:

```
| Spalte A | Spalte B | Spalte C |
| -------- | -------- | -------- |
| Wert     | Wert     | Wert     |
```

## Konfiguration

Dieser Standard gilt für alle Dokumentationen im Cognis-Repository. Es ist keine Laufzeitkonfiguration erforderlich.

## Erweiterungspunkte

So fügen Sie ein neues Dokument für eine Komponente hinzu:

1. Erstellen Sie ein `docs/`-Unterverzeichnis im Komponentenverzeichnis.
2. Fügen Sie `index.en.md` als primäres englisches Dokument hinzu und folgen Sie der oben beschriebenen Abschnittsstruktur.
3. Fügen Sie Übersetzungen als `index.de.md`, `index.ja.md`, `index.id.md` mit Werten in der Zielsprache hinzu.
4. Der Docs-Route erkennt die Datei automatisch beim nächsten Server-Start.

Für plattformübergreifende Dokumente, die mehrere Komponenten betreffen, fügen Sie `<name>.en.md` direkt in `src/docs/` hinzu (z. B. `src/docs/acl-matrix.en.md`). Diese werden unter dem Slug `<name>` bereitgestellt.

### Dateinamensgebung

| Speicherort                           | Primäre Datei  | Übersetzungsdateien                            |
| ------------------------------------- | -------------- | ---------------------------------------------- |
| Plattform (`src/docs/`)               | `<name>.en.md` | `<name>.de.md`, `<name>.ja.md`, `<name>.id.md` |
| Komponente (`docs/`-Unterverzeichnis) | `index.en.md`  | `index.de.md`, `index.ja.md`, `index.id.md`    |

Alle vier Sprachen (en, de, ja, id) sind für alle in der Benutzeroberfläche sichtbaren Zeichenketten erforderlich. Der Docs-Browser greift auf `.en.md` zurück, wenn eine Übersetzung fehlt.

### Sprachanforderungen

Jeder Zeichenkettenwert in einem übersetzten Dokument muss in der Sprache verfasst sein, die diese Datei repräsentiert. Die einzigen Ausnahmen sind Markennamen (`Cognis`), universelle technische Abkürzungen (`LDAP`, `TLS`, `STARTTLS`), Formatplatzhalter und der lateinische Slogan (`Disce. Loquere. Vive.`).

Wenn Sie ein Markdown-Dokument ändern, für das übersetzte Varianten existieren, aktualisieren Sie die entsprechenden Sprachdateien in derselben Änderung, damit alle unterstützten Sprachen synchron bleiben.

## Konvention für Funktionsdokumentation

Die verborgene Beitragsvorlage `.github/DOCUMENTATION_TEMPLATE.en.md` definiert die verbindliche Eröffnungsstruktur jeder echten Dokumentationsdatei. Direkt nach der H1 folgt eine informative Aussage darüber, was die dokumentierte Funktion oder Oberfläche leistet. Die nächste H2 enthält konkrete Verwendungsbeispiele für Importe, Capability-Auflösungen, Routenaufrufe, Konfiguration und erwartete Ergebnisse. Die folgende H2 beginnt die vollständige technische Spezifikation; Eingaben, Ausgaben, Lebenszyklus, Validierung, Autorisierung, Fehler, Nebenwirkungen, Persistenz, Sicherheit, Bereinigung und Erweiterungsdetails gehören dort hinein oder in untergeordnete H3-Abschnitte. Der Architekturtest vergleicht die ersten drei Überschriftenebenen jeder Nicht-Changelog-Dokumentation mit der verborgenen Vorlage.
