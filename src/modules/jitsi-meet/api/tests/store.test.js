import test from "node:test";
import assert from "node:assert/strict";
import { JitsiMeetStore } from "../store.js";

function createLegacyJitsiDb({ meetingRows = [], participantRows = [] } = {}) {
    const storedMeetingRows = [...meetingRows];
    const storedParticipantRows = [...participantRows];
    const executedSql = [];
    const insertedMeetingRows = [];

    return {
        executedSql,
        insertedMeetingRows,
        async ensureTable() {},
        async transaction(callback) {
            return callback(this);
        },
        async execute(sql) {
            executedSql.push(sql);
            if (sql.includes("SELECT participant_a, participant_b")) {
                return { rows: [] };
            }
            if (sql.includes("SELECT * FROM jitsi_meetings")) {
                return { rows: storedMeetingRows };
            }
            return { rows: [] };
        },
        async executeCommand(command) {
            if (
                command.option === "UPDATE" &&
                command.table === "jitsi_meetings"
            ) {
                const meetingId = command.where?.find(
                    (whereEntry) => whereEntry.column === "id",
                )?.value;
                const meetingRow = storedMeetingRows.find(
                    (storedMeetingRow) => storedMeetingRow.id === meetingId,
                );
                Object.assign(meetingRow ?? {}, command.set);
                return { rows: [] };
            }

            if (
                command.option === "SELECT" &&
                command.table === "jitsi_meetings" &&
                command.where?.some(
                    (whereEntry) => whereEntry.column === "participant_key",
                )
            ) {
                const participantKey = command.where.find(
                    (whereEntry) => whereEntry.column === "participant_key",
                )?.value;
                return {
                    rows: storedMeetingRows.filter(
                        (meetingRow) =>
                            meetingRow.participant_key === participantKey,
                    ),
                };
            }

            if (
                command.option === "SELECT" &&
                command.table === "jitsi_meetings" &&
                command.where?.some((whereEntry) => whereEntry.column === "id")
            ) {
                const meetingId = command.where.find(
                    (whereEntry) => whereEntry.column === "id",
                )?.value;
                return {
                    rows: storedMeetingRows.filter(
                        (meetingRow) => meetingRow.id === meetingId,
                    ),
                };
            }

            if (
                command.option === "SELECT" &&
                command.table === "jitsi_meeting_participants"
            ) {
                const meetingId = command.where?.find(
                    (whereEntry) => whereEntry.column === "meeting_id",
                )?.value;
                return {
                    rows: storedParticipantRows
                        .filter(
                            (participantRow) =>
                                participantRow.meeting_id === meetingId,
                        )
                        .map((participantRow) => ({
                            username: participantRow.username,
                        })),
                };
            }

            if (
                command.option === "INSERT" &&
                command.table === "jitsi_meetings"
            ) {
                insertedMeetingRows.push(command.values);
                storedMeetingRows.push(command.values);
                return { rows: [] };
            }

            if (
                command.option === "INSERT" &&
                command.table === "jitsi_meeting_participants"
            ) {
                storedParticipantRows.push(command.values);
                return { rows: [] };
            }

            if (
                command.option === "INSERT" &&
                command.table === "jitsi_meeting_state"
            ) {
                return { rows: [] };
            }

            return { rows: [] };
        },
    };
}

test("jitsi store prepares participant_key for legacy meeting rows", async () => {
    const legacyDb = createLegacyJitsiDb({
        meetingRows: [
            {
                id: "meeting-1",
                participant_a: "alice",
                participant_b: "bob",
                participant_key: null,
                meeting_url: "https://meet.example.com/room-1",
                meeting_password: "secret",
                meeting_name: "Cognis Classroom",
                chat_room_id: null,
                classroom_id: null,
                created_by: "alice",
                created_at: "2026-05-16T00:00:00.000Z",
                updated_at: "2026-05-16T00:00:00.000Z",
            },
        ],
        participantRows: [
            { meeting_id: "meeting-1", username: "alice" },
            { meeting_id: "meeting-1", username: "bob" },
        ],
    });
    const store = new JitsiMeetStore({ db: legacyDb });

    await store.ensureSchema();
    const meeting = await store.findMeetingByParticipants(["bob", "alice"]);

    assert.equal(store.hasLegacyParticipantColumns, true);
    assert.ok(
        legacyDb.executedSql.some((statement) =>
            statement.includes("ADD COLUMN IF NOT EXISTS participant_key"),
        ),
    );
    assert.ok(meeting);
    assert.notEqual(meeting?.participantKey, "undefined");
});

test("jitsi store keeps legacy participant columns populated after schema preparation", async () => {
    const legacyDb = createLegacyJitsiDb();
    const store = new JitsiMeetStore({ db: legacyDb });

    await store.ensureSchema();
    const createdMeeting = await store.createMeeting({
        instanceUrl: "https://meet.example.com",
        meetingPrefix: "classroom",
        usernames: ["alice", "bob", "carol"],
        classroomId: null,
        createdBy: "alice",
        chatRoomId: null,
    });

    assert.equal(legacyDb.insertedMeetingRows.length, 1);
    assert.equal(legacyDb.insertedMeetingRows[0].participant_a, "alice");
    assert.equal(legacyDb.insertedMeetingRows[0].participant_b, "bob");
    assert.ok(legacyDb.insertedMeetingRows[0].participant_key);
    assert.equal(createdMeeting?.reused, false);
});
