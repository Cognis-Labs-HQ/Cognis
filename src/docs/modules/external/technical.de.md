# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Externe Module.

## Schnittstellen

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

Lokalisierungsschlüssel verwenden sowohl im Modulnamensraum als auch in Funktionsbezeichnungen kleingeschriebene, durch Punkte getrennte Wörter. Manifest-Metadaten, Kataloge und Codeverweise müssen übereinstimmen. Unveränderliche Modul-IDs begründen keine Ausnahme von dieser Regel.

### Öffentliche Capabilities

Externe Module veröffentlichen gemeinsame Server-Capabilities mit `ctx.contributePublicCapability(key, value)`. `ctx.getCapability` sowie `ctx.capabilities.get`, `has` und `require` beziehen öffentliche Capabilities aus der aktuellen Systemregistrierung, auch wenn der Anbieter erst nach dem Verbraucher startet. Private System-Capabilities bleiben verborgen; `system:ctx` wird Modulen niemals bereitgestellt. Aktualisierungen laufen nacheinander, damit Abbau und Registrierung sich nicht überschneiden. Das Deaktivieren entfernt die Beiträge des Anbieters; das erneute Aktivieren veröffentlicht sie wieder. Eine fehlgeschlagene Aktualisierung meldet dem Aufrufer einen Fehler, ohne spätere Aktualisierungen zu blockieren.

## Konfiguration

Quellen und Installationspfade konfiguriert der Host. Module deklarieren Identität, Abhängigkeiten, Routen, Dokumente und optionale Einstellungen; Geheimnisse kommen über geschützte Fähigkeiten.

## Verhalten

### Externe Module

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/study/library/technical).

Externe Module erweitern Cognis um unabhängig installierbares Server- und Browserverhalten und bleiben dabei hinter Manifest-, Fähigkeits-, Ablauf-, Routen-, Integritäts- und Lebenszyklusverträgen isoliert.

### Stabile Identität

Jedes Modul verfügt über einen menschenlesbaren `id` und einen RFC 4122 `uuid`. Die ID kann umbenannt werden; Die UUID darf sich niemals ändern, zwischen Produkten wechseln oder wiederverwendet werden. Jeder `requires`-Eintrag ist eine Komponenten-UUID. Cognis verwendet UUIDs für Abhängigkeits- und Lebenszyklusentscheidungen und Namen nur für die Anzeige und URLs.

### Quellen und private Repositories

Administratoren verwalten ein instanzweites Quellenverzeichnis und einen gemeinsamen Modulkatalog. Quellenzugangsdaten werden auf dem Server mit dem dauerhaften `DATA_ENCRYPTION_KEY` verschlüsselt. Alle Administratoren können sie verwenden, ersetzen oder löschen; Lese-APIs und Formulare zeigen nur an, ob Zugangsdaten eingerichtet sind. Ein leeres Passwortfeld behält den gespeicherten Wert bei. Browser-Schlüsselbunde werden nicht verwendet: Richten Sie die gemeinsamen Zugangsdaten einmal unter Modulquellen ein. Private Scans benötigen ein schreibgeschütztes PAT mit Repository- und Metadatenzugriff. Erkennung beim Start und Installationen verwenden dieselben Zugangsdaten ohne Browsersitzung. Die Verschlüsselung ist an Quellenidentität und Endpunkt gebunden; deren Änderung erfordert Ersatz oder Löschung. Fehlgeschlagene Scans behalten den Katalog bei, gleichzeitige Scans werden zusammengeführt und abgeschlossene Scans überschreiben keine neuere Quellenkonfiguration. Anbieteranfragen lehnen Weiterleitungen ab und besitzen feste Zeitgrenzen.

Die API zum Speichern einer Quelle akzeptiert `token` und `clearCredential` und liefert nur öffentliche Metadaten, `credentialConfigured` und eine Revision. Erkennung und Installation akzeptieren keine vom Aufrufer übergebenen Token mehr. Installationen verwenden maßgebliche Repository-Metadaten aus dem Cache und gespeicherte Zugangsdaten des Servers.

### Extraktionscheckliste

