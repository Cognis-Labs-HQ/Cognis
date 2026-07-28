# Freigaben und Zuständigkeit für Geheimnisse stärken

## Verschlüsselte Geheimnisse in den erforderlichen Schlüsselbund-Adapter der Authentifizierung verschieben

Schlüsselbund-Client, Persistenzspeicher und API-Route gehören jetzt zu einem erforderlichen Authentifizierungsadapter. Die Migration alter Einstellungen und der Klartextabruf von Chatraumschlüsseln wurden entfernt, sodass Geheimnisse ausschließlich über den verschlüsselten Schlüsselbund aufgelöst werden.

## Freigabeaufgaben in den zuständigen Adaptern belassen

Der Benutzerfreigabe-Adapter erzwingt nun die Eindeutigkeit der Empfänger, während ausschließlich SMTP die Ratenbegrenzung seiner E-Mail-Warteschlange verwaltet. Das Freigabe-Gateway orchestriert nur diese Adapterrichtlinien.
