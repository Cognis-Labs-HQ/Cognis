# Externe Module

Für den Start externer Module gilt standardmäßig ein begrenztes Zeitfenster von zwei Minuten, damit validierte Inhaltspakete vor der Veröffentlichung ihrer Fähigkeiten vollständig importiert werden können. Ein explizites Zeitlimit des Hosts bleibt wirksam. Bei Fehlern oder Zeitüberschreitung werden registrierte Beiträge entfernt; das Modul bleibt nicht verfügbar. Mitgelieferte Audiodateien werden bei erneuter Aktivierung aus dem versionierten Dateispeicher wiederverwendet; fehlende Dateien werden über das Files-Gateway neu angelegt. Bibliothekseinträge und Beziehungen werden weiterhin abgeglichen, auch bei unveränderten Paketen.

Externe Module erweitern Cognis um unabhängig installierbares Server- und Browserverhalten und bleiben dabei hinter Manifest-, Fähigkeits-, Ablauf-, Routen-, Integritäts- und Lebenszyklusverträgen isoliert.

## Anwendungsbeispiele

Ein Repository deklariert seine stabile Identität und seinen Bootstrap-Einstiegspunkt in `manifest.json`:

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

Der Bootstrap stellt Verhalten ausschließlich über seinen begrenzten Kontext bereit und gibt eine Bereinigung für eigene Ressourcen zurück:

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

Administratoren installieren das Repository unter **Module**, prüfen Integrität und Abhängigkeiten, aktivieren es ausdrücklich und können es später deaktivieren, um alle registrierten UI- und Backend-Funktionen ohne Cognis-Neustart zu entfernen.

## Technische Spezifikation

## Stabile Identität

Jedes Modul verfügt über einen menschenlesbaren `id` und einen RFC 4122 `uuid`. Die ID kann umbenannt werden; Die UUID darf sich niemals ändern, zwischen Produkten wechseln oder wiederverwendet werden. Jeder `requires`-Eintrag ist eine Komponenten-UUID. Cognis verwendet UUIDs für Abhängigkeits- und Lebenszyklusentscheidungen und Namen nur für die Anzeige und URLs.

### Repository-Vertrag

Ein Git-Repository liefert ein Modul. Sein Stamm enthält `manifest.json`, `package.json`, `routes.json` und den erforderlichen Einstieg `bootstrap.js` sowie optionale Einstiegspunkte `api/index.js`, `ui/index.js` und `cli/index.js`. `bootstrap.js` ist der einzige Systemintegrationseintrag und erhält `ctx`; es darf nur Dateien seines Repositorys importieren; Verhalten des Hosts und fremder Komponenten wird über ctx-Fähigkeiten und Flows bezogen. Exportierte Fähigkeiten und Flow-Stufen müssen `ctx` verwenden, damit die Lebenszyklusbereinigung sie verfolgen kann. Sicherheitsrelevante Registrierungen bleiben eingeschränkt und erfordern `privileged: true`; gewöhnliche Importe, API-URLs und gemeinsame Stilklassen machen ein Modul nicht privilegiert.

`package.json` muss `"type": "module"` verwenden und seine Version muss genau mit `manifest.json` übereinstimmen. `routes.json` ist immer vorhanden und enthält ein Array, einschließlich eines leeren Arrays, wenn das Modul keine Routen beansprucht. Jeder deklarierte Einstiegspunkt muss innerhalb des Checkouts in eine reguläre Datei aufgelöst werden. Behalten Sie die Orchestrierung in den deklarierten Einstiegspunkten bei und platzieren Sie Implementierungscode in den vorgeschriebenen Verzeichnissen; Cognis importiert keinen anderen Modulpfad.

Jedes externe Modul deklariert `entrypoints.bootstrap`. Cognis importiert nur diese Datei und ruft `bootstrapModule(ctx)` auf, wenn das Modul aktiviert ist. Der bereichsbezogene Kontext bietet API-Routenregistrierung, statische Modulverzeichnisse, SPA-Routen, Navigation, Einstellungen und Seitenerweiterungen, Fähigkeitsbeiträge, Flow-Erstellung und Stufeninjektion. Platzieren Sie die lokalisierte Dokumentation unter `docs/` und die Versionshinweise für Module unter `docs/changelog/`. Beide werden aus installierten Repositorys ohne Registrierung des Kernpfads erkannt. Browser-Assets bleiben Eigentum des Moduls und werden nur über `ctx.registerStaticDir` verfügbar gemacht. Ein Modul kann einen dedizierten Browser-Fähigkeitsanbieter mit `ctx.registerCapabilityProvider({ scriptUrl, providesCapabilities })` veröffentlichen; Cognis nimmt ihn nur in den Anbieterkatalog auf, solange das Modul aktiviert ist, und entfernt ihn bei der Lebenszyklusbereinigung.

Ein aktiviertes Modul kann eine Seite gezielt für anonyme und angemeldete Besucher bereitstellen, indem es `public: true` an `ctx.registerSpaRoute` übergibt. Öffentliche Routen dürfen keine rollenbasierte `access`-Richtlinie deklarieren. Cognis stellt anonymen Browserclients ausschließlich ausdrücklich öffentliche Routenbeschreibungen bereit und liefert deren SPA-Hülle ohne Weiterleitung zu `/login` aus; standardmäßig bleibt jede Route authentifizierungspflichtig.

