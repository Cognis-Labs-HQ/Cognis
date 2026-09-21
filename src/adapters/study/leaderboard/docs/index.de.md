# Study-Bestenlisten

## Anbieterintegration

Der Adapter veröffentlicht `study:leaderboard` über `ctx`. Ein Sprachpaket oder anderer Study-Anbieter kann diese Capability beim Bootstrap anfordern und Definitionen für Klassenräume oder freiwillige Events registrieren. Definitionen bestimmen lexikografische oder gewichtete Rangfolge, Mindestevidenz, rollierende oder saisonale Zeitfenster, Gleichstandsregeln, Kohortenrichtlinien sowie optionale Auf- und Abstiege.

Anbieter übergeben abgeschlossene Sammlungen an die öffentliche Capability `engagement:recordActivity`. Um die erhaltenen XP einer Bestenliste zuzuordnen, wird `scoreActivity` von `study:leaderboard` mit autorisiertem Akteur, Definitions-ID, Kriterien-ID und derselben evidenzgestützten Aktivität aufgerufen. Vor der Beobachtung prüft die Bestenliste jedes Ereignis gegen `study:progress`.

## Datenschutz und Klassenräume

Ranglisten zeigen einen Alias, sofern die Profil-Sichtbarkeitsprüfung die Identität für den Betrachter nicht freigibt. Sperren und private Konten bleiben in Klassenräumen wirksam. Kohortenzuweisung und Teilnahme gelten je Definition, sodass Klassenraum-, persönliche und Event-Wettbewerbe ohne Vermischung der Zielgruppen parallel bestehen.

## Lebenszyklus

`rollover` archiviert die abgeschlossene Saison und öffnet die nächste. Korrekturen entwerten frühere Evidenz vor dem Ersatz. Für eine barrierefreie lokalisierte Tabelle dient `requestTableModel`; `queryStandings` liefert das neutrale Ranglistenmodell.
