# Freigaben und Zuständigkeit für Geheimnisse stärken

## Verschlüsselte Geheimnisse in den erforderlichen Schlüsselbund-Adapter der Authentifizierung verschieben

Schlüsselbund-Client, Persistenzspeicher und API-Route gehören jetzt zu einem erforderlichen Authentifizierungsadapter. Die Migration alter Einstellungen und der Klartextabruf von Chatraumschlüsseln wurden entfernt, sodass Geheimnisse ausschließlich über den verschlüsselten Schlüsselbund aufgelöst werden.

## Freigabeaufgaben in den zuständigen Adaptern belassen

Der Benutzerfreigabe-Adapter erzwingt nun die Eindeutigkeit der Empfänger, während ausschließlich SMTP die Ratenbegrenzung seiner E-Mail-Warteschlange verwaltet. Das Freigabe-Gateway orchestriert nur diese Adapterrichtlinien.

## Schlüsselbund-Bootstrap an die Fähigkeitsarchitektur anpassen

Der wiederverwendbare Browser-Schlüsselbund verbleibt an seiner kanonischen UI-Schnittstelle. Der erforderliche Authentifizierungsadapter initialisiert seine Tresor- und Routenfähigkeiten nun selbst während der Gateway-Erkennung, erhält die Authentifizierung über den injizierten Routenkontext und enthält komponenteneigene Dokumentation.

## Quellgrößen- und Abhängigkeitskonformität wiederherstellen

Große Kalender-Routen- und Testdateien wurden in fokussierte Module aufgeteilt, berührte übergroße Dateien unterschreiten nun die Grenze von 1.000 Zeilen, und die Abhängigkeitsobergrenzen für Freigaben entsprechen der getesteten Workspace-Version.