Sicherheitssensible Flow-Hooks und Gateway-eigene Routenbeiträge erfordern `privileged: true` im Modulmanifest. Die Deklaration als SSO-Anbieter gewährt diesen Zugriff nicht. Privilegierte Module aus der fest eingetragenen GitHub-Organisation `Cognis-Labs-HQ` gelten als vertrauenswürdig; bei jeder anderen Quelle, die Privilegien anfordert, wird eine ausdrückliche Sicherheitswarnung ausgegeben. Module können geschützte Core-Routen weiterhin nicht direkt registrieren: Ein privilegiertes Authentifizierungsmodul trägt Callback-Routen über den eingeschränkten Vertrag `routeNamespace` und `registerRoutes(router)` seines registrierten Auth-Adapters bei.

Jeder Modulbeitrag ist eigentümergeschützt: API-Routen, Fähigkeiten, Flows, Flow-Hooks, statische Präfixe und UI-Registrierungen lehnen Ersetzung oder Kollision durch andere Eigentümer ab und werden nur zusammen mit ihrem aufgezeichneten Eigentümer entfernt. Für modulübergreifende Integrationen gibt `await ctx.getModuleAssurance(moduleId)` UUID, Version, Privilegienherkunft, Quell-Repository und Laufzeitintegrität (`verified`, `unverified` oder `failed`) des Zielmoduls zurück. Installierte Manifeste werden in installationsverwalteter Herkunft versiegelt und deklarierte Dateien zur Laufzeit erneut gehasht, sodass Verbraucher vor der Nutzung fremder Fähigkeiten eine erwartete UUID und `verified`-Integrität verlangen können.

Nicht privilegierte Module können zusammenarbeiten, ohne Host- oder fremde Namensräume zu beanspruchen. Der Anbieter veröffentlicht eine Fähigkeit oder einen Flow unter seinem eigenen Präfix `<provider-module-id>:`; der Verbraucher deklariert die Anbieter-UUID in `requires`, löst den namensgebundenen Vertrag über `ctx` auf und kann ihn mit `getModuleAssurance` prüfen. Beispielsweise kann ein Whiteboard-Modul `nextcloud-whiteboard:openBoard` veröffentlichen, damit ein Jitsi-Modul es verwendet. Auch die Erweiterung eines veröffentlichten, nicht sicherheitskritischen Flows bleibt unprivilegiert. Nur Registrierungen außerhalb des eigenen Modulnamensraums oder Erweiterungen geschützter Sicherheitsflows erfordern `privileged: true`.

Module, die rechtliche, unterstützende oder andere vor der Anmeldung relevante Dokumente veröffentlichen, können `ctx.registerAuthFooterPlugin({ scriptUrl })` aufrufen. Cognis lädt aktivierte Beiträge auf der Anmelde- und Registrierungsseite. Das Browsermodul exportiert eine asynchrone Funktion `listAuthFooterLinks()`, die den maßgeblichen Zustand abfragt und nur derzeit zulässige Links wie veröffentlichte Dokumente zurückgibt. Cognis ersetzt den vorherigen Linksatz dieses Anbieters durch die zurückgegebenen Beschreibungen und zeigt ihn im gemeinsamen Streifen unterhalb der Authentifizierungsbereiche an; ein leeres Array zieht alle Links dieses Anbieters zurück.

`bootstrapModule` kann einen Entsorger zurückgeben und ein Modul kann zusätzlich `teardownModule(ctx)` exportieren. Bei der Deaktivierung oder Deinstallation ruft Cognis diese Hooks auf und entfernt dann alle Routen, statischen Verzeichnisse, UI-Beiträge, Funktionen, erstellten Flows und injizierten Flow-Stufen, die vom bereichsbezogenen Kontext aufgezeichnet wurden. Module dürfen keine Timer, Listener, Sockets oder andere Arbeiten behalten, nachdem ihr Entsorger abgeschlossen ist. Beiträge, die durch den Import von Kerninterna oder durch die Umgehung des bereitgestellten `ctx` erfolgen, können nicht nachverfolgt werden und werden nicht unterstützt.

Das Manifest deklariert `uuid`, `id`, `name`, `version`, `publisher`, `class`, `coreApiVersion`, `summary`, `description`, `categories`, `recommended`, `license`, `homepage`, `repository`, `support`, `capabilities`, UUID-basierter `requires`, `entrypoints` und `assets`. Asset-Pfade sind Repository-bezogen. `assets.icon` identifiziert das quadratische Store-Symbol, `assets.banner` identifiziert den Detailhelden und `assets.screenshots` ist eine geordnete Galerie. Pfade müssen innerhalb des Repositorys bleiben.

Lokalisierungsschlüssel müssen Punkte als Worttrenner verwenden: `module.example.canvas.label` statt `module.example.canvas_label` oder `module.example.canvas-label`. Durch Punkte getrennte Segmente gewährleisten vorhersehbare Eigentümerschaft, Auflösung, Validierung und Werkzeugunterstützung. Die registrierte Modul-ID ist die einzige beabsichtigte Ausnahme, wenn ihre unveränderliche ID bereits einen Bindestrich enthält.

### Quellen und private Repositories

