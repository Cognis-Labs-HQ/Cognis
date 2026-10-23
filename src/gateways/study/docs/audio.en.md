# Pronunciation audio

Bootstrap requires `study:audio:provider` and registers one removable audio provider alongside dictionary and stroke providers. It resolves module-bundled recordings by spoken label and preferred reading, with bounded file reads and explicit missing-audio errors. Removal aborts pending retrieval. Cognis authorizes card access, derives selected transformation text from the schema, and caches recordings privately through Files without modifying authored fields. The `study:library:audio` flow executes authorization, validation and resolution; `study:audio:fetch` validates and retrieves provider bytes. Sentence audio remains ordered constituent playback.

## Audio provider contract

`study:audio:provider.registerProvider({ id, revision, languages, fetchAudio })` → disposer.

`fetchAudio({ language, label, semanticRole, readings }, signal)` → `{ mediaType, data: Uint8Array }`.

Both Study modules expose the same removable audio-provider contract and retrieve bundled recordings with bounded local reads. The host owns authorization, cache policy and composite playback.

Seed recordings use the offline Kokoro multilingual neural model with the English `bf_emma` and Japanese `jf_alpha` voices. Clips are encoded at 128 kbps with a 200 ms lead-in, a 180 ms tail, bounded peak normalization and slower speech. Model attribution and Apache licensing are recorded in `data/audio/VOICE-LICENSE.txt`; the recording inventory records the voice and processing settings.

Audio retrieval begins only when the learner requests playback. Merely opening a card makes no audio request. Playback failures use the host localized toast and structured logs. Sentence constituents retain their selected transformation descriptors; the authenticated audio endpoint derives the spoken form from the schema rather than accepting arbitrary display text. English letter-combination seed clips are synthesized from their authored IPA phonemes, while alphabet clips speak letter names.

## Dictionary audio and host caching

When a requested pronunciation is not bundled, English Study retrieves the word from the English Dictionary API and downloads a matching MP3 from its pronunciation media endpoint. A preferred IPA reading must match; a different pronunciation is never substituted. Only HTTPS media on `api.dictionaryapi.dev` is accepted, redirects are rejected, lookup and download share one deadline, and both responses have streaming byte limits. Missing recordings remain explicit errors. No Google speech service is used.

Cognis owns the recording cache, not the module. After authorization, its private Files cache reuses successful recordings across cards and restarts. Concurrent playback requests share retrieval and persistence. Keys include provider identity, revision, language, role, label and readings; a changed reading or provider revision resolves independently. Failed requests or writes remain retryable. The module contacts the dictionary only on a cache miss when playback is requested.

## Paced composition and replacement

An audio field is optional on sentence cards. On first playback Cognis authorizes every constituent, selects only the first pronunciation group, applies selected transformations, and creates one continuous WAV with a quiet lead-in and deliberate word, comma and sentence pauses. The generated recording is cached privately; constituent bytes, reading changes, transformations and pacing affect its identity. It is generated on demand for new cards as well as existing cards. Uploading an audio file in the normal composer replaces generated playback immediately. Removing that explicit file restores automatic composition. Providers supply lexical clips; Cognis owns composition and cache policy.

## Reference inventory coverage

The Japanese reference catalog includes all 13,108 characters in the packaged official KANJIDIC2 snapshot. The English catalog includes all 135,969 Open English WordNet lexical entries (127,311 normalized keys). These are separate lazy dictionary providers, not 149,077 eagerly imported seed cards. Choose Reference Dictionary in Study search to import supported entries through the normal graph validation. Source records without meanings or usable readings remain unknown; no pronunciation, translation or stroke diagram is fabricated. This inventory is not all Unicode Han and is not a claim to enumerate every possible English word.

Japanese Kanji readings are ranked from common JMdict attestations and available frequency markers, including okurigana forms; grouped links and seed audio follow that exact order. Kanji playback always uses the first authored pronunciation. Existing English word cards have one authored IPA reading; reference entries preserve authoritative order within the preferred British variety before other varieties. Pronunciation frequency depends on context, and the sources do not provide a universal frequency rank for every reading.

Rebuild the reference shards with `python3 scripts/import-reference.py --source <source-file>`; Japanese accepts `--priorities <reading-priorities.json>`. `data/reference/manifest.json` records the source checksum, attribution, counts and shard digests. Shards are loaded only for requested keys, and runtime lookup results use Cognis caching.

## Whole-reading reference audio

Japanese additionally ships 2,913 whole-reading neural clips in bounded banks under `data/audio/reference/`. Together with seed recordings they cover the primary readings of all 12,356 source characters that have a reading; the remaining 752 source characters have no recorded reading and do not receive invented audio. The bank index selects the first authored reading and checks file bounds and cancellation. Generate a plan with `python3 scripts/reference-audio.py plan --work <directory>`, render its inventories with the synthesis script, then use `pack` to write the bounded banks.

The Japanese ranking tool accepts `--dictionary <JMdict.gz> --kanji-dictionary <KANJIDIC2.xml.gz> --output <priorities.json>` and optional `--content-root data/library/content`. It prefers common standalone lexical readings, ranks other readings from frequency-weighted alignments of attested words, and preserves reviewed isolated-card choices from `data/audio/primary-readings.json`. Voicing and gemination map back to canonical source readings. Kun, on and name readings remain available; a selected first reading alone determines playback and lookup cache identity. Source frequency markers are an ordering aid, not a universal pronunciation-frequency measurement.

Automatic composition requires recordings for its spoken constituents. Missing recordings remain explicit errors and can be supplied through the normal audio upload field. Reference spellings that cannot be linked to the packaged alphabet retain their source text and definitions without fabricated spelling links.

## Preserve transformed sentence audio

Sentence composition requests the selected transformed label and primary reading, including chained paths. If a variant recording is unavailable, playback fails explicitly instead of traversing base-form pronunciation references. The same rule applies to direct variant playback and nested constituents.
