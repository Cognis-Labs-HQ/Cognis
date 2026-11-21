# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von Kernsystem.

## Schnittstellen

### Erweiterungspunkte

- Cross-Component-Capabilities über `ctx.contributeCapability(key, value)` beitragen.
- Eigene Capabilities beim Rückbau mit `ctx.removeCapability(key)` entfernen; ein bereichsgebundener Modul-Bootstrap erledigt dies automatisch.
- Neue Orchestrierungs-Pipelines über `ctx.registerFlow({ id, stages })` registrieren.
- Flow-Verhalten über `ctx.addFlowStageHook(flowId, stageId, hook, handler)` injizieren.
- Verhalten beim Deaktivieren einer Komponente über `ctx.removeFlowStageHook(...)` und `ctx.unregisterFlow(...)` entfernen.

### API-Routen

Diese Komponente registriert selbst keine HTTP-Routen.

### ctx.flow-API

`ctx.flow` ist eine schmale Schnittstelle für das Guard-and-Inject-Muster.
Komponenten prüfen, ob ein Flow existiert, bevor sie Hooks injizieren.

### Schnittstelle

- **`exists(flowId)`** — gibt `true` zurück, wenn der Flow registriert ist.
- **`extend(flowId, stageId, hook, handler)`** — registriert einen Stage-Hook. Gibt `true` bei Erfolg zurück, `false` bei doppelter Hook-ID (idempotent, kein Fehler).
- **`run(flowId, input?)`** — führt den Flow aus.

### Capability-Deklarationen für Module

Module deklarieren verwendete Dienste im obersten Manifestfeld `requiresCapabilities`. Server-Capabilities verwenden ihre registrierten IDs, beispielsweise `auth:requireAuth`; Browser-Capabilities verwenden den Namensraum `ui:`, beispielsweise `ui:profileAvatarRenderer`. Cognis ordnet deklarierte UI-Anforderungen den SPA-Routen des Moduls zu und importiert vor dem Einhängen ausschließlich passende registrierte Anbieter-Skripte. Bei der Aktivierung werden Server-Capabilities über den Serverkontext und `ui:`-Capabilities über aktive Anbieter der UI-Registry aufgelöst; das SPA-Routing prüft Browseranbieter vor dem Einhängen erneut.

Anbieter müssen die Capability-ID in ihrer Komponentendokumentation veröffentlichen und Browser-Anbieter über `providesCapabilities` registrieren. Betreiber können die aktive Registrierung als Owner mit `GET /api/v1/system/capabilities` oder mit `cognisctl system:capabilities` prüfen. Ein Modul, dessen Navigationsskript eine Browser-Capability bereitstellt, deklariert die IDs in `registerNavbarPlugin({ providesCapabilities: [...] })`; der Host importiert dieses Skript dann, bevor Seiten eingebunden werden, die diese Capability verwenden.

## Konfiguration

### Konfiguration

Diese Komponente hat keine Laufzeit-Umgebungsvariablen.

## Verhalten

### Core Ctx- und Flow-Bus

Der Ablauf `startSsoLogin` startet eine umleitungsbasierte Authentifizierung, ohne Anmeldedatenfelder zu übermitteln. Anbieter-Hooks prüfen den ausgewählten Anbieter in `validateProvider`, erstellen anschließend den Status und geben in `initiateAuthorization` `{ providerId, redirectUrl }` zurück. Cognis akzeptiert nur relative oder HTTPS-Umleitungs-URLs.

Der verpflichtende Ablauf `gateAccountCreation` wird ausgeführt, bevor eine externe Identität ein Cognis-Konto erstellen kann. Die öffentliche Registrierung autorisiert die Erstellung direkt; andernfalls verlangt das Registrierungs-Gateway ein einmalig verwendbares Registrierungstoken, dessen E-Mail-Adresse mit der Anbieteridentität übereinstimmt. Eine fehlende Anbieter-E-Mail ergibt `emailRequired: true`, damit die SSO-Oberfläche danach fragen kann. Bei Abbruch oder fehlender Autorisierung wird kein Konto erstellt und die Anmeldung abgebrochen.

### Übersicht

`src/core/ctx/` definiert den plattformweiten `ctx`-Capability-Bus als eigene Core-Oberfläche. Er ist bewusst unaufdringlich: Komponenten tragen Capabilities bei, registrieren Flows und injizieren gestufte Flow-Hooks, ohne interne Implementierungen anderer Komponenten zu importieren.

