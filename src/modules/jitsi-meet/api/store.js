/**
 * Jitsi Meet module database store.
 *
 * Owns two tables:
 *   - jitsi_meet_settings  — module-level key/value settings (e.g. baseUrl)
 *   - jitsi_meetings       — persistent meeting records keyed by sorted
 *                            participant pair; each record FK-references the
 *                            two participant account IDs so a pre-flight check
 *                            can verify the requesting user is a participant.
 *
 * All methods accept a DbExecutor obtained from the `db:executor` capability.
 * The store is instantiated during registerApiRoutes() and shared across all
 * route handlers via closure.
 */

const SETTINGS_TABLE = {
    name: 'jitsi_meet_settings',
    columns: [
        { name: 'key', type: 'text', notNull: true, primaryKey: true },
        { name: 'value', type: 'text', notNull: true },
        { name: 'updated_at', type: 'timestamp', notNull: true, default: 'now' },
    ],
};

const MEETINGS_TABLE = {
    name: 'jitsi_meetings',
    columns: [
        { name: 'id', type: 'text', notNull: true, primaryKey: true },
        { name: 'room_slug', type: 'text', notNull: true, unique: true },
        { name: 'participant_a', type: 'text', notNull: true },
        { name: 'participant_b', type: 'text', notNull: true },
        { name: 'created_at', type: 'timestamp', notNull: true, default: 'now' },
        { name: 'last_used_at', type: 'timestamp', notNull: false },
    ],
    uniqueKeys: [['participant_a', 'participant_b']],
};

export class JitsiMeetStore {
    constructor(dbExecutor) {
        this._db = dbExecutor;
    }

    async ensureSchema() {
        await this._db.ensureTable(SETTINGS_TABLE);
        await this._db.ensureTable(MEETINGS_TABLE);
    }

    async getSetting(key) {
        const result = await this._db.executeCommand({
            option: 'SELECT',
            table: 'jitsi_meet_settings',
            columns: ['value'],
            where: [{ column: 'key', value: key }],
            limit: 1,
        });
        return result.rows?.[0]?.value ?? null;
    }

    async getAllSettings() {
        const result = await this._db.executeCommand({
            option: 'SELECT',
            table: 'jitsi_meet_settings',
            columns: ['key', 'value'],
        });
        const settings = {};
        for (const row of result.rows ?? []) {
            settings[row.key] = row.value;
        }
        return settings;
    }

    async setSetting(key, value) {
        const existing = await this.getSetting(key);
        if (existing !== null) {
            await this._db.executeCommand({
                option: 'UPDATE',
                table: 'jitsi_meet_settings',
                set: [
                    { column: 'value', value: String(value) },
                    { column: 'updated_at', value: new Date().toISOString() },
                ],
                where: [{ column: 'key', value: key }],
            });
        } else {
            await this._db.executeCommand({
                option: 'INSERT',
                table: 'jitsi_meet_settings',
                values: {
                    key,
                    value: String(value),
                    updated_at: new Date().toISOString(),
                },
            });
        }
    }

    async findMeetingByParticipants(participantA, participantB) {
        const sorted = [participantA, participantB].sort();
        const result = await this._db.executeCommand({
            option: 'SELECT',
            table: 'jitsi_meetings',
            columns: ['id', 'room_slug', 'participant_a', 'participant_b', 'created_at', 'last_used_at'],
            where: [
                { column: 'participant_a', value: sorted[0] },
                { column: 'participant_b', value: sorted[1] },
            ],
            limit: 1,
        });
        return result.rows?.[0] ?? null;
    }

    async findMeetingById(meetingId) {
        const result = await this._db.executeCommand({
            option: 'SELECT',
            table: 'jitsi_meetings',
            columns: ['id', 'room_slug', 'participant_a', 'participant_b', 'created_at', 'last_used_at'],
            where: [{ column: 'id', value: meetingId }],
            limit: 1,
        });
        return result.rows?.[0] ?? null;
    }

    async createMeeting(meetingId, roomSlug, participantA, participantB) {
        const sorted = [participantA, participantB].sort();
        await this._db.executeCommand({
            option: 'INSERT',
            table: 'jitsi_meetings',
            values: {
                id: meetingId,
                room_slug: roomSlug,
                participant_a: sorted[0],
                participant_b: sorted[1],
                created_at: new Date().toISOString(),
            },
        });
    }

    async touchMeeting(meetingId) {
        await this._db.executeCommand({
            option: 'UPDATE',
            table: 'jitsi_meetings',
            set: [{ column: 'last_used_at', value: new Date().toISOString() }],
            where: [{ column: 'id', value: meetingId }],
        });
    }
}