Cognis schließt die `https://github.com/Cognis-Labs-HQ`-Organisation standardmäßig als unveränderliche vertrauenswürdige Quelle ein. Administratoren können weitere GitHub-Organisationen oder GitLab-Gruppen über „Module“ im Benutzermenü und dann über „Modulquellen“ hinzufügen. Cognis fragt die Anbieter-API ab, behandelt jedes Repository, das ein gültiges Root-Manifest enthält, als Modul und leitet den Katalog dynamisch ab. Eine Quelle kann auf eine optionale PAT verweisen, die im Schlüsselbund des angemeldeten Administrators gespeichert ist. Der Quelldatensatz speichert nur die Schlüsselbund-ID. Verwenden Sie ein schreibgeschütztes Token mit den geringsten Berechtigungen und Repository- und Metadatenzugriff. Token werden nur zur Erkennung und zum Klonen bereitgestellt und niemals in die Quellkonfiguration geschrieben. Private Repositories werden ausgeschlossen, sofern **Private Repositories durchsuchen** nicht aktiviert ist; bei Aktivierung ist das PAT verpflichtend.

### GitHub-PAT-Berechtigungen für private Scans

Bevorzugen Sie einen PAT mit differenzierten Berechtigungen und konfigurieren Sie ihn wie folgt:

- **Ressourcenbesitzer:** Wählen Sie die GitHub-Organisation der Cognis-Modulquelle.
- **Repository-Zugriff:** Wählen Sie **Alle Repositorys** oder jedes private Repository, das Cognis erkennen und installieren soll.
- **Repository-Berechtigungen:** Setzen Sie **Metadata** und **Contents** auf **Read-only**. Metadata erlaubt die Repository-Auflistung; Contents erlaubt Manifest-Erkennung und authentifiziertes Klonen.
- **Organisationsberechtigungen:** Keine ist erforderlich. Cognis benötigt weder **Administration**, **Members**, **Secrets** noch eine Copilot-Berechtigung.
- **Genehmigung und SSO:** Schließen Sie bei entsprechender Organisationsrichtlinie die Genehmigung und SAML-SSO-Autorisierung ab.

Gewähren Sie einem klassischen persönlichen Zugriffstoken den Umfang `repo` und autorisieren Sie es gegebenenfalls für das Organisations-SSO. Der Tokenbesitzer muss bereits auf jedes ausgewählte private Repository zugreifen dürfen. Cognis lehnt die Quelleinstellung ab, wenn das Token kein privates Repository auflisten und dessen Inhalte lesen kann.

### Installation und Sicherheit

Die Installation klont das ausgewählte HTTPS-Repository ohne interaktive Eingabeaufforderung für Anmeldeinformationen, validiert das heruntergeladene Root-Manifest und die unveränderliche UUID und verschiebt es atomar unter das Stammverzeichnis des externen Moduls. Vor dem Auschecken überprüft Cognis die Paket- und Manifestversionen, die Routendeklaration, die Einstiegspunkte, die erforderliche Grafik, sichere Repository-relative Pfade und jeden deklarierten SHA-256-Datei-Digest. Bei einer fehlgeschlagenen Prüfung wird das temporäre Auschecken entfernt und die installierte Version bleibt unberührt. Beim Aktualisieren wird dieser Vorgang für dieselbe UUID wiederholt. Durch die Deinstallation wird der Checkout dieser UUID entfernt. Die Aktivierung bleibt eine separate Lebenszyklusaktion, sodass Code nicht einfach durch Durchsuchen oder Installieren ausgeführt wird. Routen müssen in `routes.json` deklariert werden; Geschützte Kernpräfixe können nicht beansprucht werden.

Repository-Besitzer sollten Releases signieren, Abhängigkeiten pinnen, Prüfsummen in `files` veröffentlichen, generierte Geheimnisse vermeiden und alle angeforderten Funktionen dokumentieren. Screenshots dürfen keine Anmeldeinformationen oder persönlichen Daten enthalten. Cognis-Administratoren bleiben dafür verantwortlich, den Code von Drittanbietern zu überprüfen, bevor sie ihn aktivieren.

### Extraktionscheckliste

Bevor Sie ein gebündeltes Modul in sein eigenes Repository verschieben, kopieren Sie das Modulverzeichnis, ohne seine UUID zu ändern, behalten Sie die lesbare ID bei und behalten Sie die Stammverzeichnisse `manifest.json`, `package.json` und `routes.json` bei. Stellen Sie sicher, dass die Repository-URL, die Homepage und die Support-Links auf das neue Projekt verweisen. Manifest- und Paketversionen synchron halten; Stellen Sie sicher, dass jeder deklarierte Einstiegspunkt und jedes Asset mit der exakten Groß-/Kleinschreibung des Dateinamens vorhanden ist. `files` SHA-256-Werte nach der letzten Änderung neu generieren; und führen Sie die Modultests aus, ohne auf monoreporelative Importe angewiesen zu sein. Die Laufzeitinteraktion mit Cognis und anderen Komponenten darf nur über die Bootstrap-`ctx`-Funktionen und -Abläufe erfolgen. Testen Sie die Aktivierungs-, Deaktivierungs- und Deinstallationszyklen, damit jeder Beitrag nachweislich entfernbar und wiederholbar ist.

