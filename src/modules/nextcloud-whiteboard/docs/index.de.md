# Nextcloud Whiteboard

## Überblick

Das Nextcloud-Whiteboard-Modul integriert die kollaborative Whiteboard-Anwendung von Nextcloud in Cognis-Kursräume. Wenn das Modul aktiviert und mit einer Nextcloud-Instanz konfiguriert ist, können Lehrkräfte ein Whiteboard-Board im Kursraum öffnen, und Lernende treten demselben Board in Echtzeit bei. Die Integration verwendet signierte JWT-Token, sodass Cognis-Benutzer kein eigenes Nextcloud-Konto benötigen.

Das Modul steuert die Fähigkeiten `whiteboard:getEmbedUrl` und `whiteboard:fetchBoardData` bei, damit der Kursraum-Adapter Whiteboards öffnen kann, ohne direkt auf Modul-Interna zuzugreifen.

## Zuständigkeiten

- Kurzlebige JWT-Token für das Einbetten von Nextcloud-Whiteboard-Boards in einen iframe erstellen.
- API-Routen für das Erstellen, Abrufen und Konfigurieren von Whiteboard-Boards bereitstellen.
- Das Admin-Konfigurationspopup bereitstellen, über das Betreiber die Nextcloud-Instanz-URL, den App-Secret und Board-Standardwerte eingeben können.
- Die Fähigkeiten `whiteboard:getEmbedUrl` und `whiteboard:fetchBoardData` über `ctx` registrieren.

Nicht zuständig für: Speichern von Board-Inhalten (das obliegt Nextcloud), Verwaltung von Nextcloud-Benutzern oder -Berechtigungen oder Kursraum-Mitgliedschaftsprüfungen.

## Architektur

`src/modules/nextcloud-whiteboard/bootstrap.js` ist der Modul-Einstiegspunkt. JWT-Erstellung für Einbettungs-URLs findet ausschließlich dort statt und wird nie als freigegebener Helfer exponiert.

## Konfiguration

| Variable                      | Standardwert | Beschreibung                                                               |
| ----------------------------- | ------------ | -------------------------------------------------------------------------- |
| `NEXTCLOUD_URL`               | _(keine)_    | Basis-URL der Nextcloud-Instanz. Erforderlich für Whiteboard-Einbettungen. |
| `NEXTCLOUD_WHITEBOARD_SECRET` | _(keine)_    | Geteilter App-Secret zum Signieren von JWT-Token für Nextcloud Whiteboard. |

## API-Routen

| Methode | Pfad                                              | Beschreibung                                | Authentifizierung |
| ------- | ------------------------------------------------- | ------------------------------------------- | ----------------- |
| `GET`   | `/api/v1/modules/nextcloud-whiteboard/config`     | Aktuelle Admin-Konfiguration abrufen        | Admin             |
| `PUT`   | `/api/v1/modules/nextcloud-whiteboard/config`     | Admin-Konfiguration aktualisieren           | Admin             |
| `POST`  | `/api/v1/modules/nextcloud-whiteboard/boards`     | Neues Whiteboard-Board erstellen            | Erforderlich      |
| `GET`   | `/api/v1/modules/nextcloud-whiteboard/boards/:id` | Board-Metadaten und Einbettungs-URL abrufen | Erforderlich      |
