# Penegakan Arsitektur Ctx

## Permukaan kemampuan publik di ctx

Antarmuka `Ctx` kini memiliki tiga metode baru: `contributePublicCapability`,
`isPublicCapability`, dan `listPublicCapabilities`. Metode-metode ini memungkinkan
bootstrap gateway secara eksplisit mendeklarasikan kemampuan (capability) mana
yang menjadi bagian dari permukaan API publik lintas komponen. Capability yang
dikontribusikan melalui jalur publik tetap dapat diakses melalui metode standar
`requireCapability` dan `getCapability`, tetapi juga dilacak secara terpisah
sebagai publik secara eksplisit. Hal ini memungkinkan penegakan otomatis bahwa
konsumen hanya memanggil permukaan publik yang telah dideklarasikan.

## Tipe kontrak gateway dipindahkan ke core

`AuthContext`, `AuthGateway`, `QueryResult`, `DatabaseGateway`, `StoredObject`,
`FileStorageGateway`, dan `AccessRole` kini didefinisikan di `src/core/contracts/`
dan diekspor dari `@cognis/core`. File-file gateway yang sebelumnya memiliki
definisi ini kini mengekspornya ulang dari core. Ini menghilangkan kebutuhan
komponen mana pun untuk mengimpor langsung dari file gateway hanya demi mendapatkan
tipe bersama.

## Panggilan flow hook yang salah telah diperbaiki

Dua bootstrap gateway menggunakan `flowCtx.on(flowId, stageId, handler)` — bentuk
singkat tiga argumen yang tidak ada pada antarmuka `Ctx` dan akan menyebabkan
kegagalan runtime yang senyap. Keduanya telah diganti dengan bentuk panggilan yang
benar `addFlowStageHook(flowId, stageId, { id }, handler)`:

- `src/gateways/social/bootstrap.ts` (empat hook)
- `src/gateways/notify/bootstrap/index.ts` (satu hook)

## Uji penegakan batas statis

File uji baru `src/core/tests/ctx-boundary.test.ts` menegakkan empat aturan
secara statis pada saat uji dijalankan dengan memindai file sumber:

1. Paket core tidak boleh mengimpor dari gateway atau lapisan API.
2. Tidak ada file sumber yang boleh menggunakan singkatan `flowCtx.on()` yang
   sudah usang.
3. Tipe kontrak gateway harus bersumber dari `@cognis/core`, bukan langsung dari
   file gateway.
4. Implementasi gateway tidak boleh mengimpor kode produksi dari gateway lain.
   (Utilitas bersama antar-gateway di `gateways/shared.ts` dan
   `gateways/db/reuse/db-executor.ts` masuk dalam daftar yang diizinkan secara
   eksplisit.)

Gateway study sebelumnya melanggar aturan 4 dengan mengimpor `AccessRole` langsung
dari gateway auth; impor tersebut kini dilakukan melalui `@cognis/core`.

## Komponen dan file yang diubah

- `src/core/ctx/state.ts`
- `src/core/ctx/types.ts`
- `src/core/ctx/create-ctx.ts`
- `src/core/ctx/contribute-public-capability.ts` (baru)
- `src/core/ctx/is-public-capability.ts` (baru)
- `src/core/ctx/list-public-capabilities.ts` (baru)
- `src/core/contracts/auth-gateway.ts`
- `src/core/contracts/db-gateway.ts` (baru)
- `src/core/contracts/files-gateway.ts` (baru)
- `src/core/index.ts`
- `src/gateways/auth/gateway.ts`
- `src/gateways/auth/access-tokens.ts`
- `src/gateways/db/gateway.ts`
- `src/gateways/files/gateway.ts`
- `src/gateways/social/bootstrap.ts`
- `src/gateways/notify/bootstrap/index.ts`
- `src/gateways/study/gateway.ts`
- `src/core/tests/ctx.test.ts`
- `src/core/tests/ctx-boundary.test.ts` (baru)

## API ctx.flow dan penghapusan ensureCtxCapability

Mengganti pola verbose `ensureCtxCapability` / `addFlowStageHook` dengan
`ctx.flow.exists()` / `ctx.flow.extend()` / `ctx.flow.run()`. Injeksi hook kini
idempotent (`extend()` mengembalikan `false` pada id duplikat alih-alih melempar error).
Semua gateway, adapter, dan modul kini menerima `flow: FlowApi` langsung dari
konteks bootstrap.

### Perubahan

- Menambahkan antarmuka `FlowApi` dan properti `flow` ke `Ctx` dan `GatewayBootstrapBase`
- Menghapus `ensureCtxCapability` dan `CtxCapabilityStore` dari `@cognis/core`
- Semua bootstrap gateway dimigrasikan ke `ctx.flow.extend()`
- Aturan batas baru 5 dan 6 di `ctx-boundary.test.ts`

## Pemeriksaan kepatuhan penamaan file

Awalan fitur atau adapter telah dihapus dari nama file di mana direktori induk
sudah menyediakan konteks yang sama. File-file yang terpengaruh kini berada di
jalur yang lebih alami tanpa awalan redundan:

- `src/core/contracts/profile-media-flow-catalog.ts` → `profile/media-flow-catalog.ts`
- `src/adapters/social/profile/profile-store.ts` → `store-contract.ts`
- `src/adapters/social/profile/routes/profile-media-flow-hooks.ts` → `routes/media-flow-hooks.ts`
- `src/adapters/social/messages/routes/requests-routes.ts` → `routes/requests/index.ts`
- `src/adapters/social/messages/routes/room-routes.ts` → `routes/room/index.ts`
- `src/adapters/social/messages/routes/rooms-routes.ts` → `routes/rooms/index.ts`
- `src/adapters/notify/smtp/smtp-message-builders.ts` → `message-builders.ts`
- `src/adapters/notify/smtp/smtp-notification-queue.ts` → `notification-queue.ts`
- `src/adapters/notify/smtp/smtp-notification-sender.ts` → `notification-sender.ts`
- `src/adapters/notify/smtp/smtp-notification-sender-factory.ts` → `notification-sender-factory.ts`
- `src/gateways/calendar/calendar-store.ts` → `store.ts`
- `src/api/routes/ui/ui-route-rules.ts` → `route-rules.ts`

Semua impor dan file uji telah diperbarui. File instruksi AI kini mendokumentasikan
aturan tidak ada awalan redundan secara eksplisit.
