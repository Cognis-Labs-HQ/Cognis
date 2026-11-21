# Referensi Teknis

Antarmuka publik dan aturan operasional Sistem Inti.

## Antarmuka

### Rute API

Komponen ini tidak mendaftarkan rute HTTP secara langsung.

### API ctx.flow

`ctx.flow` adalah antarmuka sempit untuk pola guard-and-inject.
Komponen memeriksa apakah flow ada sebelum menginjeksi hook.

### Antarmuka

- **`exists(flowId)`** — mengembalikan `true` jika flow telah terdaftar.
- **`extend(flowId, stageId, hook, handler)`** — mendaftarkan stage hook. Mengembalikan `true` jika berhasil, `false` jika id hook sudah ada (idempotent, tidak melempar error).
- **`run(flowId, input?)`** — menjalankan flow.

## Konfigurasi

Komponen ini tidak memiliki konfigurasi variabel lingkungan runtime.

## Perilaku

### Bus Ctx dan Flow Core

Alur `startSsoLogin` memulai autentikasi berbasis pengalihan tanpa mengirimkan bidang kredensial. Hook penyedia memvalidasi penyedia yang dipilih pada `validateProvider`, lalu membuat status dan mengembalikan `{ providerId, redirectUrl }` dari `initiateAuthorization`. Cognis hanya menerima URL pengalihan relatif atau HTTPS.

Alur wajib `gateAccountCreation` berjalan sebelum identitas eksternal dapat membuat akun Cognis. Pendaftaran publik mengizinkan pembuatan secara langsung; jika tidak, gateway pendaftaran mewajibkan token pendaftaran sekali pakai dengan email yang cocok dengan identitas penyedia. Email penyedia yang tidak ada menghasilkan `emailRequired: true` agar permukaan SSO dapat memintanya, sedangkan pembatalan atau otorisasi yang tidak ada membuat akun tidak dibuat dan membatalkan proses masuk.

### Ikhtisar

`src/core/ctx/` mendefinisikan bus kapabilitas `ctx` tingkat platform sebagai permukaan core tersendiri. Desainnya dibuat netral: komponen menyumbang kapabilitas, mendaftarkan flow, dan menyuntikkan hook tahap flow tanpa mengimpor internal komponen lain.

Instans ctx yang sama dimaksudkan dipakai bersama oleh core, gateway, adapter, modul, dan bootstrap route. Ini membuat komposisi fitur eksplisit dan dapat dibalik: saat komponen dinonaktifkan, hook flow dan kapabilitasnya dapat dilepas tanpa mengubah kode yang tidak terkait.

Model flow memperlakukan pekerjaan sebagai siklus bernama dengan tahap deterministik. Satu flow bisa mewakili operasi backend (menambah pengguna, ubah kata sandi), aksi pesan (kirim pesan, buat meeting), atau konstruksi UI (membangun halaman pengaturan, halaman login).

### Tanggung Jawab

- Menyediakan permukaan tunggal untuk kontribusi dan lookup kapabilitas.
- Mendaftarkan flow bernama dengan definisi tahap berurutan.
- Mengizinkan komponen menyuntik dan melepas hook tahap flow.
- Menjalankan flow per tahap dengan urutan stabil.
- Mengembalikan keluaran eksekusi tahap untuk observabilitas dan pengujian.

Tidak bertanggung jawab untuk: penyimpanan data, wiring route HTTP, discovery adapter, atau kebijakan enable/disable komponen.

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

Pelaksana membekukan konteks eksekusi setiap tahap secara dangkal sebelum memanggil handler pemilik atau hook ekstensi. Ikatan `ctx`, `flowId`, `stageId`, `input`, `meta`, `data`, dan `stageResults` tidak dapat diganti atau dihapus, dan bidang konteks baru tidak dapat ditambahkan. Pemilik dan hook berbagi konteks yang sama dalam satu tahap; setiap tahap dan pemanggilan menerima konteksnya sendiri. Muatan tidak dibekukan secara mendalam: `input`, `data`, dan `stageResults` mempertahankan identitas yang ada serta isi yang dapat diubah. Tahap berikutnya tetap melihat hasil yang terkumpul melalui objek `stageResults` yang sama. Metadata tetap berupa salinan `meta` yang dibekukan secara dangkal; nilai metadata bertingkat tidak dibekukan.

### Titik Ekstensi

- Kontribusikan kapabilitas lintas komponen lewat `ctx.contributeCapability(key, value)`.
- Hapus kapabilitas milik komponen saat pembongkaran dengan `ctx.removeCapability(key)`; bootstrap modul terbatas melakukannya secara otomatis.
- Daftarkan pipeline orkestrasi baru lewat `ctx.registerFlow({ id, stages })`.
- Suntikkan perilaku flow lewat `ctx.addFlowStageHook(flowId, stageId, hook, handler)`.
- Lepaskan perilaku saat komponen dinonaktifkan lewat `ctx.removeFlowStageHook(...)` dan `ctx.unregisterFlow(...)`.

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

### Deklarasi kapabilitas modul

Modul menyatakan layanan yang digunakan melalui field manifes tingkat atas `requiresCapabilities`. Kapabilitas server memakai ID terdaftar, misalnya `auth:requireAuth`; kapabilitas peramban memakai namespace `ui:`, misalnya `ui:profileAvatarRenderer`. Cognis menghubungkan kebutuhan UI yang dinyatakan ke rute SPA modul dan hanya mengimpor skrip penyedia terdaftar yang cocok sebelum memasang rute. Aktivasi menyelesaikan kapabilitas server melalui konteks server dan kapabilitas `ui:` melalui penyedia registri UI yang aktif; perutean SPA memeriksa kembali penyedia peramban sebelum memasang.