Bevor Sie ein gebündeltes Modul in sein eigenes Repository verschieben, kopieren Sie das Modulverzeichnis, ohne seine UUID zu ändern, behalten Sie die lesbare ID bei und behalten Sie die Stammverzeichnisse `manifest.json`, `package.json` und `routes.json` bei. Stellen Sie sicher, dass die Repository-URL, die Homepage und die Support-Links auf das neue Projekt verweisen. Manifest- und Paketversionen synchron halten; Stellen Sie sicher, dass jeder deklarierte Einstiegspunkt und jedes Asset mit der exakten Groß-/Kleinschreibung des Dateinamens vorhanden ist. `files` SHA-256-Werte nach der letzten Änderung neu generieren; und führen Sie die Modultests aus, ohne auf monoreporelative Importe angewiesen zu sein. Die Laufzeitinteraktion mit Cognis und anderen Komponenten darf nur über die Bootstrap-`ctx`-Funktionen und -Abläufe erfolgen. Testen Sie die Aktivierungs-, Deaktivierungs- und Deinstallationszyklen, damit jeder Beitrag nachweislich entfernbar und wiederholbar ist.

### Speichern Sie Assets und Tags

Ein Modul kann `tags` neben seinem umfassenderen `categories` deklarieren. beide beteiligen sich an der Marktplatzfilterung. Speichern Sie Bildmaterial im Stammverzeichnis des Repositorys unter `assets/`: Geben Sie `assets/icon.svg` oder `assets/icon.png` für das Katalogsymbol und `assets/banner.svg`, `assets/banner.png` oder `assets/banner.jpg` für den Detailseiten-Helden an. Deklarieren Sie die gewählten Pfade als `assets.icon` und `assets.banner` in `manifest.json`. Optionale Galeriebilder sind in `assets.screenshots` aufgeführt. Halten Sie Kunstwerke frei von Geheimnissen und persönlichen Daten. Das Deaktivieren oder Neustarten eines Moduls muss diese gespeicherte Konfiguration erhalten; nur der Deinstallationsablauf darf sie löschen. Detailseiten installierter Module wählen für die aktive UI-Sprache `README.<locale>.md` und verwenden danach in dieser Reihenfolge `README.en.md`, `README.en.md` und die Katalogbeschreibung. Der optionale Kompatibilitätsalias `README.en.md` im Stammverzeichnis ist weder erforderlich noch wird seine Prüfsumme validiert; lokalisierte Dateien `README.<locale>.md` können weiterhin in das Integritätsinventar des Manifests aufgenommen werden.

Modulbilder werden unabhängig von der Codeinstallation abgerufen. Öffentliche GitHub-Dateien werden von raw.githubusercontent.com gestreamt; private und Enterprise-Repositories verwenden authentifizierte Rohantworten, GitLab seinen Raw-Dateiendpunkt. Cognis speichert Bytes und Medientyp in einem separaten Hash-Cache und liefert sie über den authentifizierten Katalogendpunkt aus. So entfällt die Größenbegrenzung eingebetteter Inhalte im GitHub-Contents-JSON. Leere Dateien und Downloads über der bestehenden Grenze von 10 MiB werden abgewiesen. Protokolle nennen Quelle, Repository, Referenz, Pfad, Transport, Phase und HTTP-Status oder Fehlergrund. Aktualisieren Sie den Katalog, um den Abruf erneut zu versuchen. Fehlende Icons behalten das Fragezeichen-SVG; fehlende oder nicht dekodierbare Banner zeigen den lokalisierten Hinweis Bild nicht verfügbar.

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

### Installationsabhängigkeiten

Externe Manifeste können `hardDependencies` und `softDependencies` als Listen von Modul-UUIDs oder IDs deklarieren. Harte Abhängigkeiten werden nicht empfohlen, da Administratoren sie vor der Installation installieren und aktivieren müssen. Weiche Abhängigkeiten können im Installationsdialog optional ausgewählt werden.

Deaktivierte Module importieren oder starten niemals ihren normalen Bootstrap. Muss ein Modul im deaktivierten Zustand Konfiguration bereitstellen, deklariert es `entrypoints.disabledApi`; diese isolierte Datei exportiert `registerDisabledApiRoutes(ctx)` und darf nur ausdrücklich mit `allowWhenDisabled` markierte Routen registrieren. Es darf außerdem moduleigene Konfigurations-Flows und Hooks für diese Flows registrieren. Diese Registrierungen werden bei Aktualisierung oder fehlgeschlagener Einrichtung entfernt; öffentliche Capabilities bleiben bis zur Aktivierung nicht verfügbar.

