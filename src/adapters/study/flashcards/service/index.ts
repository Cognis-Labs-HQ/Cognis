import { reviewResult } from "./review-result.js";
import { studyAttempt } from "../../../../gateways/study/reuse/attempt.js";
import type { StudyResult } from "../../../../gateways/study/progress.js";
import type { BootstrapLog } from "../../../../gateways/shared.js";
import { randomUUID } from "node:crypto";
import type { FlowApi, FlowStageHook } from "@cognis/core";
import type {
    DeckActor,
    DeckDetail,
    DeckLibrary,
    DeckNote,
    DeckProgress,
    StudyDeck,
} from "./types.js";
import { DeckStore } from "./store.js";

export function nextReview(
    previous: DeckProgress | undefined,
    grade: unknown,
    now = new Date(),
): DeckProgress {
    if (!["again", "good", "easy"].includes(String(grade)))
        throw new Error("invalid_review_grade");
    const interval =
        grade === "again"
            ? 0
            : grade === "easy"
              ? Math.max(4, (previous?.interval ?? 1) * 3)
              : Math.max(1, (previous?.interval ?? 0) * 2);
    return {
        interval,
        repetitions: grade === "again" ? 0 : (previous?.repetitions ?? 0) + 1,
        due: new Date(
            now.getTime() + (interval ? interval * 86400000 : 60000),
        ).toISOString(),
    };
}

export class DeckService {
    constructor(
        private readonly store: DeckStore,
        private readonly library: () => DeckLibrary | undefined,
        private readonly flow: FlowApi,
        private readonly log?: BootstrapLog,
        private readonly access: (
            actor: DeckActor,
            deck: StudyDeck,
        ) => Promise<boolean> = async () => false,
        private readonly received: (
            accountId: string,
        ) => Promise<string[]> = async () => [],
        private readonly revoke: (
            deck: StudyDeck,
        ) => Promise<void> = async () => {},
        private readonly providers: (
            actor: DeckActor,
            id?: string,
        ) => Promise<StudyDeck[]> = async () => [],
        private readonly recordResult?: (
            result: StudyResult,
            actor: DeckActor,
        ) => Promise<void>,
    ) {}

    private async listVisible(actor: DeckActor): Promise<StudyDeck[]> {
        const owned = [
            ...(await this.store.list(actor.accountId)),
            ...(await this.providers(actor)),
        ];
        const shared = await Promise.all(
            (await this.received(actor.accountId)).map(async (id) => {
                const deck = await this.store.find(id);
                return deck && (await this.access(actor, deck)) ? deck : null;
            }),
        );
        return Promise.all(
            [
                ...new Map(
                    [
                        ...owned,
                        ...shared.filter((deck): deck is StudyDeck => !!deck),
                    ].map((deck) => [deck.id, deck]),
                ).values(),
            ].map(async (deck) => ({
                ...deck,
                cards: [],
                schemas: [],
                canEdit:
                    !deck.provider && deck.ownerAccountId === actor.accountId,
                canExport:
                    deck.ownerAccountId === actor.accountId ||
                    actor.role === "admin" ||
                    actor.role === "owner",
                progress: await this.store.progress(actor.accountId, deck.id),
            })),
        );
    }

    async list(actor: DeckActor): Promise<StudyDeck[]> {
        let decks: StudyDeck[] = [];
        await this.flow.run(
            "study:decks:list",
            { actor },
            {
                handlers: {
                    authorize: () => {
                        if (!actor.accountId) throw new Error("unauthorized");
                    },
                    read: async () => {
                        decks = await this.listVisible(actor);
                    },
                    audit: () =>
                        this.log?.("info", "Study decks browsed.", {
                            component: "study-flashcards",
                            operation: "deckList",
                            accountId: actor.accountId,
                        }),
                },
            },
        );
        return decks;
    }

    async owned(accountId: string, id: string): Promise<StudyDeck | undefined> {
        const deck = await this.store.read(accountId, id);
        if (!deck) return undefined;
        const cards = await Promise.all(
            deck.entryIds.map((entryId) =>
                this.card({ accountId, role: "user" }, entryId),
            ),
        );
        const visibleCards = cards.filter((card): card is DeckDetail => !!card);
        const schemaIds = new Set(
            visibleCards
                .flatMap((card) => [card.entry, ...card.references])
                .map((entry) => entry.schemaId),
        );
        return {
            ...deck,
            cards: visibleCards,
            schemas:
                this.library()
                    ?.listSchemas?.()
                    .filter((schema) => schemaIds.has(schema.id)) ?? [],
        };
    }

    private async readable(
        store: DeckStore,
        actor: DeckActor,
        id: string,
    ): Promise<StudyDeck> {
        const deck =
            (await store.find(id)) ??
            (await this.providers(actor, id)).find((deck) => deck.id === id);
        if (
            !deck ||
            (!deck.provider &&
                deck.ownerAccountId !== actor.accountId &&
                !(await this.access(actor, deck)))
        )
            throw new Error("deck_not_found");
        return {
            ...deck,
            cards: [],
            schemas: [],
            canEdit: !deck.provider && deck.ownerAccountId === actor.accountId,
            canExport:
                deck.ownerAccountId === actor.accountId ||
                actor.role === "admin" ||
                actor.role === "owner",
            progress: await store.progress(actor.accountId, id),
        };
    }