Penyedia harus menerbitkan ID kapabilitas dalam dokumentasi komponennya dan mendaftarkan penyedia peramban melalui `providesCapabilities`. Operator pemilik dapat memeriksa registri aktif melalui `GET /api/v1/system/capabilities` atau `cognisctl system:capabilities`. Modul yang skrip navigasinya menyediakan kapabilitas peramban mendeklarasikan ID tersebut dalam `registerNavbarPlugin({ providesCapabilities: [...] })`; host kemudian mengimpor skrip itu sebelum halaman pengguna kapabilitas dipasang.

### Tahap pemilik per pemanggilan

Core 0.3.109 menambahkan `handlers` opsional per pemanggilan pada `FlowRunOptions`. Handler pemilik berjalan sebelum hook ekstensi pada tahap terdaftarnya, menyumbangkan hasil ke `stageResults`, dan hanya berbagi `data` milik pemanggilan tersebut. Tahap tidak dikenal ditolak sebelum eksekusi. Kegagalan menghentikan tahap berikutnya. Komponen mempertahankan persistensi dalam transaksinya sendiri agar kegagalan hook membatalkan penulisan. Handler per pemanggilan tidak disimpan sebagai hook global.

### Sumber daya server dan browser

Konteks bootstrap eksternal mendukung `registerDisposer(dispose)`. Pembersihan berjalan dalam urutan registrasi terbalik setelah nonaktif, refresh atau bootstrap gagal; kegagalan dicatat dan pembersihan lain dilanjutkan. Penyedia browser mengekspor `mountProvider(scopedUiCtx)`, mendaftarkan kapabilitas serta alur dalam lingkupnya, memakai signal untuk listener dan mengembalikan pembersihan tambahan. Loader menyelaraskan kedua katalog dan mengaktifkan skrip cache kembali; `ui:navbarLinks` memiliki DOM navigasi.

### Skor Keterlibatan

Mesin keterlibatan inti menghitung XP berdasarkan bukti dan memberikan pencapaian terdaftar melalui alur ctx bertahap.

### Alur penyedia

Penyedia bahasa dan aktivitas memperluas keterlibatan hanya melalui kapabilitas `ctx` publik. Saat bootstrap, gunakan `engagement:scoring` untuk mendaftarkan bobot bawaan jenis aktivitas, pengubah terjadwal berdasarkan cakupan, dan booster yang dapat ditukar. Gunakan `engagement:achievements` untuk mendaftarkan lencana normal, langka, atau legendaris. Kirim kumpulan yang selesai melalui `engagement:recordActivity`; tampilan item belajar mandiri tidak memberikan XP.

Aktivitas menyertakan ID peristiwa bukti yang unik, ID penyedia dan peserta, kesulitan konten, waktu selesai, bobot penyedia opsional, serta cakupan seperti `language` dan `activity`. Bobot penyedia eksplisit menggantikan bobot bawaan jenis aktivitas. Kesulitan, bobot, pengubah, petunjuk, akurasi, jawaban mandiri, penyelesaian pertama, pengulangan, dan target waktu penyedia memengaruhi skor. Pengulangan memakai satu tingkat pengurangan tetap, bukan penurunan berkelanjutan.

### Orkestrasi

`engagement:recordActivity` menjalankan `engagement:scoreActivity` melalui tahap `validate`, `score`, `achievements`, dan `publish`. Tahap achievement menyusun `engagement:evaluateAchievements` dengan tahap `collect`, `evaluate`, dan `award`. Penyedia dapat memperluas alur ini tanpa mengimpor internal core.

### Imbalan Latihan Tersimpan

`engagement:recordActivity` memvalidasi, menghitung skor, mengevaluasi pencapaian, menyimpan bukti, lalu menerbitkan hasil. Host menyuntikkan `engagement:store`; penyimpanan produksi dimiliki gateway basis data. Revisi peserta menolak penulisan yang berbenturan. Pengiriman ulang aktivitas yang sama mempertahankan XP dan penghargaan; masukan yang berubah atau bukti yang dipakai ulang ditolak. Penghitungan dan evaluasi memakai status terisolasi hingga penyimpanan berhasil. `engagement:ledger` menyediakan ringkasan otoritatif, penukaran booster tersimpan, dan pembatalan aktivitas. Booster yang ditukar serta bukti yang terpakai bertahan setelah mulai ulang. `repeatKey` mengelompokkan latihan berulang tanpa mengubah bukti asli. Koreksi menghapus XP dan proyeksi penghargaan yang dibatalkan sambil mempertahankan riwayat. Metode penghitungan dasar tetap menjadi kalkulator kebijakan; konsumen persisten memakai ledger dan kapabilitas pencatatan.

Ringkasan ledger, penukaran booster, dan pembatalan aktivitas menjalankan alur ctx khusus dengan tahap validasi dan eksekusi. Identitas peserta yang tidak valid ditolak sebelum membaca atau mengubah penyimpanan.

## Keamanan

Kepemilikan dan cakupan bootstrap mengatur masa registrasi. Handler berhak khusus mengotorisasi sebelum perubahan; kuitansi engagement memvalidasi pelaku, bukti, serta identitas idempoten sebelum hadiah.

## Referensi

- [src/core/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/package.json)
- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