Vor dem Entfernen ihrer Flows auf aktive Modulanfragen warten und neue Anfragen bis zum Abschluss des Abgleichs zurückstellen, auch bei fehlgeschlagener Aktivierung. Zustimmungsprüfungen behalten einen vollständigen Routen- und Flow-Lebenszyklus, während unabhängige Study-Module aktiviert werden.

### Hinweise nach der Aktivierung

Ein Modul, das Konfigurationsoberflächen an anderer Stelle in Cognis beiträgt, kann `ui.activationGuidance` deklarieren, anstatt ein leeres Moduleinstellungsformular zu erstellen. Der Vertrag enthält einen lokalisierten `titleKey`, einen optionalen `descriptionKey` und geordnete `steps`. Jeder Schritt besitzt eine stabile `id`, einen lokalisierten `labelKey`, einen optionalen `descriptionKey` und optionale `targets`. Ein Adapterziel verwendet `{ "kind": "adapter", "gatewayId": "<gateway>", "adapterId": "<adapter>" }`. Nach erfolgreicher Aktivierung zeigt Cognis alle Schritte an und bietet an, die Administration zu öffnen. Ein Modul kann mehrere Adapterziele aufführen, ohne dass der Core die Anbieternamen kennen muss.

### Entwicklung aus der Vorlage

Alle neuen Module müssen aus [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template) entstehen: eigene Produkt-UUID sowie ersetzte Identität, Repositoryangaben, Grafiken und Beispiele. AGENTS.md und Prüfskripte beibehalten. Der [Beitragsstandard](/docs/standard) schreibt API-Handler in `api/routes/<domain>/index.js`, CSS in `ui/styles/`, Vorlagen in `ui/templates/`, schichteigene Tests und Release-Notizen in `docs/changelog/` vor. Jitsi Meet erprobt diese Struktur bei stabilen Routen-URLs. Importe bleiben repositorylokal; fremde Komponenten werden ausschließlich über ctx genutzt.

### Lebenszyklus der Registrierungen

Serverregistrierungen mit Rückgabebereinigung werden mit `ctx.registerDisposer(dispose)` verbunden. Cognis führt sie bei Aktualisierung, Deaktivierung und fehlgeschlagenem Bootstrap in umgekehrter Reihenfolge aus, auch für deaktivierte Konfigurationseinstiege. Die öffentlichen Verträge `system:health:contribute(id, callback)` und `auth:registerKeyringDataOwner(id, purge)` liefern eigene Disposer. Keyring-Bereinigung setzt nur abhängige Daten zurück und löscht weder Kontenidentität noch fremde geteilte Inhalte.

Browseranbieter exportieren `mountProvider(scopedUiCtx)` statt beim Import Fähigkeiten oder Listener anzulegen. Der begrenzte Kontext besitzt Fähigkeiten, erstellte Flows und Stufenhooks; sein AbortSignal beendet Listener, ein zurückgegebener Disposer andere Ressourcen. Katalogabgleich mountet eine URL nur einmal, auch wenn beide Kataloge sie enthalten, und mountet gecachte Skripte nach erneuter Aktivierung wieder. `ui:navbarLinks.contribute(id, { href, label, visible })` registriert Navigation beim Host. Routenseiten behalten ihren `mount`/`unmount`-Vertrag.

### Modulidentität und Besitz von Browser-Anbietern

Installiert ein Administrator ein Modul, dessen ID bereits einer anderen UUID gehört, enthält der Konflikt `moduleId`, `installedModuleUuid` und `requestedModuleUuid`. Server und Modulverwaltung protokollieren diese Identitäten; Nichtadministratoren erhalten keinen Zugriff. Eine übereinstimmende ID und UUID erlaubt weiterhin eine Aktualisierung. Veröffentlichte UUIDs dürfen nicht geändert und kollidierende Installationen nicht überschrieben werden, um diese Prüfung zu umgehen. Der Browser-Anbieter-Lebenszyklus wird über `ui:providerLifecycle` gemeinsam verwaltet, sodass gebündelte und direkt bereitgestellte Loader denselben Katalog abgleichen und einen Anbieter nicht doppelt einbinden.

### Scoped Browser-Aktionen und verifizierte Administration

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