    private async card(
        actor: DeckActor,
        id: string,
    ): Promise<DeckDetail | null> {
        const library = this.library();
        if (!library) throw new Error("library_unavailable");
        try {
            return await library.trace(actor, id);
        } catch (error) {
            if (
                error instanceof Error &&
                ["not_found", "entry_not_found", "forbidden"].includes(
                    error.message,
                )
            )
                return null;
            throw error;
        }
    }

    async details(
        actor: DeckActor,
        id: string,
    ): Promise<{ deck: StudyDeck; cards: DeckDetail[]; unavailable: number }> {
        let deck!: StudyDeck;
        let cards: Array<DeckDetail | null> = [];
        await this.flow.run(
            "study:decks:details",
            { actor, deckId: id },
            {
                handlers: {
                    authorize: async () => {
                        deck = await this.readable(this.store, actor, id);
                    },
                    read: async () => {
                        const reader =
                            deck.provider ||
                            deck.ownerAccountId === actor.accountId
                                ? actor
                                : {
                                      accountId: deck.ownerAccountId,
                                      role: "user",
                                  };
                        cards = await Promise.all(
                            deck.entryIds.map((entryId) =>
                                this.card(reader, entryId),
                            ),
                        );
                    },
                    audit: () =>
                        this.log?.("info", "Study deck opened.", {
                            component: "study-flashcards",
                            operation: "deckDetails",
                            accountId: actor.accountId,
                            deckId: id,
                        }),
                },
            },
        );
        return {
            deck,
            cards: cards.filter((card): card is DeckDetail => !!card),
            unavailable: cards.filter((card) => !card).length,
        };
    }

    async save(
        actor: DeckActor,
        raw: unknown,
        id?: string,
    ): Promise<StudyDeck> {
        const input = raw as {
            name: string;
            entryIds: string[];
            notes?: DeckNote[];
            language?: string;
        };
        return this.store.transact(async (store) => {
            let result!: StudyDeck;
            let snapshots: DeckDetail[] = [];
            const handlers: Record<string, FlowStageHook> = {
                authorize: async () => {
                    if (actor.accountId.startsWith("share:"))
                        throw new Error("deck_read_only");
                    if (id) await store.lockProgress(actor.accountId, id);
                    if (id && !(await store.read(actor.accountId, id)))
                        throw new Error("deck_not_found");
                },
                validate: async () => {
                    if (
                        !input ||
                        typeof input.name !== "string" ||
                        !input.name.trim() ||
                        input.name.length > 100 ||
                        !Array.isArray(input.entryIds) ||
                        input.entryIds.some(
                            (value) => typeof value !== "string" || !value,
                        ) ||
                        new Set(input.entryIds).size !== input.entryIds.length
                    )
                        throw new Error("invalid_deck");
                    if (
                        input.notes !== undefined &&
                        (!Array.isArray(input.notes) ||
                            input.notes.some(
                                (note) =>
                                    !note ||
                                    typeof note.front !== "string" ||
                                    !note.front.trim() ||
                                    note.front.length > 10000 ||
                                    typeof note.back !== "string" ||
                                    note.back.length > 10000 ||
                                    (note.pronunciation !== undefined &&
                                        (typeof note.pronunciation !==
                                            "string" ||
                                            note.pronunciation.length > 1000)),
                            ))
                    )
                        throw new Error("invalid_deck_notes");
                    const cards = await Promise.all(
                        input.entryIds.map((entryId) =>
                            this.card(actor, entryId),
                        ),
                    );
                    if (cards.some((card) => !card))
                        throw new Error("deck_card_unavailable");
                    snapshots = cards
                        .filter((card): card is DeckDetail => !!card)
                        .map(({ entry, references }) => ({
                            entry,
                            references,
                        }));
                    if (!input.entryIds.length && !input.notes?.length)
                        throw new Error("empty_deck");
                },
                persist: async () => {
                    const previous = id
                        ? await store.read(actor.accountId, id)
                        : undefined;
                    if (previous) {
                        previous.progress = await store.progress(
                            actor.accountId,
                            id!,
                        );
                    }
                    const previousNotes = new Map(
                        previous?.notes.map((note) => [note.id, note]) ?? [],
                    );
                    const notes = (input.notes ?? []).map((note) => ({
                        front: note.front,
                        back: note.back,
                        pronunciation: note.pronunciation,
                        id: previousNotes.has(note.id) ? note.id : randomUUID(),
                    }));
                    const schemaLanguages = new Set(
                        (this.library()?.listSchemas?.() ?? [])
                            .filter((schema) =>
                                snapshots.some(
                                    (detail) =>
                                        detail.entry.schemaId === schema.id,
                                ),
                            )
                            .map((schema) => schema.language)
                            .filter(Boolean),
                    );
                    let language = input.language;
                    if (language !== undefined) {
                        if (typeof language !== "string")
                            throw new Error("invalid_language");
                        try {
                            [language] = Intl.getCanonicalLocales(language);
                        } catch {
                            throw new Error("invalid_language");
                        }
                        if (
                            !language ||
                            [...schemaLanguages].some(
                                (value) => value !== language,
                            )
                        )
                            throw new Error("deck_language_mismatch");
                    } else if (schemaLanguages.size === 1)
                        language = [...schemaLanguages][0];
                    const currentIds = new Set([
                        ...input.entryIds,
                        ...notes.map((note) => note.id),
                    ]);
                    const progress = Object.fromEntries(
                        Object.entries(previous?.progress ?? {}).filter(
                            ([key]) => currentIds.has(key),
                        ),
                    );
                    result = await store.save(
                        actor.accountId,
                        {
                            name: input.name.trim(),
                            language,
                            entryIds: input.entryIds,
                            notes,
                        },
                        id,
                    );
                    result.cards = snapshots;
                    result.schemas = (
                        this.library()?.listSchemas?.() ?? []
                    ).filter((schema) =>
                        snapshots.some((detail) =>
                            [detail.entry, ...detail.references].some(
                                (entry) => entry.schemaId === schema.id,
                            ),
                        ),
                    );
                    result.progress = progress;
                    result.canEdit = true;
                    result.canExport = true;
                    await store.saveProgress(
                        actor.accountId,
                        result.id,
                        progress,
                    );
                },
                audit: () => {
                    this.log?.("info", "Study deck saved.", {
                        component: "study-flashcards",
                        operation: "deckSave",
                        accountId: actor.accountId,
                        deckId: result.id,
                    });
                },
            };
            await this.flow.run("study:decks:save", { actor }, { handlers });
            return result;
        });
    }

