# Tutorial Terpandu

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

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
            page: "/example",
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

## Ikatan Halaman dan Kunjungan Awal

Setiap panduan memerlukan `page`: jalur tepat seperti `/dashboard` atau predikat sinkron tepercaya `({ pathname }) => boolean` untuk beberapa URL atau kondisi halaman. Ikatan ini terpisah dari navigasi langkah. Mulai di luar ikatan ditolak. Registrasi, pemasangan halaman, pergantian akun, dan penutupan popup memperbarui pencarian. Penyedia yang dilepas menarik aksi bantuannya. Dialog wajib menunda mulai otomatis.

Study menyediakan `study:tutorialTargets.matchesPage({ pathname, language })` agar penyedia bahasa mengikat tutorial pada halaman Explore dan Flashcards milik Study tanpa menyalin aturan rute host. Composer menerbitkan pemasangan halaman selesai melalui `page:mounted` (`publish`).

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

`await owner.register(play)` menghasilkan `{ id, start, dispose }`. `await tutorials.list({ page: { pathname } })` membaca panduan yang diizinkan pada halaman itu. `refreshPage()` memperbarui pencarian; `openPage()` memulai satu panduan yang cocok atau menawarkan pilihannya dalam menu mengambang bersama. `start()` menghasilkan `ready`, `finished`, `state()`, `next()`, `back()`, `retry()`, `skip()`, `cancel()`, dan `dispose()`. `current()` merupakan snapshot hanya baca.

Hanya satu sesi aktif. Mulai bersamaan ditolak kecuali `{ replace: true }` secara eksplisit membatalkan sesi lama. Registrasi, target, pencarian, kunjungan halaman, pemutaran ulang, mulai, dan aksi langkah menggunakan flow `ui:tutorial:<action>` dengan tahap `validate`, `execute`, dan `after`. Konsumen tidak boleh melewati kapabilitas ini.

Semua tombol aksi tutorial berada dalam instans terpisah dari menu mengambang bersama. Sesi pertama tidak memiliki Batal atau Lewati; Escape tidak menutupnya. Berikutnya tetap tersedia saat menunggu target, pekerjaan asinkron, atau langkah berbasis peristiwa, sehingga menekannya berulang selalu menyelesaikan panduan. Pemutaran ulang menyediakan Batal dengan `btn-cancel`. Navigasi lain, riwayat, perubahan akun atau izin, pelepasan penyedia, dan dialog wajib tetap membersihkan sesi. Tutorial tidak menyetujui dialog, mengirim formulir berizin khusus, atau memulai panggilan.

Penyelesaian dan pembatalan menghapus overlay, menu mengambang, listener, observer, dan pekerjaan tertunda, lalu memulihkan fokus jika sesuai. Callback terlambat tidak menghidupkan langkah lama. ID tutorial yang selesai disimpan pada browser ini terpisah untuk setiap akun. Kunjungan awal yang terputus atau gagal tetap memenuhi syarat pada kunjungan berikutnya; kegagalan tidak mengulang otomatis pada halaman aktif. Menghapus penyimpanan browser menjadikannya belum pernah dilihat. Konsumen dapat mengamati `cognis:tutorial-presented` dan `cognis:tutorial-finish`.

## Panduan Milik Komponen

Halaman memberikan kontribusi yang ditulis melalui larik `tutorials` pada composer. Setiap kontribusi menetapkan pemilik, definisi, dan `minRole` opsional; setiap definisi memberikan halaman, teks terlokalisasi, dan selektor milik komponen. `scope` membatasi pencarian pada bagian yang terlihat. Host menerbitkan target bersiklus hidup terbatas dan mendaftar melalui `ui:tutorial:mountPage`. Pelepasan halaman membersihkan panduannya. Penyedia opsional dapat memakai `mountTutorialProvider` dari `ui:reuse` sambil tetap memiliki lokalisasi dan siklus hidupnya.

```js
createPageComposer(root, {
    signal,
    i18n,
    pageContext,
    elements,
    tutorials: [
        {
            owner: "example.page",
            minRole: "admin",
            definitions: [
                {
                    id: "review",
                    page: "/example",
                    scope: ".example-panel",
                    titleKey: "example.tutorial.title",
                    steps: [
                        {
                            id: "options",
                            selector: ".example-options",
                            titleKey: "example.tutorial.options.title",
                            bodyKey: "example.tutorial.options.body",
                        },
                    ],
                },
            ],
        },
    ],
});
```

[Cakupan Tutorial](/docs/tutorials-coverage)
