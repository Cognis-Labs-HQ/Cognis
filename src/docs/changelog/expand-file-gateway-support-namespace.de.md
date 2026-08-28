# Namensräume & Kontingente

**Feature Branch:** copilot/expand-file-gateway-support-namespace

## Das Datei-Gateway organisiert jetzt alle Inhalte in Namensräumen mit durchgesetzten ACLs und Kontingenten

Jede Dateioperation ist jetzt auf einen Namensraum beschränkt — einen isolierten Inhaltsbereich, der einer bestimmten Komponente (`profile`, `chats`, `classes`) oder dem Kern (`default`, `user`) gehört. Namensräume deklarieren eine ACL-Obergrenze (`private-owner`, `private-group` oder `component-managed`), die begrenzt, was jedes darin gespeicherte Objekt offenlegen darf, und Berechtigungen pro Objekt (Besitzer, Mitarbeitergruppe oder öffentliches Lesen) können diese Obergrenze niemals überschreiten. Der komponentenübergreifende Zugriff auf einen Namensraum wird verweigert, es sei denn, der Namensraum lässt die aufrufende Komponente explizit zu (der Kern ist immer erlaubt).

## Speicherkontingente pro Namensraum und global

Ein neuer Datei-Kontingent-Adapter verfolgt von Administratoren konfigurierbare Standard-Speicherkontingente pro Namensraum sowie ein einzelnes globales Standardkontingent und erstellt bei der Kontoerstellung Schnappschüsse davon als Pro-Benutzer-Overrides, sodass das Kontingent eines Benutzers widerspiegelt, was bei der Registrierung galt. Administratoren können die Kontingente eines einzelnen Benutzers danach über die neue Aktion „Speicherkontingente“ auf der Benutzerseite anpassen. Schreibvorgänge, die eines der Kontingente überschreiten würden, werden mit einem Fehler `413 quota_exceeded` abgelehnt.

## Profilbilder und -banner in den neuen Namensraum „profile“ migriert

Die Avatar- und Banner-Uploads des social/profile-Adapters laufen jetzt über die namensraum-basierten Fähigkeiten `files:store`/`files:delete` des Datei-Gateways gegen einen breit lesbaren `profile`-Namensraum und ersetzen die alten generischen, nicht namensraum-basierten Datei-Bucket-Routen. Die Adapter `social/messages` und `study/classes` registrieren grundlegende Namensräume `chats` bzw. `classes`, bereit für zukünftige Anhang-Funktionen.

## Kontingent-Verwaltungsrouten kollidieren nicht mehr mit Dateiobjekt-Routen

Das Files-Gateway registriert seine Kontingent-Verwaltungshandler jetzt vor dem Namespace-Objekt-Catch-all. Dadurch erreichen Anfragen an `/api/v1/files/admin/...` zuverlässig die Admin-Kontingent-API, statt als Datei in einem `admin`-Namespace interpretiert zu werden.

## Neue Benutzer erhalten Namespace-Kontingent-Schnappschüsse bei Neuinstallationen

Die Kontobereitstellung legt nun Standard-Kontingentzeilen für jeden registrierten Namespace an, bevor die Kontingente eines Benutzers als Schnappschuss gespeichert werden. So bleibt die Namespace-Kontingentdurchsetzung erhalten, selbst bevor ein Administrator die Standardwerte-Anzeige öffnet.

## Eingeschränkte Freigabelinks erzwingen Empfänger

Die Auflösung von Freigabe-Tokens prüft jetzt die Token-Empfänger, bevor Gastzugriff ausgegeben oder eine Nutzlast zurückgegeben wird. Empfängerbeschränkte Tokens verlangen, dass der Anfragende der Token-Besitzer oder ein benannter Benutzerempfänger ist, sodass beliebige Linkinhaber die Empfängerliste nicht umgehen können.

## Versionsdokumente bleiben lokalisiert

Die Komponenten-Versionsdokumente enthalten die Regeltexte jetzt konsistent übersetzt in allen unterstützten Sprachen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/80305d183fd1fc1e89c960dfb5c6712c87f188f8
