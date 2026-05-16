import test from "node:test";
import assert from "node:assert/strict";
import { JitsiMeetStore } from "../store.js";

function createMockJitsiDb({ meetingRows = [], participantRows = [] } = {}) {
    const storedMeetingRows = [...meetingRows];
    const storedParticipantRows = [...participantRows];
    const insertedMeetingRows = [];

    return {
        insertedMeetingRows,
        async ensureTable() {},
        async transaction(callback) {
            return callback(this);
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

test("jitsi store meeting creation uses the modern column set", async () => {
    const mockDb = createMockJitsiDb();
    const store = new JitsiMeetStore({ db: mockDb });

    await store.ensureSchema();
    const createdMeeting = await store.createMeeting({
        instanceUrl: "https://meet.example.com",
        meetingPrefix: "classroom",
        usernames: ["alice", "bob", "carol"],
        classroomId: null,
        createdBy: "alice",
        chatRoomId: null,
    });

    assert.equal(mockDb.insertedMeetingRows.length, 1);
    assert.ok(mockDb.insertedMeetingRows[0].participant_key);
    assert.ok(mockDb.insertedMeetingRows[0].meeting_url);
    assert.ok(mockDb.insertedMeetingRows[0].room_slug);
    assert.match(
        String(mockDb.insertedMeetingRows[0].room_slug),
        /^classroom-[a-f0-9]{8}$/,
    );
    assert.equal(
        String(mockDb.insertedMeetingRows[0].meeting_url).endsWith(
            `/${mockDb.insertedMeetingRows[0].room_slug}`,
        ),
        true,
    );
    assert.equal("participant_a" in mockDb.insertedMeetingRows[0], false);
    assert.equal("participant_b" in mockDb.insertedMeetingRows[0], false);
    assert.equal(createdMeeting?.reused, false);
});

test("jitsi store meeting creation retries with legacy participant columns", async () => {
    const insertedMeetingRows = [];
    let hasFailedLegacyInsert = false;
    const mockDb = {
        async ensureTable() {},
        async transaction(callback) {
            return callback(this);
        },
        async executeCommand(command) {
            if (
                command.option === "INSERT" &&
                command.table === "jitsi_meetings"
            ) {
                if (
                    !hasFailedLegacyInsert &&
                    !("participant_a" in command.values) &&
                    !("participant_b" in command.values)
                ) {
                    hasFailedLegacyInsert = true;
                    throw new Error(
                        'null value in column "participant_a" violates not-null constraint',
                    );
                }
                insertedMeetingRows.push(command.values);
                return { rows: [] };
            }
            if (
                command.option === "SELECT" &&
                command.table === "jitsi_meetings" &&
                command.where?.some((whereEntry) => whereEntry.column === "id")
            ) {
                const selectedMeetingId = command.where.find(
                    (whereEntry) => whereEntry.column === "id",
                )?.value;
                return {
                    rows: insertedMeetingRows.filter(
                        (meetingRow) => meetingRow.id === selectedMeetingId,
                    ),
                };
            }
            if (
                command.option === "INSERT" &&
                command.table === "jitsi_meeting_participants"
            ) {
                return { rows: [] };
            }
            if (
                command.option === "SELECT" &&
                command.table === "jitsi_meeting_participants"
            ) {
                return {
                    rows: [],
                };
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

    const store = new JitsiMeetStore({ db: mockDb });
    await store.ensureSchema();
    await store.createMeeting({
        instanceUrl: "https://meet.example.com",
        meetingPrefix: "classroom",
        usernames: ["alice", "bob"],
        classroomId: null,
        createdBy: "alice",
        chatRoomId: null,
    });

    assert.equal(insertedMeetingRows.length, 1);
    assert.equal(insertedMeetingRows[0].participant_a, "alice");
    assert.equal(insertedMeetingRows[0].participant_b, "bob");
});

test("jitsi store meeting creation falls back to a readable default slug", async () => {
    const mockDb = createMockJitsiDb();
    const store = new JitsiMeetStore({ db: mockDb });

    await store.ensureSchema();
    await store.createMeeting({
        instanceUrl: "https://meet.example.com",
        meetingPrefix: "",
        usernames: ["alice", "bob"],
        classroomId: null,
        createdBy: "alice",
        chatRoomId: null,
    });

    assert.match(
        String(mockDb.insertedMeetingRows[0].room_slug),
        /^cognis-classroom-[a-f0-9]{8}$/,
    );
});