Dieselbe ctx-Instanz ist für Core, Gateways, Adapter, Module und Route-Bootstrap gedacht. Dadurch wird Feature-Komposition explizit und umkehrbar: Wenn eine Komponente deaktiviert wird, können ihre Flow-Hooks und Capabilities entfernt werden, ohne unabhängigen Code zu ändern.

Das Flow-Modell behandelt Arbeit als benannte Lebenszyklen mit deterministischen Stufen. Ein Flow kann Backend-Operationen (Benutzer anlegen, Passwort ändern), Messaging-Aktionen (Nachricht senden, Meeting erstellen) oder UI-Konstruktion (Einstellungsseite, Login-Seite) darstellen.

### Verantwortlichkeiten

- Eine einheitliche Oberfläche zum Beitragen und Abrufen von Capabilities bereitstellen.
- Benannte Flows mit geordneter Stage-Definition registrieren.
- Komponenten erlauben, Stage-Hooks zu injizieren und zu entfernen.
- Flows stufenweise mit stabiler Reihenfolge ausführen.
- Stage-Ausgaben für Beobachtbarkeit und Tests zurückgeben.

Nicht verantwortlich für: Persistenz, HTTP-Route-Verkabelung, Adapter-Discovery oder Richtlinien zur Aktivierung/Deaktivierung von Komponenten.

### Wichtige Quellpfade

| Pfad                                  | Zweck                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `src/core/ctx/create-ctx.ts`          | Baut eine ctx-Instanz aus komposierbaren Funktionsmodulen                     |
| `src/core/ctx/types.ts`               | Öffentliche Verträge für Capabilities, Flows, Hooks und Ausführungsergebnisse |
| `src/core/ctx/register-flow.ts`       | Flow-Registrierung und Stage-Validierung                                      |
| `src/core/ctx/add-flow-stage-hook.ts` | Stage-Hook-Beitrag für Komponenten-Injektion                                  |
| `src/core/ctx/run-flow.ts`            | Laufzeit für geordnete Stage-Ausführung                                       |

Ein Flow wird einmal mit expliziten Stage-IDs registriert. Stage-Hooks werden danach mit einem `order`-Wert hinzugefügt. Während der Ausführung laufen Hooks aufsteigend nach `order`, danach nach Hook-ID für deterministisches Verhalten.

Flows können andere Flows über `context.ctx.runFlow(...)` aufrufen und so Verhalten verschachteln. Beispiel: Ein Login-Seiten-Flow ruft Login-Flow-Logik auf; Login-Flow-Hooks rufen den LDAP-Flow auf, wenn Adapter-Bedingungen erfüllt sind.

### Beispiel: Guard-and-Inject

```ts
if (ctx.flow.exists("construct-settings-ui")) {
    ctx.flow.extend(
        "construct-settings-ui",
        "resolve-sections",
        { id: "notify-gateway:resolve-sections" },
        () => ({ gatewayId: "notify", sectionId: "notifications" }),
    );
}
```

### Eigentümerstufen je Aufruf

Core 0.3.109 ergänzt optionale aufrufbezogene `handlers` in `FlowRunOptions`. Jede Eigentümerfunktion läuft vor Erweiterungshooks ihrer registrierten Stufe, trägt ihr Ergebnis zu `stageResults` bei und verwendet nur die `data` dieses Aufrufs. Unbekannte Stufen werden vor Ausführung abgewiesen. Ein Fehler stoppt nachfolgende Stufen. Komponenten halten die Speicherung in ihrer eigenen Transaktion, damit Hook-Fehler Änderungen zurückrollen. Aufrufbezogene Funktionen werden nicht als globale Hooks gespeichert.

### Eigene Server- und Browserressourcen

Der externe Bootstrap-Kontext unterstützt `registerDisposer(dispose)`. Bereinigung erfolgt nach Deaktivierung, Aktualisierung oder Bootstrap-Fehler in umgekehrter Registrierungsreihenfolge; Fehler werden protokolliert und weitere Bereinigung läuft weiter. Browseranbieter exportieren `mountProvider(scopedUiCtx)`, registrieren eigene Fähigkeiten und Flows im Scope, binden Listener an dessen Signal und liefern weitere Bereinigung. Der Loader gleicht beide Kataloge ab und aktiviert gecachte Skripte erneut; `ui:navbarLinks` besitzt das Navigations-DOM.