### Speichern Sie Assets und Tags

Ein Modul kann `tags` neben seinem umfassenderen `categories` deklarieren. beide beteiligen sich an der Marktplatzfilterung. Speichern Sie Bildmaterial im Stammverzeichnis des Repositorys unter `assets/`: Geben Sie `assets/icon.svg` oder `assets/icon.png` für das Katalogsymbol und `assets/banner.svg`, `assets/banner.png` oder `assets/banner.jpg` für den Detailseiten-Helden an. Deklarieren Sie die gewählten Pfade als `assets.icon` und `assets.banner` in `manifest.json`. Optionale Galeriebilder sind in `assets.screenshots` aufgeführt. Halten Sie Kunstwerke frei von Geheimnissen und persönlichen Daten. Das Deaktivieren oder Neustarten eines Moduls muss diese gespeicherte Konfiguration erhalten; nur der Deinstallationsablauf darf sie löschen. Detailseiten installierter Module wählen für die aktive UI-Sprache `README.<locale>.md` und verwenden danach in dieser Reihenfolge `README.en.md`, `README.md` und die Katalogbeschreibung. Der optionale Kompatibilitätsalias `README.md` im Stammverzeichnis ist weder erforderlich noch wird seine Prüfsumme validiert; lokalisierte Dateien `README.<locale>.md` können weiterhin in das Integritätsinventar des Manifests aufgenommen werden.

Modulbilder werden unabhängig von der Codeinstallation abgerufen. Öffentliche GitHub-Dateien werden von raw.githubusercontent.com gestreamt; private und Enterprise-Repositories verwenden authentifizierte Rohantworten, GitLab seinen Raw-Dateiendpunkt. Cognis speichert Bytes und Medientyp in einem separaten Hash-Cache und liefert sie über den authentifizierten Katalogendpunkt aus. So entfällt die Größenbegrenzung eingebetteter Inhalte im GitHub-Contents-JSON. Leere Dateien und Downloads über der bestehenden Grenze von 10 MiB werden abgewiesen. Protokolle nennen Quelle, Repository, Referenz, Pfad, Transport, Phase und HTTP-Status oder Fehlergrund. Aktualisieren Sie den Katalog, um den Abruf erneut zu versuchen. Fehlende Icons behalten das Fragezeichen-SVG; fehlende oder nicht dekodierbare Banner zeigen den lokalisierten Hinweis Bild nicht verfügbar.

### Moduleinstellungen

Ein Modul kann mit `ui.preferences` vom Administrator bearbeitbare Einstellungen bereitstellen. Jedes Feld deklariert einen stabilen `key`, einen lokalisierten `labelKey`, einen optionalen `descriptionKey`, einen `type` aus `boolean`, `string` oder `number` einen optionalen passenden `default`, einen `password`-Typ für verdeckte sensible Zeichenfolgen und `required: true`, wenn die Aktivierung blockiert werden muss, bis der moduleigene Konfigurationsendpunkt einen Wert zurückgibt; `ui.stringsBaseUrl` bezeichnet die moduleigenen Übersetzungen. Fehlt diese Angabe, erkennt Cognis automatisch das Standardpaket `ui/languages/<locale>/strings.xml`. Cognis rendert diesen Manifestvertrag in der Detailansicht des installierten Moduls, fragt `GET /api/v1/modules/<id>/config` ab und sendet Änderungen mit `PUT` an denselben moduleigenen Endpunkt. Das Modul validiert, übernimmt und speichert seine Betriebskonfiguration. Es darf weder eine zweite Einstellungsoberfläche anbieten noch Cognis-Benutzereinstellungen als Konfigurationsspeicher verwenden. Für jedes gespeicherte Passwort gibt die Konfigurationsantwort `<key>Configured: true` statt des Geheimnisses zurück; Cognis zeigt `****` an, betrachtet das Pflichtfeld als erfüllt und sendet bei unveränderter Maske einen leeren Wert, damit das Modul sein gespeichertes Passwort beibehält.

### Protokollierung und Benutzerfeedback

Serverseitiger Start- und Routencode schreibt strukturierte Anwendungsprotokolle über `ctx.log(level, message, meta)`. Cognis ordnet jeden Eintrag dem Modul zu, bevor er an das Logging-Gateway weitergegeben wird. Browsercode bezieht `ui:log`, `ui:showToast` und `ui:openErrorPopup` aus `uiCtx.capabilities`; `ui:log` leitet authentifizierte Einträge an das Serverprotokoll weiter, während die Feedback-Funktionen die thematisierte und barrierefreie Oberfläche des Hosts verwenden. Module müssen diese Prozesse nutzen, statt sich bei Betriebsfehlern auf die Browserkonsole zu verlassen oder eigene Benachrichtigungsoberflächen zu implementieren.

### Veröffentlichungskanal-Aktualisierung und Browserclients

Bei einem installierten Modul löst die Katalogaktualisierung zuerst den installierten Branch oder das Release auf und verwendet den Standardbranch des Repositorys nur, wenn kein Kanal gespeichert ist. Module beziehen Gateway-eigene Browserdaten über deklarierte `uiCtx.capabilities`-Clients; aktuelle Hostclients sind `social:profileUiClient`, `social:messagesUiClient`, `files:uiClient` und `share:uiClient`. Jede benötigte UI-Capability muss deklariert werden, damit Cognis ihren aktiven Anbieter vor dem Einhängen der Modulroute lädt.

