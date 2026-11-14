# Formularspeicher-Korrekturen

**Feature-Zweig:** copilot/reassess-form-memory-logic

## Rollen-Dropdowns von der Formular-Entwurfsspeicherung ausgenommen

Die Rollen-Auswahlfelder auf der Benutzerseite werden nun von der Formular-Entwurfsspeicherung des Seitenkomponisten ausgenommen. Zuvor konnte ein erneutes Rendern der Benutzertabelle veraltete Rollenwerte aus dem Entwurfsspeicher in die Dropdowns zurückschreiben und so den aktuellen serverseitigen Zustand verschleiern.

## Raumspezifische Nachrichtenentwürfe

Der Nachrichtenkomponist speichert nun einen Entwurf pro Raum, verschlüsselt nach Konto und Raum-ID. Wenn Text in einem Raum eingegeben wird, in einen anderen Raum gewechselt und zurückgekehrt wird, wird der vorherige Entwurf wiederhergestellt. Das Senden einer Nachricht löscht den Entwurf für diesen Raum. Damit wird das bisherige Verhalten ersetzt, bei dem Text im Komponisten raumübergreifend erhalten blieb, unabhängig davon, für welchen Raum er gedacht war.

## Formular-Entwurfsspeicherung ist jetzt opt-in

Die persistente Formular-Entwurfsspeicherung des Seitenkomponisten wurde von einem Opt-out- auf ein Opt-in-Modell umgestellt. Nur Formularfelder, deren nächster Vorfahre `data-composer-include-form-memory="true"` trägt, werden in localStorage geschrieben. Felder ohne opt-in-Vorfahren werden weiterhin im flüchtigen In-Memory-Snapshot erfasst, sodass sie responsive Neu-Renderings innerhalb derselben Browsersitzung überdauern, aber niemals in den persistenten Speicher geschrieben werden. Dies verhindert, dass serverseitig gesteuerte Steuerelemente (Rollen-Dropdowns, Schalter, Präferenz-Auswahlfelder) jemals clientseitig zwischengespeichert werden.

## Composer-Textfeld wird geleert, wenn zu einem Raum ohne gespeicherten Entwurf gewechselt wird

Bisher blieb beim Wechsel von einem Raum mit ungesendetem Text zu einem Raum ohne gespeicherten Entwurf der Text des vorherigen Raums im Composer erhalten. Das danach ausgelöste synthetische Eingabeereignis speicherte diesen veralteten Text dann unter dem Entwurfsschlüssel des neu geöffneten Raums, was das versehentliche Senden der falschen Nachricht riskierte. Das Composer-Textfeld wird nun explizit geleert, bevor das Eingabeereignis ausgelöst wird, wenn der geöffnete Raum keinen gespeicherten Entwurf hat.

## Änderungen

- [f6e4f64](https://github.com/Cognis-Labs-HQ/Cognis/commit/f6e4f64c9468e5367096836d041488b2f2f6ae34)