Der Host-Helfer `mountWhenDirect` übergibt `mount(root, { signal })` ein AbortSignal, das bei ausgeführter Routennavigation oder Seitenende endet. Seiten binden Aufräumarbeiten daran und prüfen es nach asynchroner Initialisierung. Fehlgeschlagene Mounts brechen eigene Ressourcen ab; abgebrochene Arbeit veröffentlicht keine Fehler auf der Zielseite. Markdown-Linktexte unterscheiden maskierte von gewöhnlichen Zeichen, um mehrdeutiges Backtracking zu vermeiden. CI fordert ausschließlich Lesezugriff auf Repository-Inhalte an.

Eine abgebrochene direkte Seite gibt ihr gemeinsames Ladetoken sofort frei, auch bei ausstehender Übersetzungs-, Anbieter- oder Composer-Initialisierung. Die Ressourcenbereinigung bleibt an dasselbe Host-Signal gebunden.

### Punktgetrennte Übersetzungsnamensräume

Lokalisierungsschlüssel verwenden ausschließlich kleingeschriebene, durch Punkte getrennte Wörter, auch im Modulnamensraum und bei Tutorialschlüsseln. Für die unveränderliche ID `terms-of-service` lautet ein Schlüssel `module.terms.of.service.admin.title`. Manifest-Metadaten, Kataloge und Verweise verwenden denselben Namensraum; Modul-IDs, UUIDs, Fähigkeitsnamen und Tutorial-Anbieter-/Abschlussbezeichner behalten ihre bestehenden Identitäten. Namensraumprüfungen dürfen nicht für ungültige Schlüssel gelockert werden. XML-Einrückung an benachbarte Einträge anpassen und Übersetzungswerte beim Formatieren erhalten.

Die Marktplatzdarstellung hält zwischengespeicherte Namen, Beschreibungen, Kategorien und Tags mit den zugehörigen Katalogübersetzungen zusammen, wenn das installierte Modul einen anderen Namensraum verwendet. Installierte Einstellungen behalten ihre eigene Übersetzungs-URL; eine neue Katalogsuche ersetzt die zwischengespeicherte Darstellung.

### Rechtstextlinks im Footer erhalten

Alle Browserclients verwenden die Footer-Registrierung von `ctx`, auch getrennt geladene statische Skripte und Bundles. Footer-Deskriptoren können `target: "_blank"` anfordern; die Darstellung ergänzt `noopener noreferrer`. Authentifizierungsanbieter liefern übersetzte Beschriftungen und Authentifizierungskontexte, während Rechtstextlinks angemeldeter Sitzungen ausdrücklich zum Anwendungskontext gehören. Verlauf und Browser-Cache-Wiederherstellung aktualisieren veröffentlichte Rechtstextlinks, ohne die Core-Links für Lizenz oder Änderungen zu ersetzen.

Die gemeinsamen Core-Funktionen `createI18n` und `extendI18n` lösen fehlende oder leere Werte der bevorzugten Sprache je Schlüssel aus englischen XML-Ressourcen für Core, Module und Komponenten auf. Nicht auflösbare Schlüssel lösen `missing_translation:<key>` aus. Module geben ihre Ressourcen-URLs an und verwenden den Host-Resolver, statt eine eigene Ersatzlogik zu implementieren.

Core ergänzt modulbezogene UI-Ressourcen-URLs bei der Registrierung um die installierte Modulrevision. Modulskripte und Sprachdateien werden neu validiert, statt die unveränderliche Cache-Laufzeit der Host-Version zu übernehmen. Der Service Worker lädt Modulressourcen direkt ohne zwischengespeicherte Ersatzantwort und erneuert seine Ressourcen-Caches. Ein Modulupdate ändert die Importadresse des Einstiegspunkts, damit veraltete Skripte keine entfernten Abhängigkeiten anfordern.

Eigenständige Authentifizierungsrückrufe verwenden `navigateToDocument(path, { signal })` aus `page-entry.js` für Wechsel zu Serverdokumenten. Die Funktion prüft HTTP(S)-URLs desselben Ursprungs ohne eingebettete Zugangsdaten, beachtet den bestehenden Navigationsschutz und verhindert Navigation nach Abbruch. Dashboard-Navigation und das Verhalten bei fehlenden Renderern bleiben beim unveränderten SPA-Router. `ui:log` überspringt anonyme Anfragen und fängt Zustellfehler ab; der Protokollierungsendpunkt erfordert weiterhin Authentifizierung.