Die Marketplace-Installation lädt ausschließlich den ausgewählten Katalog-Commit mit einem flachen Git-Checkout. Jede Übertragung hat ein Zeitlimit von fünfzehn Minuten und wird abgebrochen, wenn die Datenrate zwei Minuten lang unter 1 KiB/s bleibt. Vorübergehende Fehler erlauben höchstens drei Versuche; unterbrochene Git-Übertragungen beginnen erneut. Der Browser wartet auf das Ergebnis des Serverauftrags und unterscheidet ein Installationszeitlimit von einer bestätigten Zeitüberschreitung beim Verbindungsaufbau. Repository-Prüfung und Manifest-Prüfsummen werden weiterhin vor Abschluss der Installation geprüft.

Module, die Konfiguration oder Inhalte außerhalb ihres Checkouts speichern, müssen `uninstallModule(ctx, { deleteContent })` aus dem deklarierten Bootstrap-Einstiegspunkt exportieren. Der Hook entfernt moduleigene Datensätze und Dateien nur, wenn `deleteContent` wahr ist. Cognis ruft ihn auf, während Fähigkeiten über `ctx.getCapability` verfügbar sind. Nach Erfolg löscht Cognis die gespeicherte Modulkonfiguration und den Checkout; bei einem Fehler bleiben beide für einen erneuten Versuch erhalten.

Deinstallations-Hooks lösen aktuelle öffentliche Anbieterfunktionen über dieselbe Grenze wie Bootstrap auf. Vom Routenkontext bereitgestellte Funktionen haben Vorrang; private Systemfunktionen bleiben verborgen. Anbieter für die Datenlöschung müssen während der Deinstallation des abhängigen Moduls aktiviert bleiben.

### Eigentum am UI-Bereich

Cognis besitzt die Dashboard-Oberfläche und jede von einer Host-Fähigkeit ausgegebene wiederverwendbare Komponente, einschließlich der strukturellen Avatar-Klassen `profile-capability-*`. Ein Modul besitzt nur Nachfahren, die es innerhalb des an `mount()` übergebenen Inhaltswurzelelements rendert. Jeder Modulselektor muss an einer modulnamensräumigen Klasse oder ID enden; ein Host-Themenselektor darf nur als Vorfahr dieses moduleigenen Ziels erscheinen. Module dürfen eigene Layoutklassen an Host-Renderer übergeben, aber keine Host-Stylesheets kopieren, Host-Fähigkeitsklassen neu definieren, Shell-Elemente auswählen oder `document.body` beziehungsweise `document.head` verändern. Anwendungsweites Verhalten gehört in deklarierte `uiCtx`-Fähigkeiten oder Flows mit entfernbaren Hooks.

Browsermodule beziehen wiederverwendbare Host-Werkzeuge und gemeinsame CSS-Regeln über die Fähigkeit `ui:reuse`, statt Host-Interna zu importieren oder Stile zu kopieren. `importModule(path)` lädt jedes Produktionsmodul unter `src/ui/reuse/`; `loadStylesheet(path)` und `loadStylesheets(paths)` laden Dateien unter `src/ui/styles/reuse/`; `loadCommonStyles()` lädt den vollständigen unveränderlichen Katalog `stylesheets`. `moduleUrl(path)` und `stylesheetUrl(path)` stehen bereit, wenn eine andere Host-Fähigkeit eine URL erwartet. Pfade sind relativ, müssen die erwartete Endung verwenden und dürfen weder Verzeichnisse durchlaufen noch Testdateien auswählen.

```js
const reuse = uiCtx.capabilities.get("ui:reuse");
const { createPageComposer } = await reuse.importModule(
    "page-composer/index.js",
);
await reuse.loadStylesheets(["layout.css", "page-sections.css"]);
```

Module, die ein Laufzeitskript laden müssen, deklarieren `ui:resourceLoader` und rufen dessen validierte, referenzgezählte Methode `loadScript({ id, src, globalName })` auf. Sie müssen den zurückgegebenen Griff beim Aushängen bereinigen und dürfen Skripte nicht direkt an das Dokument anhängen.

## Installationsabhängigkeiten

Externe Manifeste können `hardDependencies` und `softDependencies` als Listen von Modul-UUIDs oder IDs deklarieren. Harte Abhängigkeiten werden nicht empfohlen, da Administratoren sie vor der Installation installieren und aktivieren müssen. Weiche Abhängigkeiten können im Installationsdialog optional ausgewählt werden.

Deaktivierte Module importieren oder starten niemals ihren normalen Bootstrap. Muss ein Modul im deaktivierten Zustand Konfiguration bereitstellen, deklariert es `entrypoints.disabledApi`; diese isolierte Datei exportiert `registerDisabledApiRoutes(ctx)` und darf nur ausdrücklich mit `allowWhenDisabled` markierte Routen registrieren. Es darf außerdem moduleigene Konfigurations-Flows und Hooks für diese Flows registrieren. Diese Registrierungen werden bei Aktualisierung oder fehlgeschlagener Einrichtung entfernt; öffentliche Capabilities bleiben bis zur Aktivierung nicht verfügbar.

