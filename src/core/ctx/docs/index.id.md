# Bus Ctx dan Flow Core

## Ikhtisar

`src/core/ctx/` mendefinisikan bus kapabilitas `ctx` tingkat platform sebagai permukaan core tersendiri. Desainnya dibuat netral: komponen menyumbang kapabilitas, mendaftarkan flow, dan menyuntikkan hook tahap flow tanpa mengimpor internal komponen lain.

Instans ctx yang sama dimaksudkan dipakai bersama oleh core, gateway, adapter, modul, dan bootstrap route. Ini membuat komposisi fitur eksplisit dan dapat dibalik: saat komponen dinonaktifkan, hook flow dan kapabilitasnya dapat dilepas tanpa mengubah kode yang tidak terkait.

Model flow memperlakukan pekerjaan sebagai siklus bernama dengan tahap deterministik. Satu flow bisa mewakili operasi backend (menambah pengguna, ubah kata sandi), aksi pesan (kirim pesan, buat meeting), atau konstruksi UI (membangun halaman pengaturan, halaman login).

## Tanggung Jawab

- Menyediakan permukaan tunggal untuk kontribusi dan lookup kapabilitas.
- Mendaftarkan flow bernama dengan definisi tahap berurutan.
- Mengizinkan komponen menyuntik dan melepas hook tahap flow.
- Menjalankan flow per tahap dengan urutan stabil.
- Mengembalikan keluaran eksekusi tahap untuk observabilitas dan pengujian.

Tidak bertanggung jawab untuk: penyimpanan data, wiring route HTTP, discovery adapter, atau kebijakan enable/disable komponen.

## Arsitektur

### Lokasi sumber utama

| Path                                  | Tujuan                                                           |
| ------------------------------------- | ---------------------------------------------------------------- |
| `src/core/ctx/create-ctx.ts`          | Membangun instans ctx dari modul fungsi yang dapat dikomposisi   |
| `src/core/ctx/types.ts`               | Kontrak publik untuk kapabilitas, flow, hook, dan hasil eksekusi |
| `src/core/ctx/register-flow.ts`       | Registrasi flow dan validasi tahap                               |
| `src/core/ctx/add-flow-stage-hook.ts` | Kontribusi hook tahap untuk injeksi komponen                     |
| `src/core/ctx/run-flow.ts`            | Runtime eksekusi tahap terurut                                   |

Flow didaftarkan sekali dengan ID tahap eksplisit. Hook tahap kemudian ditambahkan dengan nilai `order`. Saat dijalankan, hook dieksekusi naik berdasarkan `order`, lalu berdasarkan ID hook untuk perilaku deterministik.

Flow dapat memanggil flow lain melalui `context.ctx.runFlow(...)` untuk komposisi bertingkat. Contoh: flow konstruksi halaman login memanggil flow login; hook flow login memanggil flow LDAP saat syarat adapter terpenuhi.

## Konfigurasi

Komponen ini tidak memiliki konfigurasi variabel lingkungan runtime.

## Titik Ekstensi

- Kontribusikan kapabilitas lintas komponen lewat `ctx.contributeCapability(key, value)`.
- Hapus kapabilitas milik komponen saat pembongkaran dengan `ctx.removeCapability(key)`; bootstrap modul terbatas melakukannya secara otomatis.
- Daftarkan pipeline orkestrasi baru lewat `ctx.registerFlow({ id, stages })`.
- Suntikkan perilaku flow lewat `ctx.addFlowStageHook(flowId, stageId, hook, handler)`.
- Lepaskan perilaku saat komponen dinonaktifkan lewat `ctx.removeFlowStageHook(...)` dan `ctx.unregisterFlow(...)`.

## Rute API

Komponen ini tidak mendaftarkan rute HTTP secara langsung.

## API ctx.flow

`ctx.flow` adalah antarmuka sempit untuk pola guard-and-inject.
Komponen memeriksa apakah flow ada sebelum menginjeksi hook.

### Antarmuka

- **`exists(flowId)`** — mengembalikan `true` jika flow telah terdaftar.
- **`extend(flowId, stageId, hook, handler)`** — mendaftarkan stage hook. Mengembalikan `true` jika berhasil, `false` jika id hook sudah ada (idempotent, tidak melempar error).
- **`run(flowId, input?)`** — menjalankan flow.

### Contoh: Guard-and-Inject

```ts
if (ctx.flow.exists("construct-settings-ui")) {
    ctx.flow.extend(
        "construct-settings-ui",
        "resolve-sections",
        { id: "notify-gateway:resolve-sections" },
        () => ({ gatewayId: "notify", sectionId: "notifications" }),
    );
}
```