Externe SSO-Rückrufe benötigen `mountWhenDirect` und `navigateToDocument` aus der Hostdatei `page-entry.js`. `npm run check:ui-host` prüft den Quellstand und `npm run check:ui-build` die gebauten Ressourcen. Nach der Bereitstellung `npm run check:ui-host -- --origin https://your-cognis-host.example` aus einem Netzwerk mit Zugriff auf den Host ausführen. Die Fernprüfung liest nur öffentliches JavaScript, sendet keine Zugangsdaten und analysiert Exporte, ohne heruntergeladenen Code auszuführen. Proxy-Umgebungen können Nodes Unterstützung mit `NODE_USE_ENV_PROXY=1` aktivieren.

Den passenden Core-Host einschließlich UI-Ressourcen und Ressourcenmanifest vor den Rückrufmodulen bereitstellen; einen Prozess, der noch die vorige Veröffentlichung verwendet, neu starten. Die Rückrufseite erst nach erfolgreicher Prüfung der öffentlichen Host-Exporte neu laden. Eine Modulversion belegt nicht den Stand der ausgelieferten Hostressource. Bei deaktivierter öffentlicher Registrierung benötigen unbekannte externe Identitäten weiterhin eine Registrierungsautorisierung; bereits zugeordnete Identitäten durchlaufen sie nicht erneut. HTTP 403 allein erklärt die Ablehnung nicht: Fehlercode und Registrierungsfortsetzungsfelder prüfen, ohne Zugangsdaten oder Cookies weiterzugeben.

### Komponentengrenzen und Laufzeit

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

### Offline-Navigation

Deklarieren Sie `public: true` und `offline: { assets: [...] }` für eine SPA-Route. Listen Sie alle öffentlichen Laufzeitabhängigkeiten einschließlich Sprachkatalogen und Datendateien auf. Seiten müssen ohne API-Aufrufe, private Kontodaten oder die Erkennung sämtlicher Host-Anbieter funktionieren. Private Routen dürfen dies nicht aktivieren. Verwenden Sie Routenlinks für die Navigation. Unbekannte oder noch nicht geladene Abhängigkeiten bleiben nicht verfügbar.

Der Service Worker speichert keine API-Antworten, Zugangsdaten oder authentifiziertes HTML. Die Modulinvalidierung entfernt den öffentlichen Routenkatalog und Modulressourcen; Ressourcen mit Revision müssen dem aktuellen Katalog entsprechen. Entfernte Änderungen sind ohne Verbindung nicht erkennbar: Nur die zuletzt bekannte öffentliche Revision ist verfügbar. Bei Wiederherstellung werden der Katalog aktualisiert und ungespeicherte Änderungen vor dem Neuladen geprüft; danach gilt wieder die Serverautorisierung. Worker-Aktualisierungen warten auf das Schließen bestehender Tabs und bereiten die Wiederherstellungsressourcen vor der Aktivierung vor. Ein erster Besuch ohne installierten Worker funktioniert nicht offline.

Verwenden Sie Links oder Schaltflächen mit `data-navigation-path="/route"`; Cognis deaktiviert nicht unterstützte Ziele, ohne bereits vom Besitzer deaktivierte Elemente zu aktivieren.

### Offline lernen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

Privates Study benötigt dieselbe zuvor bestätigte, noch gültige Kontositzung im selben Tab. Nach Neuladen und beim Erstbesuch gilt weiterhin der ausschließlich öffentliche Offline-Vertrag. Konto- und Sitzungswechsel, geänderte Einstellungen, Modul-Lebenszyklusänderungen und die Freigabe eines Anbieters verwerfen private Schnappschüsse. Serverseitige Sperren können ohne Verbindung nicht erkannt werden. Die Wiederherstellung prüft ungespeicherte Änderungen und lädt die Serverautorisierung neu.

### Übertragung und Zustimmung

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/gateways/study/technical).

### Soziale Offline-Änderungen

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/social/messages/technical).

### Gemeinsame obere Hinweise

Der Host stellt `ctx.capabilities.get("ui:broadcast").publish(id, descriptor, { signal, priority })` vor dem Einhängen von Anbietern und Seiten bereit. Beschreibungen enthalten den Klartexttitel `title`, bereinigtes `bodyHtml`, vertrauenswürdiges `actionsHtml` und die Variante `info`, `success`, `warning` oder `danger`. Der Rückgabewert bietet `element` und `remove()`. Dieselbe ID ersetzt nur den eigenen Hinweis; ein älterer Aufräumaufruf entfernt keinen Ersatz. `signal` bindet die Lebensdauer. Niedrigere Prioritäten erscheinen zuerst. Titel werden maskiert; Anbieter müssen Rich Text bereinigen. Mit `prepare()` können die gemeinsamen Banner- und Schaltflächenstile online vor der ersten Meldung vorgeladen werden.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Leere Offline-Lernseiten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Öffentliche Assets vorbereiten