Vor dem Entfernen ihrer Flows auf aktive Modulanfragen warten und neue Anfragen bis zum Abschluss des Abgleichs zurückstellen, auch bei fehlgeschlagener Aktivierung. Zustimmungsprüfungen behalten einen vollständigen Routen- und Flow-Lebenszyklus, während unabhängige Study-Module aktiviert werden.

### Hinweise nach der Aktivierung

Ein Modul, das Konfigurationsoberflächen an anderer Stelle in Cognis beiträgt, kann `ui.activationGuidance` deklarieren, anstatt ein leeres Moduleinstellungsformular zu erstellen. Der Vertrag enthält einen lokalisierten `titleKey`, einen optionalen `descriptionKey` und geordnete `steps`. Jeder Schritt besitzt eine stabile `id`, einen lokalisierten `labelKey`, einen optionalen `descriptionKey` und optionale `targets`. Ein Adapterziel verwendet `{ "kind": "adapter", "gatewayId": "<gateway>", "adapterId": "<adapter>" }`. Nach erfolgreicher Aktivierung zeigt Cognis alle Schritte an und bietet an, die Administration zu öffnen. Ein Modul kann mehrere Adapterziele aufführen, ohne dass der Core die Anbieternamen kennen muss.

### Öffentliche Capabilities

Externe Module veröffentlichen gemeinsame Server-Capabilities mit `ctx.contributePublicCapability(key, value)`. `ctx.getCapability` sowie `ctx.capabilities.get`, `has` und `require` beziehen öffentliche Capabilities aus der aktuellen Systemregistrierung, auch wenn der Anbieter erst nach dem Verbraucher startet. Private System-Capabilities bleiben verborgen; `system:ctx` wird Modulen niemals bereitgestellt. Aktualisierungen laufen nacheinander, damit Abbau und Registrierung sich nicht überschneiden. Das Deaktivieren entfernt die Beiträge des Anbieters; das erneute Aktivieren veröffentlicht sie wieder. Eine fehlgeschlagene Aktualisierung meldet dem Aufrufer einen Fehler, ohne spätere Aktualisierungen zu blockieren.

### Entwicklung aus der Vorlage

Alle neuen Module müssen aus [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template) entstehen: eigene Produkt-UUID sowie ersetzte Identität, Repositoryangaben, Grafiken und Beispiele. AGENTS.md und Prüfskripte beibehalten. Der [Beitragsstandard](/docs/standard) schreibt API-Handler in `api/routes/<domain>/index.js`, CSS in `ui/styles/`, Vorlagen in `ui/templates/`, schichteigene Tests und Release-Notizen in `docs/changelog/` vor. Jitsi Meet erprobt diese Struktur bei stabilen Routen-URLs. Importe bleiben repositorylokal; fremde Komponenten werden ausschließlich über ctx genutzt.

### Lebenszyklus der Registrierungen

Serverregistrierungen mit Rückgabebereinigung werden mit `ctx.registerDisposer(dispose)` verbunden. Cognis führt sie bei Aktualisierung, Deaktivierung und fehlgeschlagenem Bootstrap in umgekehrter Reihenfolge aus, auch für deaktivierte Konfigurationseinstiege. Die öffentlichen Verträge `system:health:contribute(id, callback)` und `auth:registerKeyringDataOwner(id, purge)` liefern eigene Disposer. Keyring-Bereinigung setzt nur abhängige Daten zurück und löscht weder Kontenidentität noch fremde geteilte Inhalte.

Browseranbieter exportieren `mountProvider(scopedUiCtx)` statt beim Import Fähigkeiten oder Listener anzulegen. Der begrenzte Kontext besitzt Fähigkeiten, erstellte Flows und Stufenhooks; sein AbortSignal beendet Listener, ein zurückgegebener Disposer andere Ressourcen. Katalogabgleich mountet eine URL nur einmal, auch wenn beide Kataloge sie enthalten, und mountet gecachte Skripte nach erneuter Aktivierung wieder. `ui:navbarLinks.contribute(id, { href, label, visible })` registriert Navigation beim Host. Routenseiten behalten ihren `mount`/`unmount`-Vertrag.

### Befehls- und Versionsumfang

Npm-Skripte laufen im Repository; `npm --prefix <module-checkout> test` wählt es ausdrücklich. Installierte Modulaktionen verwenden `cognisctl modules:<module-id>:<action>`. Dies sind getrennte Schnittstellen. Erforderliche Fähigkeiten steuern Verfügbarkeit; eine angezeigte getestete Anbieterversion ist Diagnoseinformation, keine erzwungene Versionsgrenze. Tatsächliche Abhängigkeiten deklarieren und installierte öffentliche Verträge testen; keine nicht implementierten Versionsprüfungen versprechen.

## Modulidentität und Besitz von Browser-Anbietern

Installiert ein Administrator ein Modul, dessen ID bereits einer anderen UUID gehört, enthält der Konflikt `moduleId`, `installedModuleUuid` und `requestedModuleUuid`. Server und Modulverwaltung protokollieren diese Identitäten; Nichtadministratoren erhalten keinen Zugriff. Eine übereinstimmende ID und UUID erlaubt weiterhin eine Aktualisierung. Veröffentlichte UUIDs dürfen nicht geändert und kollidierende Installationen nicht überschrieben werden, um diese Prüfung zu umgehen. Der Browser-Anbieter-Lebenszyklus wird über `ui:providerLifecycle` gemeinsam verwaltet, sodass gebündelte und direkt bereitgestellte Loader denselben Katalog abgleichen und einen Anbieter nicht doppelt einbinden.

