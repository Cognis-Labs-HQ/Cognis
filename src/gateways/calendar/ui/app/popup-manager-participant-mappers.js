export function getEventParticipants(event, participantDirectory = null) {
    const resolveUserLabel = (identifier) => {
        const fallbackIdentifier = identifier;
        if (!participantDirectory) return fallbackIdentifier;
        const profile = participantDirectory.get(identifier);
        if (!profile) return fallbackIdentifier;
        return profile.displayName || profile.username || fallbackIdentifier;
    };
    return [
        ...(Array.isArray(event.attendees)
            ? event.attendees.map((entry) => ({
                  avatarKey: String(
                      participantDirectory?.get(entry)?.avatarKey ?? "",
                  ).trim(),
                  type: "user",
                  value: entry,
                  label: resolveUserLabel(entry),
              }))
            : []),
        ...(Array.isArray(event.inviteEmails)
            ? event.inviteEmails.map((entry) => ({
                  type: "email",
                  value: entry,
                  label: entry,
              }))
            : []),
    ];
}
