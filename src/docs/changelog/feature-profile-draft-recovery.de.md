# Profilentwürfe behalten

**Feature-Zweig:** feature-profile-draft-recovery

## Fehlgeschlagene Entwürfe behalten

Profil bearbeiten bleibt mit den exakt eingegebenen Feldern geöffnet, bis der Server die Speicherung bestätigt oder der kontogebundene Offline-Puffer sie dauerhaft angenommen hat. Eine abgelehnte Anfrage, unlesbare Antwort oder fehlgeschlagene Puffer-Schreiboperation zeigt einen Fehler und aktiviert Speichern erneut, ohne den Entwurf zu verwerfen. Wiederholtes Speichern und die Eingabetaste senden nur eine laufende Anfrage; die Felder sind währenddessen deaktiviert. Optionale Fehler beim Aktualisieren von Karten, Navigationsleiste oder lokalem Anzeigenamen machen eine angenommene Speicherung nicht rückgängig.

## Editor-Lebensdauer beachten

Verwerfen, Schließen, Escape und der Hintergrund verwenden die gemeinsame Bestätigung für ungespeicherte Änderungen. Abbrechen in der Bestätigung behält das Formular. Bestätigtes Verwerfen schließt es und ignoriert spätere Rückmeldungen. Schließen kann eine bereits gesendete Anfrage nicht rückgängig machen; ein Hinweis weist darauf hin. Ein Speicherergebnis wartet vor der Seitenaktualisierung auf eine offene Verwerfungsentscheidung. Navigation, erneutes Einbinden, Konto- oder Sitzungswechsel und das Schließen des Dialogs entziehen alten Rückmeldungen ihre Wirkung. Beim erneuten Öffnen wird das zuletzt angenommene Profil verwendet. Feld- und Beschriftungskennungen bleiben auch während der Schließanimation eindeutig. Nicht gesendete Entwürfe bleiben bei Navigation oder Neuladen nicht erhalten.

Der profileigene Editor nutzt den vorhandenen ctx-Ablauf `social:profile:request` und bewahrt die Feldvalidierung, die gemeinsame Fokusverwaltung und die Offline-Zustellrichtlinie. Synthetische DOM-Tests führen die echte Seiteneinbindung, den Dialog, den Formulargenerator und registrierte Anfrageabläufe mit kontrolliertem Transport und Speicher aus. Sie belegen weder das Layout im echten Browser noch das Server- oder Datenbankverhalten.

Die Prüfung der UI-Veröffentlichung verfolgt den tatsächlich angehängten Formular-Builder für Beiträge über Rückgaben komponenteneigener Fabrikfunktionen. Statische positive und negative Testfälle weisen fehlende, ungenutzte, verdeckte oder neu zugewiesene Fabrikfunktionen, abweichende Rückgabewerte und nicht zugeordnete Absende-Handler zurück. Prüfungen für direkt erzeugte Formulare und der Prüfumfang bleiben unverändert.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/cd77a0c279289628b6cd24bc358e43c8aa0e190f