## Scoped Browser-Aktionen und verifizierte Administration

Browser-Provider beziehen `ui:scopedActions` über ihren Scoped ctx. Ein Aufruf mit `(ctx, moduleId, actions)` registriert einen ausführbaren Flow für jede benannte Aktion und liefert die veröffentlichten Funktionen zurück. Verwaltungsabfragen und Änderungen verwenden diese Funktionen; der Host entfernt die Flows und veraltete Handles werden nach dem Abbau zurückgewiesen. Administratorrechte stammen aus der aktuellen Rolle des aktivierten Kontos, nicht aus Rollenfeldern des Aufrufers.

Der Host-Helfer `mountWhenDirect` übergibt `mount(root, { signal })` ein AbortSignal, das bei ausgeführter Routennavigation oder Seitenende endet. Seiten binden Aufräumarbeiten daran und prüfen es nach asynchroner Initialisierung. Fehlgeschlagene Mounts brechen eigene Ressourcen ab; abgebrochene Arbeit veröffentlicht keine Fehler auf der Zielseite. Markdown-Linktexte unterscheiden maskierte von gewöhnlichen Zeichen, um mehrdeutiges Backtracking zu vermeiden. CI fordert ausschließlich Lesezugriff auf Repository-Inhalte an.

Eine abgebrochene direkte Seite gibt ihr gemeinsames Ladetoken sofort frei, auch bei ausstehender Übersetzungs-, Anbieter- oder Composer-Initialisierung. Die Ressourcenbereinigung bleibt an dasselbe Host-Signal gebunden.

## Modul-IDs in Übersetzungen erhalten

Übersetzungsschlüssel verwenden `module.<manifest.id>.<feature>.<label>`. Eine mehrteilige Modul-ID bleibt mit ihren Bindestrichen erhalten; für `terms-of-service` lautet ein Schlüssel `module.terms-of-service.admin.title`. Der Suffix nach der Modul-ID verwendet kleingeschriebene, durch Punkte getrennte Wörter. Manifest-Metadaten, XML-Dateien und Codeverweise müssen denselben Namensraum verwenden.

Die Marktplatzdarstellung hält zwischengespeicherte Namen, Beschreibungen, Kategorien und Tags mit den zugehörigen Katalogübersetzungen zusammen, wenn das installierte Modul einen anderen Namensraum verwendet. Installierte Einstellungen behalten ihre eigene Übersetzungs-URL; eine neue Katalogsuche ersetzt die zwischengespeicherte Darstellung.

### Rechtstextlinks im Footer erhalten

Alle Browserclients verwenden die Footer-Registrierung von `ctx`, auch getrennt geladene statische Skripte und Bundles. Footer-Deskriptoren können `target: "_blank"` anfordern; die Darstellung ergänzt `noopener noreferrer`. Authentifizierungsanbieter liefern übersetzte Beschriftungen und Authentifizierungskontexte, während Rechtstextlinks angemeldeter Sitzungen ausdrücklich zum Anwendungskontext gehören. Verlauf und Browser-Cache-Wiederherstellung aktualisieren veröffentlichte Rechtstextlinks, ohne die Core-Links für Lizenz oder Änderungen zu ersetzen.

Die gemeinsamen Core-Funktionen `createI18n` und `extendI18n` lösen fehlende oder leere Werte der bevorzugten Sprache je Schlüssel aus englischen XML-Ressourcen für Core, Module und Komponenten auf. Nicht auflösbare Schlüssel lösen `missing_translation:<key>` aus. Module geben ihre Ressourcen-URLs an und verwenden den Host-Resolver, statt eine eigene Ersatzlogik zu implementieren.

Core ergänzt modulbezogene UI-Ressourcen-URLs bei der Registrierung um die installierte Modulrevision. Modulskripte und Sprachdateien werden neu validiert, statt die unveränderliche Cache-Laufzeit der Host-Version zu übernehmen. Der Service Worker lädt Modulressourcen direkt ohne zwischengespeicherte Ersatzantwort und erneuert seine Ressourcen-Caches. Ein Modulupdate ändert die Importadresse des Einstiegspunkts, damit veraltete Skripte keine entfernten Abhängigkeiten anfordern.

Eigenständige Authentifizierungsrückrufe verwenden `navigateToDocument(path, { signal })` aus `page-entry.js` für Wechsel zu Serverdokumenten. Die Funktion prüft HTTP(S)-URLs desselben Ursprungs ohne eingebettete Zugangsdaten, beachtet den bestehenden Navigationsschutz und verhindert Navigation nach Abbruch. Dashboard-Navigation und das Verhalten bei fehlenden Renderern bleiben beim unveränderten SPA-Router. `ui:log` überspringt anonyme Anfragen und fängt Zustellfehler ab; der Protokollierungsendpunkt erfordert weiterhin Authentifizierung.

