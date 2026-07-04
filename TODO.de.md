# Zurückgestellte Feedback-Punkte

## Code Review — Nacharbeit zum Classroom-Workspace

### classroom-meeting-embed.js CSS-Klassennamen

**Reviewer suggestion:** `classes-meeting-window` in `src/modules/jitsi-meet/ui/classroom-meeting-embed.js` in einen modulbezogeneren Klassennamen umbenennen.

**Reason ignored:** Der Klassenname ist Teil des bestehenden Styling-Vertrags zwischen dem Meeting-Embed und dem Classes-Adapter. Ein sicheres Umbenennen würde eine größere modulübergreifende CSS-Refaktorierung außerhalb dieses Tasks erfordern.

### classroom.js interactionsBound-Flag

**Reviewer suggestion:** Das `interactionsBound`-Flag in `src/adapters/study/classes/ui/classroom.js` entfernen oder überarbeiten.

**Reason ignored:** Falsch positiver Hinweis. Das Flag ist bereits auf den `mount()`-Scope begrenzt und wird bei jedem neuen Page-Mount neu erzeugt; aus dem aktuellen Verhalten ist keine bestätigte Regression ableitbar.

### classroom-presence.js Heartbeat-Timing

**Reviewer suggestion:** Das Classroom-Presence-Heartbeat-Intervall mit dem Away-Timeout in `src/gateways/social/bootstrap.ts` abgleichen.

**Reason ignored:** Das ist eine größere, bereits vorhandene verhaltensbezogene Änderung über Komponenten hinweg und nicht Teil des Workspace-/Notepad-/Whiteboard-Fixes. Sie sollte in einem eigenen Follow-up behandelt werden.

### classroom-render.js rosterItemClass-Validierung

**Reviewer suggestion:** `member?.rosterItemClass` in `src/adapters/study/classes/ui/classroom-render.js` per Whitelist validieren, statt den Wert nur zu escapen.

**Reason ignored:** Die aktuellen Werte stammen aus adaptereigenen Konstanten. Diese Vertragsverschärfung sollte gemeinsam mit dem Code umgesetzt werden, der die Member-Daten formt, statt sie in diese Workspace-Änderung hineinzuziehen.

### gateways/social/bootstrap.ts claims.sub JSON-Erzeugung

**Reviewer suggestion:** Die JSON-Nutzlast für `claims.sub` in `src/gateways/social/bootstrap.ts` sicher konstruieren.

**Reason ignored:** Das ist ein unabhängiges Gateway-Thema außerhalb der für diesen Classroom-Task geänderten Dateien.
