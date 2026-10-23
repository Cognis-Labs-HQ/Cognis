# Engagement-Wertung

Die Engagement-Engine im Kern berechnet nachweisgestützte Erfahrungspunkte und vergibt registrierte Auszeichnungen über gestufte ctx-Abläufe.

## Verwendung

```ts
const record = ctx.requireCapability("engagement:recordActivity");
await record(activity);
```

## Technische Spezifikation

### Ablauf für Anbieter

Sprach- und Aktivitätsanbieter erweitern Engagement ausschließlich über öffentliche `ctx`-Capabilities. Beim Bootstrap dient `engagement:scoring` zur Registrierung von Standardgewichten für Aktivitätstypen, geplanten bereichsgebundenen Modifikatoren und einlösbaren Boostern. Über `engagement:achievements` werden normale, seltene oder legendäre Abzeichen definiert. Eine abgeschlossene Sammlung wird an `engagement:recordActivity` übergeben; einzelne Elemente beim selbstbestimmten Lernen vergeben keine XP.

Eine Aktivität liefert eindeutige Evidenzereignis-IDs, Anbieter- und Teilnehmer-ID, Inhaltsschwierigkeit, Abschlusszeit, optionales Anbietergewicht und Bereiche wie `language` und `activity`. Ein explizites Anbietergewicht ersetzt den Standard des Aktivitätstyps. Schwierigkeit, Gewichte, Modifikatoren, Hinweise, Genauigkeit, selbstständige Antworten, Erstabschluss, Wiederholung und Zeitziele des Anbieters fließen in die Wertung ein. Wiederholungen verwenden eine einmalige feste Reduzierung statt fortlaufender Abwertung.

### Orchestrierung

`engagement:recordActivity` führt `engagement:scoreActivity` mit den Stufen `validate`, `score`, `achievements` und `publish` aus. Die Achievement-Stufe bindet `engagement:evaluateAchievements` mit `collect`, `evaluate` und `award` ein. Anbieter können diese Flows ohne Import von Core-Interna erweitern.

### Sicherheit und Evidenz

Gewichte und Multiplikatoren liegen zwischen `0.01` und `10`, Schwierigkeiten zwischen `0.1` und `10`. Ereignis-IDs müssen eindeutig, Dauer und Hinweisanzahl nicht negativ und Zeitziele geordnet sein. Verbrauchbare Booster gelten nur für einen Teilnehmer und werden nach der ersten passenden Wertung entfernt. Achievement-Auszeichnungen fixieren Beschriftung, Schwierigkeit, Symbol, Zeitpunkt und Evidenz-IDs, damit spätere Definitionsänderungen verdiente Abzeichen nicht umschreiben.

## Dauerhafte Übungsbelohnungen

`engagement:recordActivity` validiert, berechnet Punkte, wertet Erfolge aus, speichert einen Beleg und veröffentlicht anschließend das Ergebnis. Der Host injiziert `engagement:store`; die produktive Speicherung gehört zum Datenbank-Gateway. Teilnehmerrevisionen weisen konkurrierende Schreibvorgänge zurück. Wiederholte Übermittlung derselben Aktivität behält XP und Auszeichnungen bei; veränderte Eingaben oder erneut verwendete Nachweise werden abgelehnt. Berechnung und Erfolgsauswertung arbeiten bis zur erfolgreichen Speicherung mit isoliertem Zustand. `engagement:ledger` bietet verbindliche Zusammenfassungen, dauerhafte Booster-Einlösung und Aktivitätsentwertung. Eingelöste Booster und verbrauchte Nachweise bleiben nach Neustarts erhalten. `repeatKey` gruppiert wiederholte Übungen, ohne ursprüngliche Belege zu verändern. Korrekturen entfernen entwertete XP und Auszeichnungen aus den Projektionen, erhalten aber den Verlauf. Direkte Berechnungsmethoden bleiben Regelwerkzeuge; dauerhafte Verbraucher nutzen Ledger und Aufzeichnung.

Ledger-Zusammenfassungen, Booster-Einlösung und Aktivitätsentwertung durchlaufen eigene ctx-Abläufe mit Validierungs- und Ausführungsstufen. Ungültige Teilnehmerkennungen werden vor dem Lesen oder Ändern gespeicherter Daten abgelehnt.