Der Host stellt `ctx.capabilities.get("offline:assets")` mit `prepare(paths, { signal })` und `register(paths, { signal })` bereit. Beide nutzen den gestuften Ablauf `offline:prepareAssets`. Die Registrierung startet die Vorbereitung im Hintergrund, wiederholt sie bei Verbindungs- oder Einstellungsänderungen und liefert eine Wiederholungsfunktion. Nur öffentliche, wurzelrelative Pfade unter `/static/` oder `/assets/` sind erlaubt; Anfragen senden keine Zugangsdaten und lehnen private/no-store-Antworten ab. Vier parallele Aufgaben lesen die Antwortinhalte. Gleichzeitige Anfragen werden je Besitzersignal zusammengeführt, Fehler bleiben wiederholbar und ein Abbruch beendet Arbeit und Listener. Private API-Daten werden nicht gespeichert und Offline-Zugriff wird nicht gewährt. `restoreRead`-Rückrufe im Offline-HTTP-Client laufen nur nach einem autorisierten Cache-Fehltreffer und verwenden denselben geschützten Snapshot-Leser. Zugriffsverweigerungen werden nie in leere oder vorgemerkte Ansichten umgewandelt.

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Gemeinsame Lernfavoriten

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

### Bootstrap und Kanäle

SMTP verwaltet die Registrierung von Aktionen, deren Darstellung und Warteschlangen. `notify:registerEmailPurpose` erhält eine lokale Kennung und eine Aktionsfunktion, die aus Variablen eine Nachricht erstellt. Gateways, Adapter und externe Module registrieren nur innerhalb ihres eigenen Bootstraps; Kennungen enthalten den Besitzer. Auth, Registration, TFA und Share besitzen ihre Nachrichteninhalte. SMTP führt keine Liste anwendungsspezifischer Zwecke oder Vorlagen.

```js
const registerPurpose = ctx.getCapability("notify:registerEmailPurpose");
const purpose = await registerPurpose("digest", (variables) => ({
    subject: variables.subject,
    body: variables.body,
}));
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, variables });
```

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/adapters/notify/smtp/technical).

### Bindung von Zugangsdaten

Die Installation löst Zugangsdaten anhand desselben Anbieter-, Endpunkt- und Namensraumstands auf, mit dem die Repository-URL geprüft wurde. Gleichzeitiges Umbinden einer Quelle bricht vor dem Checkout ab und verhindert, dass Zugangsdaten des neuen Endpunkts an den alten Host gesendet werden. Die Zuordnung zwischen GitHub-API- und Repository-Host gilt nur für GitHub-Quellen.

### Wiederherstellung von Katalogübersetzungen

Der authentifizierte Endpunkt für Katalogübersetzungen liefert die angeforderte Sprache aus dem Cache und verwendet bei fehlenden Daten Englisch aus dem Cache. `Content-Language` bezeichnet die tatsächlich gelieferte Sprache; unbekannte Module und Module ohne nutzbares Sprachpaket liefern weiterhin 404. Manuelles Aktualisieren durchsucht alle serverseitig konfigurierten Quellen, bevor die Katalogübersetzungen vorbereitet werden. Fehlerhafte Sprachpakete oder eine noch nicht geladene Quellenliste verhindern dadurch keinen Reparaturscan. Schlägt die Vorbereitung fehl, bleibt der zuletzt veröffentlichte Katalog erhalten und die Aktualisierungsschaltfläche wird für einen weiteren Versuch freigegeben.

Die öffentliche Fähigkeit ui:moduleTutorialTargets bietet neben card(id) auch settings(id), field(id,key), action(id,key) und preview(id), jeweils an das Signal des Aufrufers gebunden. Einstellungshandles liefern einen Popup-Selektor für die Tutorialautorisierung. bindSettings(id,{signal}) bindet Vorbereitung und Editor an einen Zweig; settingsSignal(id) wird vom besitzenden Editor verwendet. Adaptereinstiege verwenden adapterSettings(gateway,id) und revealAdapter(gateway,id). Nur der Besitzer löst Hostziele auf; schließende oder fremde Popups liefern keine Ziele.