Externe SSO-Rückrufe benötigen `mountWhenDirect` und `navigateToDocument` aus der Hostdatei `page-entry.js`. `npm run check:ui-host` prüft den Quellstand und `npm run check:ui-build` die gebauten Ressourcen. Nach der Bereitstellung `npm run check:ui-host -- --origin https://your-cognis-host.example` aus einem Netzwerk mit Zugriff auf den Host ausführen. Die Fernprüfung liest nur öffentliches JavaScript, sendet keine Zugangsdaten und analysiert Exporte, ohne heruntergeladenen Code auszuführen. Proxy-Umgebungen können Nodes Unterstützung mit `NODE_USE_ENV_PROXY=1` aktivieren.

Den passenden Core-Host einschließlich UI-Ressourcen und Ressourcenmanifest vor den Rückrufmodulen bereitstellen; einen Prozess, der noch die vorige Veröffentlichung verwendet, neu starten. Die Rückrufseite erst nach erfolgreicher Prüfung der öffentlichen Host-Exporte neu laden. Eine Modulversion belegt nicht den Stand der ausgelieferten Hostressource. Bei deaktivierter öffentlicher Registrierung benötigen unbekannte externe Identitäten weiterhin eine Registrierungsautorisierung; bereits zugeordnete Identitäten durchlaufen sie nicht erneut. HTTP 403 allein erklärt die Ablehnung nicht: Fehlercode und Registrierungsfortsetzungsfelder prüfen, ohne Zugangsdaten oder Cookies weiterzugeben.

## Komponentengrenzen und Laufzeit

Die API delegiert Erweiterungsnamensräume über Richtlinien aktiver Gateways; Study besitzt die Regeln für Sprachnamensräume. Library entfernt seine öffentlichen Funktionen, wenn der Adapter oder seine Study-Abhängigkeiten deaktiviert sind, weist gespeicherte Funktionsreferenzen zurück und registriert sie beim Aktivieren erneut. Study-Adapter verwenden `onAvailabilityChange(listener)` für laufzeitgebundene Beiträge; ein fehlgeschlagener Start entfernt diese.

## Offline-Navigation

Deklarieren Sie `public: true` und `offline: { assets: [...] }` für eine SPA-Route. Listen Sie alle öffentlichen Laufzeitabhängigkeiten einschließlich Sprachkatalogen und Datendateien auf. Seiten müssen ohne API-Aufrufe, private Kontodaten oder die Erkennung sämtlicher Host-Anbieter funktionieren. Private Routen dürfen dies nicht aktivieren. Verwenden Sie Routenlinks für die Navigation. Unbekannte oder noch nicht geladene Abhängigkeiten bleiben nicht verfügbar.

Der Service Worker speichert keine API-Antworten, Zugangsdaten oder authentifiziertes HTML. Die Modulinvalidierung entfernt den öffentlichen Routenkatalog und Modulressourcen; Ressourcen mit Revision müssen dem aktuellen Katalog entsprechen. Entfernte Änderungen sind ohne Verbindung nicht erkennbar: Nur die zuletzt bekannte öffentliche Revision ist verfügbar. Bei Wiederherstellung werden der Katalog aktualisiert und ungespeicherte Änderungen vor dem Neuladen geprüft; danach gilt wieder die Serverautorisierung. Worker-Aktualisierungen warten auf das Schließen bestehender Tabs und bereiten die Wiederherstellungsressourcen vor der Aktivierung vor. Ein erster Besuch ohne installierten Worker funktioniert nicht offline.

Verwenden Sie Links oder Schaltflächen mit `data-navigation-path="/route"`; Cognis deaktiviert nicht unterstützte Ziele, ohne bereits vom Besitzer deaktivierte Elemente zu aktivieren.

### Offline lernen

Der Offline-Modus ist in den Einstellungen standardmäßig aktiviert. Deaktivieren stellt die bisherigen Verbindungswarnungen und Fehlermeldungen wieder her und schaltet den Worker-Fallback ab. Bei Aktivierung wechselt die Anwendung bei Verbindungsverlust ohne Fehlermeldung in den Offline-Modus; nicht verfügbare Navigation wird ohne Fehlerdialog blockiert.

Study behält begrenzte, kleine JSON-Schnappschüsse im aktuellen Tab: Schemas, erlaubte Zeichen- und Kartendaten, Speicherorte, gesehene IDs, Favoriten und zuvor geöffnete Kartensätze. Sprachschemas aktivieren dies mit `metadata.offline: { cache: "lightweight" }`. Der Library-Cache umfasst höchstens 16 MB und 100 Lesevorgänge; andere Lesecaches höchstens 4 MB und 100 Lesevorgänge. Audiodaten, Wörterbuchantworten, Zugangsdaten und authentifizierte Dokumente werden nicht dauerhaft gespeichert.

Privates Study benötigt dieselbe zuvor bestätigte, noch gültige Kontositzung im selben Tab. Nach Neuladen und beim Erstbesuch gilt weiterhin der ausschließlich öffentliche Offline-Vertrag. Konto- und Sitzungswechsel, geänderte Einstellungen, Modul-Lebenszyklusänderungen und die Freigabe eines Anbieters verwerfen private Schnappschüsse. Serverseitige Sperren können ohne Verbindung nicht erkannt werden. Die Wiederherstellung prüft ungespeicherte Änderungen und lädt die Serverautorisierung neu.
