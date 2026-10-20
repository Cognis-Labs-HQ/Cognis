# Study-Bestenlisten

Nicht authentifizierte Anfragen für Definitionen und Ranglisten rufen die injizierte Authentifizierungsprüfung auf und enden vor dem Datenzugriff mit HTTP 401. Routenparameter verwenden die bestehenden typisierten HTTP- und Berechtigungsverträge.

Zustände werden an Unicode-Grenzen in Zeilen mit höchstens 60.000 UTF-8-Bytes aufgeteilt und transaktional ersetzt. Bereits einzeilig gespeicherte Zustände verwenden denselben Lesepfad. Die Metadatenmethoden registerDefinition, assignCohort und setParticipation liefern jetzt Promise<void> und müssen abgewartet werden. Sie durchlaufen benannte ctx-Abläufe, geben Speicherfehler weiter und setzen fehlgeschlagene Metadatenänderungen zurück. Auch der Saisonwechsel liefert ein abzuwartendes Promise. Gleichzeitige Registrierungen einer Klassenrangliste teilen einen laufenden Registrierungsvorgang.

Der Ranglistenadapter ordnet bestätigte Lernnachweise innerhalb berechtigter Gruppen und stellt barrierefreie Ranglisten bereit.

## Verwendung

```ts
const leaderboard = ctx.capabilities.require("study:leaderboard");
const table = await leaderboard.requestTableModel(query, "de");
```

## Technische Spezifikation

### Anbieterintegration

Der Adapter veröffentlicht `study:leaderboard` über `ctx`. Ein Sprachpaket oder anderer Study-Anbieter kann diese Capability beim Bootstrap anfordern und Definitionen für Klassenräume oder freiwillige Events registrieren. Definitionen bestimmen lexikografische oder gewichtete Rangfolge, Mindestevidenz, rollierende oder saisonale Zeitfenster, Gleichstandsregeln, Kohortenrichtlinien sowie optionale Auf- und Abstiege.

Anbieter übergeben abgeschlossene Sammlungen an die öffentliche Capability `engagement:recordActivity`. Um die erhaltenen XP einer Bestenliste zuzuordnen, wird `scoreActivity` von `study:leaderboard` mit autorisiertem Akteur, Definitions-ID, Kriterien-ID und derselben evidenzgestützten Aktivität aufgerufen. Vor der Beobachtung prüft die Bestenliste jedes Ereignis gegen `study:progress`.

### Datenschutz und Klassenräume

Ranglisten zeigen einen Alias, sofern die Profil-Sichtbarkeitsprüfung die Identität für den Betrachter nicht freigibt. Sperren und private Konten bleiben in Klassenräumen wirksam. Kohortenzuweisung und Teilnahme gelten je Definition, sodass Klassenraum-, persönliche und Event-Wettbewerbe ohne Vermischung der Zielgruppen parallel bestehen.

### Lebenszyklus

`rollover` archiviert die abgeschlossene Saison und öffnet die nächste. Korrekturen entwerten frühere Evidenz vor dem Ersatz. Für eine barrierefreie lokalisierte Tabelle dient `requestTableModel`; `queryStandings` liefert das neutrale Ranglistenmodell.

Der Start erfordert das DB-Gateway. Fehlgeschlagene Speicherungen werden protokolliert und blockieren spätere Speicherungen nicht. Wiederholte identische Beobachtungen speichern den Zustand ohne Duplikat. Klassenberechtigungen werden bei jedem Aufruf geprüft, auch nach einem Widerruf.

## Dauerhafte Übungsbelohnungen

Gespeicherte Übungs-XP erreichen die Rangliste über `study:leaderboard:recordPractice`; dabei wird das festgeschriebene Ergebnis verwendet, ohne Modifikatoren erneut zu verbrauchen. Kanonische Klassenübungen erzeugen eine Klassenrangliste mit der bestehenden Mindestgruppengröße zum Datenschutz. Ausdrückliche XP-Kriterien zugänglicher Veranstaltungen mit Teilnahmezustimmung können ebenfalls Ergebnisse erhalten. Die Beobachtungsidentität umfasst Rangliste und Kriterium. Korrekturen entwerten passende Beobachtungen; vor der Darstellung wird die aktuelle Klassenmitgliedschaft geprüft.
