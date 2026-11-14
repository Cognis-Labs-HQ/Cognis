# Token-Lebenszyklus absichern

## Anwendungsbeispiele

Ändern Sie die verpflichtende Einrichtung über den authentifizierten Endpunkt für Systemsicherheit oder TFA-Erzwingung. Eine fehlgeschlagene Richtlinienanwendung meldet einen Fehler statt einer erfolgreichen Speicherung.

## Technische Spezifikation

Alle Zugänge zur TFA-Erzwingung verwenden den zuständigen Richtlinienablauf. Das Abschalten widerruft sämtliche Token mit ausstehender Einrichtung, einschließlich älterer Token des handelnden Administrators; normale Sitzungen bleiben erhalten. Die Bereinigung erfolgt vor dem Schreiben der Richtlinie und kann wiederholt werden. Fehlende Anbieter oder Schreibfehler melden einen Fehler; Tokendatei und Datenbank bilden keine gemeinsame Transaktion. Nach einem Richtlinienfehler können die strengere Richtlinie und bereits widerrufene Token bestehen bleiben. Lokaler atomarer Dateiersatz garantiert weder Schutz vor Hardwareausfällen noch Synchronisierung mehrerer Serverprozesse.

Unabhängige Einstellungsänderungen wenden keine TFA-Richtlinie an. Wenn die TFA-Lesecapability vorhanden ist, verwenden Systemabfragen und Schreibvorgänge ohne TFA-Feld deren aktuelle Richtlinie. Lesefehler werden gemeldet, statt die Erzwingung als deaktiviert anzuzeigen. Ohne diese optionale Capability ist die gespeicherte Einstellung lediglich eine möglicherweise veraltete Kopie. Explizite Richtlinienänderungen erfordern weiterhin die zuständige Capability.

## Autorisierung des Kontoziels

Kontenübergreifende Verwaltung sowie alle TFA-Lesezugriffe mit Zielauswahl, Wiederherstellungscode-Aktionen, Methodenpräferenzen, Aktivierungen/Deaktivierungen und Administrator-Zurücksetzungen erfordern Auths Richtlinie `auth:authorizeAccountTarget` v1. Administratoren dürfen keine anderen Administratoren, Eigentümer oder Gründeradministratoren verwalten. Vom Eigentümer erlaubte Aktionen bleiben verfügbar. Fehlende Richtlinien oder unlesbare Kontometadaten führen vor nachgelagerten Speicherzugriffen zur Ablehnung. Die Benutzerverwaltung verbietet weiterhin Selbstverwaltung; TFA akzeptiert ein weggelassenes oder exakt angegebenes eigenes Ziel. Einrichtung und Methodendetails bleiben auf das eigene Konto beschränkt. Leere, doppelte oder fehlerhafte Zielparameter werden abgelehnt. Verwenden Sie Einstellungen für Ihre eigene Sicherheit und die Benutzerverwaltung für ein zulässiges anderes Konto.