Einstellungen werden über die geschützte Schließfunktion aus onOpen geschlossen; requestClose steht nur in onAction bereit. Tests bilden diese Unterscheidung ab. Generische und eigene Adaptereditoren veröffentlichen Gateway- und Adapterkennung über den übergebenen Popup-Wrapper, passend zum Selektor aus adapterSettings(). Verschachtelte Bestätigungen behalten ihre eigene Identität.

Der übergebene Adapter-Popup-Wrapper übernimmt das erfasste Tutorialsignal zu Beginn jedes Öffnungsvorgangs. Beim Abbruch fordert er geschütztes Schließen an, auch wenn noch kein späteres Tutorialziel angebunden ist und ein eigener Editor das Signal nicht selbst verarbeitet. Ein Abbruch während der Vorbereitung wird in onOpen erneut geprüft; beim Abschluss werden Listener entfernt.

Die Moduleinstellungen erfassen den Tutorial-Zweig vor dem vorübergehenden Aktivieren eines deaktivierten Moduls und verwenden dasselbe Signal bei der Konfigurationsvorbereitung. Ein Abbruch während der Aktivierung verhindert einen verspäteten Editor und stellt den deaktivierten Zustand wieder her. Wird das geschützte Schließen eines benutzerdefinierten Adaptereditors abgelehnt, werden spätere Seiten weiterhin normal initialisiert, ohne die Abbruchanfrage zu wiederholen.

### Übersetzungen im Quellenformular

Modulquellen verwenden den Katalog der Modulseite unter `/static/app/modules/languages/<locale>/strings.xml`, einschließlich des Tooltips für gemeinsame Zugangsdaten. Fehlende Werte der bevorzugten Sprache werden je Schlüssel durch Englisch ersetzt. Fehlt auch Englisch, erscheint `missing_translation`, statt das Problem zu verbergen. Die vorhandene Marktplatzführung verweist weiterhin auf Einstellungen; Bedienelemente und Ablauf bleiben unverändert.

Der Service Worker aktualisiert veränderliche Host-Übersetzungskataloge, bevor ein neuer Seitenresolver sie erhält, und bündelt gleichzeitige Lesezugriffe. Die bestehende Netzwerkfrist von vier Sekunden begrenzt blockierte Aktualisierungen. Bei Netzwerkfehlern oder nicht verfügbarem Gateway bleibt ein vollständiger Cache-Katalog nutzbar, falls vorhanden. HTTP-Antworten 401, 403 und 404 bleiben maßgeblich. Inhaltsadressierte Sprachdateien bleiben unveränderlich und werden zuerst aus dem Cache geladen. Ein Resolver mit älteren Daten wird nicht nachträglich überschrieben. Veröffentlichen Sie zusammenpassende UI-Dateien, Sprachdateien und das Asset-Manifest gemeinsam, lassen Sie den normalen Worker-Aktualisierungsablauf abschließen und öffnen Sie die Seite erneut.

Vergleichen Sie bei fehlenden Übersetzungen die geladene Seitendatei sowie die bevorzugten und englischen Katalogantworten mit demselben Release-Manifest. Erfassen Sie Status, Inhalts-Hash und die Herkunft aus dem Service-Worker-Cache, jedoch keine Zugangsdaten. Die Flashcards-Offlinemeldung `snapshot not prepared` bezeichnet einen abgefangenen Fehler bei der Vorbereitung im Hintergrund. Sie belegt weder einen Übersetzungsfehler noch doppelte Planung. Normale leere Decklisten erzeugen sie nicht. Hilfreich sind Vorbereitungsstufe, HTTP-Status, Auslöser, Dauer und Offline-/Abbruchstatus, ohne Kontowerte, Token oder Deckinhalte.

## Sicherheit

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

## Referenz

### Befehls- und Versionsumfang

Npm-Skripte laufen im Repository; `npm --prefix <module-checkout> test` wählt es ausdrücklich. Installierte Modulaktionen verwenden `cognisctl modules:<module-id>:<action>`. Dies sind getrennte Schnittstellen. Erforderliche Fähigkeiten steuern Verfügbarkeit; eine angezeigte getestete Anbieterversion ist Diagnoseinformation, keine erzwungene Versionsgrenze. Tatsächliche Abhängigkeiten deklarieren und installierte öffentliche Verträge testen; keine nicht implementierten Versionsprüfungen versprechen.

### Geführte Tutorials

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/ui/technical).
