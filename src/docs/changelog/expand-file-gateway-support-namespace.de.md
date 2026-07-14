# Namensräume & Kontingente

## Das Datei-Gateway organisiert jetzt alle Inhalte in Namensräumen mit durchgesetzten ACLs und Kontingenten

Jede Dateioperation ist jetzt auf einen Namensraum beschränkt — einen isolierten Inhaltsbereich, der einer bestimmten Komponente (`profile`, `chats`, `classes`) oder dem Kern (`default`, `user`) gehört. Namensräume deklarieren eine ACL-Obergrenze (`private-owner`, `private-group` oder `component-managed`), die begrenzt, was jedes darin gespeicherte Objekt offenlegen darf, und Berechtigungen pro Objekt (Besitzer, Mitarbeitergruppe oder öffentliches Lesen) können diese Obergrenze niemals überschreiten. Der komponentenübergreifende Zugriff auf einen Namensraum wird verweigert, es sei denn, der Namensraum lässt die aufrufende Komponente explizit zu (der Kern ist immer erlaubt).

## Speicherkontingente pro Namensraum und global

Ein neuer Datei-Kontingent-Adapter verfolgt von Administratoren konfigurierbare Standard-Speicherkontingente pro Namensraum sowie ein einzelnes globales Standardkontingent und erstellt bei der Kontoerstellung Schnappschüsse davon als Pro-Benutzer-Overrides, sodass das Kontingent eines Benutzers widerspiegelt, was bei der Registrierung galt. Administratoren können die Kontingente eines einzelnen Benutzers danach über die neue Aktion „Speicherkontingente“ auf der Benutzerseite anpassen. Schreibvorgänge, die eines der Kontingente überschreiten würden, werden mit einem Fehler `413 quota_exceeded` abgelehnt.

## Profilbilder und -banner in den neuen Namensraum „profile“ migriert

Die Avatar- und Banner-Uploads des social/profile-Adapters laufen jetzt über die namensraum-basierten Fähigkeiten `files:store`/`files:delete` des Datei-Gateways gegen einen breit lesbaren `profile`-Namensraum und ersetzen die alten generischen, nicht namensraum-basierten Datei-Bucket-Routen. Die Adapter `social/messages` und `study/classes` registrieren grundlegende Namensräume `chats` bzw. `classes`, bereit für zukünftige Anhang-Funktionen.