### Engagement-Wertung

Die Engagement-Engine im Kern berechnet nachweisgestützte Erfahrungspunkte und vergibt registrierte Auszeichnungen über gestufte ctx-Abläufe.

### Verwendung

```ts
const record = ctx.requireCapability("engagement:recordActivity");
await record(activity);
```

### Ablauf für Anbieter

Sprach- und Aktivitätsanbieter erweitern Engagement ausschließlich über öffentliche `ctx`-Capabilities. Beim Bootstrap dient `engagement:scoring` zur Registrierung von Standardgewichten für Aktivitätstypen, geplanten bereichsgebundenen Modifikatoren und einlösbaren Boostern. Über `engagement:achievements` werden normale, seltene oder legendäre Abzeichen definiert. Eine abgeschlossene Sammlung wird an `engagement:recordActivity` übergeben; einzelne Elemente beim selbstbestimmten Lernen vergeben keine XP.

Eine Aktivität liefert eindeutige Evidenzereignis-IDs, Anbieter- und Teilnehmer-ID, Inhaltsschwierigkeit, Abschlusszeit, optionales Anbietergewicht und Bereiche wie `language` und `activity`. Ein explizites Anbietergewicht ersetzt den Standard des Aktivitätstyps. Schwierigkeit, Gewichte, Modifikatoren, Hinweise, Genauigkeit, selbstständige Antworten, Erstabschluss, Wiederholung und Zeitziele des Anbieters fließen in die Wertung ein. Wiederholungen verwenden eine einmalige feste Reduzierung statt fortlaufender Abwertung.

### Orchestrierung

`engagement:recordActivity` führt `engagement:scoreActivity` mit den Stufen `validate`, `score`, `achievements` und `publish` aus. Die Achievement-Stufe bindet `engagement:evaluateAchievements` mit `collect`, `evaluate` und `award` ein. Anbieter können diese Flows ohne Import von Core-Interna erweitern.

### Dauerhafte Übungsbelohnungen

`engagement:recordActivity` validiert, berechnet Punkte, wertet Erfolge aus, speichert einen Beleg und veröffentlicht anschließend das Ergebnis. Der Host injiziert `engagement:store`; die produktive Speicherung gehört zum Datenbank-Gateway. Teilnehmerrevisionen weisen konkurrierende Schreibvorgänge zurück. Wiederholte Übermittlung derselben Aktivität behält XP und Auszeichnungen bei; veränderte Eingaben oder erneut verwendete Nachweise werden abgelehnt. Berechnung und Erfolgsauswertung arbeiten bis zur erfolgreichen Speicherung mit isoliertem Zustand. `engagement:ledger` bietet verbindliche Zusammenfassungen, dauerhafte Booster-Einlösung und Aktivitätsentwertung. Eingelöste Booster und verbrauchte Nachweise bleiben nach Neustarts erhalten. `repeatKey` gruppiert wiederholte Übungen, ohne ursprüngliche Belege zu verändern. Korrekturen entfernen entwertete XP und Auszeichnungen aus den Projektionen, erhalten aber den Verlauf. Direkte Berechnungsmethoden bleiben Regelwerkzeuge; dauerhafte Verbraucher nutzen Ledger und Aufzeichnung.

Ledger-Zusammenfassungen, Booster-Einlösung und Aktivitätsentwertung durchlaufen eigene ctx-Abläufe mit Validierungs- und Ausführungsstufen. Ungültige Teilnehmerkennungen werden vor dem Lesen oder Ändern gespeicherter Daten abgelehnt.

## Sicherheit

### Sicherheit und Evidenz

Gewichte und Multiplikatoren liegen zwischen `0.01` und `10`, Schwierigkeiten zwischen `0.1` und `10`. Ereignis-IDs müssen eindeutig, Dauer und Hinweisanzahl nicht negativ und Zeitziele geordnet sein. Verbrauchbare Booster gelten nur für einen Teilnehmer und werden nach der ersten passenden Wertung entfernt. Achievement-Auszeichnungen fixieren Beschriftung, Schwierigkeit, Symbol, Zeitpunkt und Evidenz-IDs, damit spätere Definitionsänderungen verdiente Abzeichen nicht umschreiben.

## Referenz

Quellcode und Paketmetadaten: `src/core/`.
