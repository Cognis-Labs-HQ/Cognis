# Tutorial Terpandu

Tutorial pada menu akun menampilkan panduan yang saat ini diizinkan dari komponen dan modul terpasang. Host mengelola tampilan, pencarian target, aturan interaksi, dan koordinasi sesi; setiap fitur memiliki teks, target, serta skripnya. Tutorial tidak berjalan otomatis dan tidak mengubah izin.

## Mendaftarkan Panduan

Penyedia browser memakai `ui:tutorials` melalui ctx yang dibatasi siklus hidup. Versi kontraknya `1`. Setiap pemilik memerlukan `AbortSignal` yang membatasi seluruh registrasinya.

```js
export async function mountProvider(ctx) {
    const tutorials = ctx.capabilities.get("ui:tutorials");
    if (tutorials?.version !== 1)
        throw new Error("tutorial_contract_unavailable");
    const owner = tutorials.owner("module.example", {
        signal: ctx.signal,
        stringsBaseUrls: ["/static/modules/example/languages"],
    });
    try {
        const target = await owner.target("primary", {
            root: () => document.querySelector(".example-panel"),
            resolve: () =>
                document.querySelector(".example-panel [data-example-primary]"),
        });
        const play = await owner.register({
            version: 1,
            id: "introduction",
            titleKey: "module.example.tutorial.title",
            steps: [
                {
                    id: "primary",
                    target: target.id,
                    titleKey: "module.example.tutorial.primary.title",
                    bodyKey: "module.example.tutorial.primary.body",
                    effects: { callout: true, arrow: true, spotlight: true },
                    interaction: "target",
                    advance: { event: "click" },
                },
            ],
        });
        ctx.capabilities.contribute("example:tutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
```

Registrasikan melalui `mountProvider`, bukan saat mengimpor skrip. Kembalikan `owner.dispose` dan bersihkan registrasi parsial jika gagal. Workspace dan Study menyediakan panduan bawaan; contoh modul eksternal di `src/ui/reuse/tutorials/tests/fixtures/` menunjukkan konsumen kontrak publik yang terpisah.

## Target dan Lokalisasi

Nama target menjadi `owner:name`. Target bersifat privat kecuali diterbitkan dengan `public: true`; komponen lain menggunakan ID semantik, bukan selector privat. ID pemilik, panduan, dan target yang ganda ditolak. Resolver mengembalikan tepat satu elemen dalam dokumen yang sama atau `null`; jangan menyimpan node halaman secara permanen. `root` membatasi pencarian dan `signal` tambahan dapat memperpendek masa hidup. Target tersembunyi, inert, atau nonaktif tidak tersedia. Penarikan target yang sedang dipakai menghentikan sesi terkait.

Resolver dijalankan ulang setelah penggantian dan selama tampilan aktif. Target Shadow DOM terbuka didukung jika root yang dinyatakan mencakup host-nya. Root tertutup dan isi frame tidak didukung. Elemen tertanam tidak boleh berada dalam target yang memblokir karena host tidak dapat menegakkan aturan input di dalamnya. Portal memerlukan root yang diterbitkan secara eksplisit dalam dokumen yang sama.

`stringsBaseUrls` memakai katalog host dengan cadangan bahasa Inggris. Katalog dan pemutaran ulang membaca bahasa tampilan saat ini tanpa memuat ulang halaman. Alternatifnya, `i18n` dapat berupa resolver atau pembuat resolver asinkron. Terjemahan wajib yang hilang menggagalkan registrasi atau operasi. Semua teks dirender sebagai teks biasa, tidak pernah sebagai HTML.

## Opsi Langkah