    async review(
        actor: DeckActor,
        id: string,
        cardId: unknown,
        grade: unknown,
        attemptInput?: unknown,
    ): Promise<StudyDeck> {
        const attempt = studyAttempt(attemptInput);
        if (typeof cardId !== "string") throw new Error("invalid_deck_card");
        const reviewed = await this.store.transact(async (store) => {
            let deck!: StudyDeck;
            await this.flow.run(
                "study:decks:review",
                { actor, deckId: id },
                {
                    handlers: {
                        authorize: async () => {
                            if (actor.accountId.startsWith("share:"))
                                throw new Error("deck_read_only");
                            await store.lockProgress(actor.accountId, id);
                            const current = await this.readable(
                                store,
                                actor,
                                id,
                            );
                            if (!current) throw new Error("deck_not_found");
                            deck = current;
                        },
                        validate: async () => {
                            if (
                                !deck.entryIds.includes(cardId) &&
                                !deck.notes.some((note) => note.id === cardId)
                            )
                                throw new Error("invalid_deck_card");
                            if (
                                deck.entryIds.includes(cardId) &&
                                !(await this.card(
                                    deck.provider ||
                                        deck.ownerAccountId === actor.accountId
                                        ? actor
                                        : {
                                              accountId: deck.ownerAccountId,
                                              role: "user",
                                          },
                                    cardId,
                                ))
                            )
                                throw new Error("deck_card_unavailable");
                            deck.progress[cardId] = nextReview(
                                deck.progress[cardId],
                                grade,
                            );
                        },
                        persist: async () => {
                            if (
                                !(await store.reserveReview(
                                    actor.accountId,
                                    id,
                                    attempt.id,
                                    cardId,
                                    String(grade),
                                ))
                            ) {
                                deck.progress = await store.progress(
                                    actor.accountId,
                                    id,
                                );
                                return;
                            }
                            await store.saveProgress(
                                actor.accountId,
                                id,
                                deck.progress,
                            );
                        },
                        audit: () => {
                            this.log?.("info", "Study flashcard reviewed.", {
                                component: "study-flashcards",
                                operation: "deckReview",
                                accountId: actor.accountId,
                                deckId: id,
                            });
                        },
                    },
                },
            );
            return deck;
        });
        if (this.recordResult)
            await this.flow.run(
                "study:decks:recordResult",
                { actor, deckId: id },
                {
                    handlers: {
                        deliver: () =>
                            this.recordResult!(
                                reviewResult(
                                    actor,
                                    reviewed,
                                    cardId,
                                    grade,
                                    attempt,
                                ),
                                actor,
                            ),
                    },
                },
            );
        return reviewed;
    }

    async delete(actor: DeckActor, id: string): Promise<void> {
        await this.flow.run(
            "study:decks:delete",
            { actor, deckId: id },
            {
                handlers: {
                    authorize: async () => {
                        if (!(await this.store.read(actor.accountId, id)))
                            throw new Error("deck_not_found");
                    },
                    persist: async () => {
                        const deck = await this.store.read(actor.accountId, id);
                        if (!deck) throw new Error("deck_not_found");
                        await this.revoke(deck);
                        await this.store.transact((store) =>
                            store.delete(actor.accountId, id),
                        );
                    },
                    audit: () => {
                        this.log?.("info", "Study deck deleted.", {
                            component: "study-flashcards",
                            operation: "deckDelete",
                            accountId: actor.accountId,
                            deckId: id,
                        });
                    },
                },
            },
        );
    }
}
