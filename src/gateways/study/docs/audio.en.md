# Pronunciation audio

Bootstrap requires `study:audio:provider` and registers one removable audio provider alongside dictionary and stroke providers. It resolves module-bundled recordings by spoken label and preferred reading, with bounded file reads and explicit missing-audio errors. Removal aborts pending retrieval. Cognis authorizes card access, derives selected transformation text from the schema, and caches recordings privately through Files without modifying authored fields. The `study:library:audio` flow executes authorization, validation and resolution; `study:audio:fetch` validates and retrieves provider bytes. Sentence audio remains ordered constituent playback.

## Audio provider contract

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Both Study modules expose the same removable audio-provider contract and retrieve bundled recordings with bounded local reads. The host owns authorization, cache policy and composite playback.

Seeded spoken cards include generated MP3 files in `data/library/assets/audio/`; identical spoken text shares one file. English uses offline Piper with the public-domain LJ Speech dataset voice. Japanese uses offline Open JTalk with HTS Voice Mei, attributed to the MMDAgent Project Team and Nagoya Institute of Technology under CC BY. Voice notices and a per-recording inventory live in `data/audio/`. Punctuation is silent and sentences have no synthesized recording: Cognis plays their ordered constituent audio.

Audio retrieval begins only when the learner requests playback. Merely opening a card makes no audio request. Playback failures use the host localized toast and structured logs. Sentence constituents retain their selected transformation descriptors; the authenticated audio endpoint derives the spoken form from the schema rather than accepting arbitrary display text. English letter-combination seed clips are synthesized from their authored IPA phonemes, while alphabet clips speak letter names.

## Dictionary audio and host caching

When a requested pronunciation is not bundled, English Study retrieves the word from the English Dictionary API and downloads a matching MP3 from its pronunciation media endpoint. A preferred IPA reading must match; a different pronunciation is never substituted. Only HTTPS media on `api.dictionaryapi.dev` is accepted, redirects are rejected, lookup and download share one deadline, and both responses have streaming byte limits. Missing recordings remain explicit errors. No Google speech service is used.

Cognis owns the recording cache, not the module. After authorization, its private Files cache reuses successful recordings across cards and restarts. Concurrent playback requests share retrieval and persistence. Keys include provider identity, revision, language, role, label and readings; a changed reading or provider revision resolves independently. Failed requests or writes remain retryable. The module contacts the dictionary only on a cache miss when playback is requested.