- `effects` mengaktifkan `callout`, `arrow`, dan `spotlight` secara terpisah. Teks aktif secara bawaan; dua efek lainnya tidak. Penjelasan yang disembunyikan secara visual tetap dapat diakses teknologi bantu. Kontrol dan kemajuan tetap tersedia.
- `placement`: `auto`, `top`, `bottom`, `left`, atau `right`; `padding`: 0–40 piksel. Posisi mengikuti gulir bertingkat, perubahan ukuran dan tata letak, serta viewport visual. Target awal di luar layar digulirkan ke tampilan; guliran pengguna sesudahnya tetap dihormati.
- `interaction`: `free` atau `target`. Pemblokiran membatasi pointer, sentuhan, dan keyboard pada target serta kontrol tutorial tanpa mengaktifkan kontrol nonaktif atau menggantikan otorisasi.
- `advance`: event `click`, `change`, `input`, `submit`, atau `keydown`, dengan `key` serta predikat sinkron/asinkron `accept(event)` opsional. Input berulang hanya memajukan sekali. Predikat asinkron harus menghasilkan `true`.
- `enter({ signal, target, stepId })` adalah kode persiapan tepercaya dan dapat mengembalikan fungsi pembersihan. `waitFor` menerima konteks yang sama dan memajukan setelah terpenuhi. Keduanya dibatasi lima belas detik dan dibatalkan bersama langkah. Kegagalan pembersihan asinkron dicatat; pekerjaan milik pemilik harus mematuhi signal.
- `route` adalah jalur internal tanpa data kueri atau callback tepercaya yang menghasilkannya. `ui:navigate` mempertahankan otorisasi, aturan luring, dan penjaga perubahan belum disimpan. Study menentukan jalurnya melalui `study:tutorialTargets.route({ language, area })`, dengan area `overview`, `explore`, atau `flashcards`.
- `missing` memuat `timeoutMs` 0–15000, bawaan 5000, dan `action`: `cancel`, `skip`, atau `retry`. Skip melewati langkah yang hilang; Retry menampilkan tombol coba lagi. Menunggu tidak mengunci halaman.

Definisi memerlukan versi 1, ID langkah unik, judul terlokalisasi, dan paling banyak 100 langkah. Versi, field, atau opsi yang tidak didukung ditolak. Callback adalah kode komponen tepercaya; jangan mengevaluasi string skrip unduhan.

## Sesi dan Flow

`await owner.register(play)` menghasilkan `{ id, start, dispose }`. `await tutorials.list()` membaca katalog yang diizinkan; `openCatalog()` memakai popup keputusan yang ada dan menggabungkan permintaan berulang. `await tutorials.start(id)` atau `start()` menghasilkan `ready`, `finished`, `state()`, `next()`, `back()`, `retry()`, `skip()`, `cancel()`, dan `dispose()`. `current()` merupakan snapshot hanya baca. Skip mengakhiri seluruh panduan; pembatalan dan pembersihan bersifat idempoten.

Hanya satu sesi yang aktif. Mulai bersamaan ditolak kecuali `{ replace: true }` secara eksplisit membatalkan sesi lama. Registrasi, publikasi target, katalog, mulai, dan aksi langkah memakai flow `ui:tutorial:<action>` dengan tahap `validate`, `execute`, dan `after`. Konsumen tidak boleh melewati kontrak ini.

Navigasi lain, Kembali/Maju browser, Escape, hilangnya izin, pelepasan pemilik, dan popup wajib mengakhiri sesi. Langkah rute eksplisit dapat melanjutkan setelah transisi SPA disetujui. Navigasi yang menunggu selalu mempunyai kontrol pembatalan terlihat. Tutorial tidak mengonfirmasi dialog, mengirim formulir berizin khusus, atau memulai panggilan. Dialog wajib mempertahankan prioritas dan aturan penutupannya.

Penyelesaian dan pembatalan menghapus overlay host, listener, observer, timer, serta penantian target, lalu mengembalikan fokus jika sesuai. Callback terlambat tidak menghidupkan langkah lama. Penonaktifan, penghapusan, pembaruan, dan pemasangan penyedia yang gagal membersihkan definisi serta sesi terkait. Kemajuan tidak disimpan; konsumen dapat mengamati `cognis:tutorial-presented` dan `cognis:tutorial-finish`.
