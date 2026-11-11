# Tutorial Terpandu

Tutorial terikat ke halaman atau tampilan terlihat. Pada kunjungan pertama yang memenuhi syarat, satu panduan yang belum dilihat dimulai otomatis. SVG tanda tanya di samping judul membuka panduan yang tersedia. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip.

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
                    highlightNext: false,
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

Study menyediakan `study:tutorialTargets.matchesPage({ pathname, language })` untuk pengantar bahasa pada ringkasan. Panduan aktivitas terikat ke tampilan host aktif; berpindah Kana ke Kanji tidak boleh memulai pengantar bahasa atau kembali ke Study. Komposer menerbitkan pemasangan selesai melalui `page:mounted` (`publish`).

## Target dan Lokalisasi

Nama target menjadi `owner:name`. Target bersifat privat kecuali diterbitkan dengan `public: true`; komponen lain menggunakan ID semantik, bukan selector privat. ID pemilik, panduan, dan target yang ganda ditolak. Resolver mengembalikan tepat satu elemen dalam dokumen yang sama atau `null`; jangan menyimpan node halaman secara permanen. `root` membatasi pencarian dan `signal` tambahan dapat memperpendek masa hidup. Target tersembunyi, inert, atau nonaktif tidak tersedia. Penarikan target yang sedang dipakai menghentikan sesi terkait.

Resolver dijalankan ulang setelah penggantian dan selama tampilan aktif. Target Shadow DOM terbuka didukung jika root yang dinyatakan mencakup host-nya. Root tertutup dan isi frame tidak didukung. Elemen tertanam tidak boleh berada dalam target yang memblokir karena host tidak dapat menegakkan aturan input di dalamnya. Portal memerlukan root yang diterbitkan secara eksplisit dalam dokumen yang sama.

`stringsBaseUrls` memakai katalog host dengan cadangan bahasa Inggris. Katalog dan pemutaran ulang membaca bahasa tampilan saat ini tanpa memuat ulang halaman. Alternatifnya, `i18n` dapat berupa resolver atau pembuat resolver asinkron. Terjemahan wajib yang hilang menggagalkan registrasi atau operasi. Semua teks dirender sebagai teks biasa, tidak pernah sebagai HTML.

## Opsi Langkah

- `effects` mengaktifkan `callout`, `arrow`, dan `spotlight` secara terpisah. Teks aktif secara bawaan; dua efek lainnya tidak. Penjelasan yang disembunyikan secara visual tetap dapat diakses teknologi bantu. Kontrol dan kemajuan tetap tersedia.
- `placement`: `auto`, `top`, `bottom`, `left`, atau `right`; `padding`: 0–40 piksel. Posisi mengikuti gulir bertingkat, perubahan ukuran dan tata letak, serta viewport visual. Target awal di luar layar digulirkan ke tampilan; guliran pengguna sesudahnya tetap dihormati.
- `interaction`: `none` (bawaan langkah penjelasan), `free`, atau `target`. `none` melindungi area sorotan serta memblokir aktivasi halaman dan penangan hover JavaScript, sementara kontrol tutorial tetap tersedia. `target` mengizinkan aktivasi penunjuk, sentuhan, dan papan ketik dalam target serta kontrol tutorial. Langkah dengan `advance` memakai `target` secara bawaan; `none` tidak boleh mensyaratkan peristiwa interaksi.
- `suppressHover`: boolean opsional untuk langkah interaktif. Gunakan true bersama `interaction: "target"` untuk mengizinkan klik dan aktivasi papan ketik pada target sambil mencegah penangan hover JavaScript. Pembuka notifikasi dan menu akun memakainya; interaksi halaman lainnya tetap dibatasi.
- `layer`: `page` (bawaan) atau `overlay` untuk langkah yang sengaja menargetkan permukaan sementara seperti pencari. Dialog keputusan wajib tetap mengakhiri sesi. `enter` dan `waitFor` juga menerima `sessionSignal`, yang tetap aktif lintas langkah dan dibatalkan saat selesai, dibatalkan, atau pemilik dilepas.
- `group`: pengenal semantik opsional untuk langkah berdekatan yang berbagi permukaan sementara. `enter` dan `waitFor` menerima `groupSignal`, yang dibatalkan sebelum meninggalkan grup, saat sesi berakhir, atau ketika kembali ke langkah pertama grup. Ikat pencari ke sinyal ini agar melewati langkah Tutup tetap melepaskannya sebelum panduan akun.
- `preventNavigation`: boolean opsional untuk memblokir aktivasi tautan dan navigasi router selama langkah aktif, termasuk perpindahan riwayat yang dikelola router. Nilai bawaan false. Transisi `route` milik tutorial tetap tersedia. Perpindahan langkah dan pelepasan mengakhiri penjagaan. Panduan Dasbor mengaktifkannya agar sorotan navigasi tidak membawa pengguna ke halaman lain.
- `advance`: event `click`, `change`, `input`, `submit`, atau `keydown`, dengan `key` serta predikat sinkron/asinkron `accept(event)` opsional. Input berulang hanya memajukan sekali. Predikat asinkron harus menghasilkan `true`.
- `enter({ signal, target, stepId })` adalah kode persiapan tepercaya dan dapat mengembalikan fungsi pembersihan. `waitFor` menerima konteks yang sama dan memajukan setelah terpenuhi. Keduanya dibatasi lima belas detik dan dibatalkan bersama langkah. Kegagalan pembersihan asinkron dicatat; pekerjaan milik pemilik harus mematuhi signal.
- `route` adalah jalur internal tanpa data kueri atau callback tepercaya yang menghasilkannya. `ui:navigate` mempertahankan otorisasi, aturan luring, dan penjaga perubahan belum disimpan. Study menentukan jalurnya melalui `study:tutorialTargets.route({ language, area })`, dengan area `overview`, `explore`, atau `flashcards`.
- `missing` memuat `timeoutMs` 0–15000, bawaan 5000, dan `action`: `cancel`, `skip`, atau `retry`. Skip melewati langkah yang hilang; Retry mempertahankan tampilan dengan Mulai Ulang Tutorial dan Berikutnya. Menunggu tidak mengunci halaman.

Definisi memerlukan versi 1, ID langkah unik, judul terlokalisasi, dan paling banyak 100 langkah. Versi, field, atau opsi yang tidak didukung ditolak. Callback adalah kode komponen tepercaya; jangan mengevaluasi string skrip unduhan.

## Sesi dan Flow

`await owner.register(play)` menghasilkan `{ id, start, dispose }`. `await tutorials.list({ page: { pathname } })` membaca panduan yang diizinkan pada halaman itu. `refreshPage()` memperbarui pencarian; `openPage()` memulai satu panduan yang cocok atau menawarkan pilihannya dalam menu mengambang bersama. `start()` menghasilkan `ready`, `finished`, `state()`, `next()`, `back()`, `restart()`, `retry()`, `skip()`, `cancel()`, dan `dispose()`. `current()` merupakan snapshot hanya baca.

Hanya satu sesi aktif. Mulai bersamaan ditolak kecuali `{ replace: true }` secara eksplisit membatalkan sesi lama. Registrasi, target, pencarian, kunjungan halaman, pemutaran ulang, mulai, dan aksi langkah menggunakan flow `ui:tutorial:<action>` dengan tahap `validate`, `execute`, dan `after`. Konsumen tidak boleh melewati kapabilitas ini.

Semua tombol aksi tutorial berada dalam instans terpisah dari menu mengambang bersama. Sesi pertama tidak memiliki Batal atau Lewati; Escape tidak menutupnya. Berikutnya tetap tersedia saat menunggu target, pekerjaan asinkron, atau langkah berbasis peristiwa, sehingga menekannya berulang selalu menyelesaikan panduan. Pemutaran ulang memakai Lewati untuk keluar dari panduan. Navigasi lain, riwayat, perubahan akun atau izin, pelepasan penyedia, dan dialog wajib tetap membersihkan sesi. Tutorial tidak menyetujui dialog, mengirim formulir berizin khusus, atau memulai panggilan.

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
                            highlightNext: true,
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

Dokumentasikan halaman dan persyaratan akses dalam dokumentasi komponen yang sudah ada, tanpa inventaris gabungan terpisah.

## Katalog Tutorial

Katalog bahasa tutorial dimuat dengan revisi berdasarkan kunci terjemahan yang dideklarasikan, terpisah dari pemuatan katalog halaman sebelumnya. Ini mencegah katalog lama dalam memori menolak teks tutorial yang baru diterbitkan. Kontrak panduan yang sama memakai kembali katalog, termasuk saat luring. Teks bahasa pilihan yang tidak tersedia memakai bahasa Inggris; kunci bahasa Inggris yang benar-benar hilang tetap menggagalkan pendaftaran dan membatalkan pemiliknya. Kunci langkah memakai nama topik, bukan urutannya.

## Geometri Sorotan Terlihat

Sorotan memakai irisan terlihat dari sasaran, leluhur yang memotong atau menggulir, dan viewport visual. Sasaran halaman menghindari header serta footer; panduan yang menargetkan kontrol tersebut tetap memakai wilayahnya sendiri. Sasaran besar yang sudah terlihat mempertahankan posisi gulir. Kotak petunjuk mencoba sisi yang tersedia sebelum ditempatkan di dalam sasaran terlihat, dengan panah di luar layar yang menyesatkan disembunyikan. Kontrol tutorial menyisihkan ruang sendiri agar teks terjemahan panjang dapat digulir tanpa menutupi tombol navigasi.

Instans menu mengambang bersama mempertahankan tema, batas, tombol, jarak, dan blur latar standarnya. Menu berada di atas peredupan tutorial, termasuk pemilih pengulangan dari judul halaman. Peredupan mengecualikan target, kontrol mengambang, dan banner siaran; panel memberi ruang di bawah banner yang terlihat. Kontrol tetap berada dalam viewport pada tema terang dan gelap.

Teks tutorial menjelaskan tugas dan kontrol yang tersedia tanpa pernyataan tidak relevan tentang izin atau tindakan yang tidak dilakukan panduan.

## Kesiapan Halaman

Host menjalankan `page:ready` setelah `page:mounted`, dengan tahap `prepare`, `blocking`, `ready`, dan `afterReady`. Perenderan selesai sementara tahap pemblokiran menunggu pekerjaan awal. Penyiapan login tertunda bergabung sebelum catatan rilis. Pemilik Changelogs menunggu preferensi, permintaan metadata, dan penutupan popup sebelum kesiapan diterbitkan. Pembatalan menutup popup lama tanpa menyimpan tanda sudah dibaca. Tutorial otomatis dan pengulangan dari judul halaman tetap ditunda sampai siap. Navigasi membatalkan halaman lama sehingga pekerjaan terlambat tidak dapat menyatakan halaman pengganti siap.

Pemilik popup berikutnya dapat menambahkan pemblokir sebelum halaman dipasang melalui `registerPageReadinessBlocker` dari modul bersama `page-readiness.js`. Berikan `id` unik pemilik, `order` opsional, dan `signal` milik pemilik. Kembalikan promise yang selesai saat pemeriksaan atau popup selesai. Callback menerima `input.signal` yang menggabungkan pembatalan halaman dan pemilik. Registrasi aman diganti dan dibersihkan bersama pemiliknya. Konsumen memakai `ui:pageReadiness.isReady()` atau tahap `afterReady` untuk menunda notifikasi serta tindakan halaman lainnya.

## Panel Dan Tindakan Dasbor

Panduan Dasbor memiliki hingga 18 langkah dan membuka panel notifikasi serta menu akun melalui penangan klik aslinya. Latihan klik mencegah hover, sedangkan penjelasan panel dan menu membiarkan tindakan penghapusan atau navigasi tidak aktif. Menu akun menjelaskan Pengaturan, Dokumentasi, tautan administrasi sesuai peran, dan Keluar. Panduan juga mencakup dok tindakan halaman, pengalihan bahasa, tampilan, dan penyuntingan tata letak.

Permukaan sementara mendaftarkan elemen, tindakan tutup, dan sinyal pemilik melalui `ui:transientSurfaces.register(element, close, signal)`. Panduan memakai `attachLifetime(element, groupSignal)` untuk melepaskan pencari, panel notifikasi, atau menu yang cocok saat grup berakhir. Klik tindakan tutorial tidak mencapai penangan klik luar di latar, sehingga menu tetap terbuka selama penjelasannya.

Kontrol yang tidak tersedia dengan `missing.action: "skip"` dilewati pada kunjungan pertama maupun pengulangan, termasuk entri menu yang disembunyikan berdasarkan peran.

Jalur langkah mendukung `minRole`, predikat boolean sinkron `when({ firstTime, completed, skipped, targetAvailable })`, dan `dependsOn: ["earlier-step-id"]`. Langkah tanpa izin atau dengan kondisi salah tidak masuk hitungan kemajuan. Dependensi harus menunjuk langkah sebelumnya; referensi tidak dikenal, duplikat, diri sendiri, dan langkah berikutnya ditolak. Langkah interaktif memenuhi dependensi hanya setelah peristiwa atau kondisi tunggunya berhasil. Memilih Berikutnya melewati cabang dependennya; langkah statis dipenuhi dengan Berikutnya. Kondisi menerima salinan hasil yang tidak dapat diubah. Jumlah mencerminkan jalur yang tersedia dan dapat bertambah ketika interaksi membuka cabang. Kembali menghapus hasil mulai dari tujuannya. `restart()` dan Mulai Ulang Tutorial menghapus seluruh hasil dan menutup permukaan sementara dalam sesi yang sama. Cabang Pencarian, notifikasi, dan akun memerlukan pembukaan kontrol terkait. Administrasi memerlukan `minRole: "admin"`; kontrol dok opsional disaring menurut visibilitas. Sorotan mengikuti ukuran dok aktual, termasuk bagian di bawah batas footer, sementara balon penjelasan tetap memakai area tampilan yang dicadangkan.

Tombol, tautan, dan aktivasi papan ketik pada banner tetap tersedia. Aktivasi menghentikan tutorial melalui `ui:tutorial:priority` sebelum dialog atau navigasi milik tindakan berjalan. Kontrol banner dapat dicapai dengan Tab.

Langkah overlay pencarian memakai area tampilan overlay agar header dan footer tidak memotong sorotan input. Klik pil penyempurnaan mana pun menyelesaikan latihan filter. Langkah yang memerlukan Berikutnya atau Selesai menyoroti tindakan itu hanya dengan animasi berdenyut tanpa garis permanen; pengurangan gerakan menonaktifkan animasi. Langkah yang menunggu atau maju otomatis tidak menampilkan isyarat ini.

Setiap langkah tutorial kini menetapkan `highlightNext` secara eksplisit: penjelasan yang memerlukan Berikutnya atau Selesai mengaktifkannya, sedangkan latihan berbasis interaksi atau penantian menonaktifkannya. Pengurangan gerakan menonaktifkan animasi; fokus papan ketik normal tetap terlihat. Semua tutorial ditinjau, termasuk hasil pencarian dan penjelasan notifikasi.

Boolean opsional `highlightNext` bernilai `false` secara bawaan; host tidak menyimpulkannya dari interaksi atau kondisi tunggu. Tetapkan secara eksplisit dalam definisi langkah. Isyarat aktif muncul setelah persiapan dan menghormati pengurangan gerakan.

Kembali dari luar grup langkah atau cabang dependensi yang selesai akan menuju pembukanya dan menghapus hasil cabang. Di dalam cabang, Kembali tetap berurutan. Ini mencegah kunjungan ulang ke panel Pencarian yang sudah ditutup lalu melompat otomatis ke akhir.

Langkah halaman dapat memakai `targetMatch: "first"` untuk memilih kecocokan pertama yang terlihat dan dapat digunakan dalam bagian yang ditetapkan. Pencocokan unik tetap menjadi bawaan. Target yang hilang atau nonaktif mengikuti kebijakan pelewatan penulis. Sorotan tindakan kini mengarah ke sakelar yang dapat diubah, pemilih peran, kuota, pengujian notifikasi, kontrol berbagi, rekaman, dan tindakan modul. Komponen menyorot sakelar daya yang dapat diubah; kontrol wajib dan tersembunyi dikecualikan.

Mulai Ulang Tutorial tersedia setelah langkah terlihat pertama; tombol Coba Lagi tidak ditampilkan. Langkah pengantar menyoroti bagian yang dirujuk, termasuk daftar rapat Jitsi kosong dan Cari Peserta. Penyedia pembelajaran memakai target bahasa Study dan ruang kerja publik yang terdaftar. `highlightNext` tetap aktif untuk penjelasan dan nonaktif untuk langkah berbasis peristiwa.

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.

Balon penjelasan tetap memakai kontrol dok yang terlihat di bawah ruang menu sebagai jangkar dan menghindari menu tindakan yang sebenarnya. Langkah pemutaran ulang menyoroti tombol ? itu sendiri. Tombol mempertahankan warna teks tema selama tutorial; pemutaran ulang tidak mengganti panduan yang aktif.

Penyelesaian terikat pada akun dan ID pemilik/tutorial yang stabil. Pembaruan isi dan paket tidak pernah mengatur ulang penyelesaian. Tutorial yang selesai hanya diulang melalui kontrol ? di judul halaman. Pertahankan ID saat merevisi panduan; penyelesaian tetap disimpan di penyimpanan peramban akun. Setiap sesi yang berhasil menyimpan penyelesaian sebelum penemuan halaman dilanjutkan, termasuk panduan yang dimulai langsung melalui handle publik penyedia.

Mulai Ulang Tutorial muncul setelah langkah terlihat pertama. Pemutaran ulang menyediakan Lewati sebelum langkah terlihat terakhir; langkah terakhir menyediakan Selesai. Panduan satu langkah tidak menyediakan Mulai Ulang Tutorial atau Lewati. Panduan pertama tetap tidak menyediakan Lewati.

Tombol ? sejajar dengan judul halaman. Tombol tidak memiliki tooltip saat diarahkan dan tetap memakai label aksesibel yang dilokalkan.

Target yang hilang saat perenderan asinkron dicari ulang sebelum kesiapan diterbitkan. Penyajian yang dimulai ulang atau dibatalkan tidak dapat melanjutkan pemulihan lama atau menahan menu mengambang.

`scope` membatasi target dan penemuan. `visibleWhen` opsional memerlukan satu elemen terlihat tanpa membatasi target ke turunannya; target tetap berada dalam akar komponen. Administrasi Pustaka memakainya untuk visibilitas browser sambil menyoroti pencarian di bilah samping. Selektor tidak valid menggagalkan registrasi dan membersihkan pemilik.

## Panduan yang Andal

Ikat penemuan ke tampilan aktif, bukan hanya URL. Tab pada URL sama, dek terpilih, lapisan konten, dan dialog memerlukan penanda terlihat milik komponen. `scope` harus memuat semua target; gunakan `visibleWhen` jika kontrol samping berada di luar bagian konten. ID elemen komposer adalah metadata tata letak, bukan jaminan ID DOM. Targetkan elemen fitur nyata. Untuk sakelar bergaya, sorot label terlihat, bukan input tersembunyi.

Hanya satu panduan dimulai otomatis per tampilan terlihat dalam satu sesi browser. Menyelesaikannya tidak mengantrekan panduan lain; semuanya tetap tersedia melalui ?. Pergantian bagian dapat menemukan panduan bagian tersebut. Gunakan `automatic: false` untuk pengantar tambahan. Pertahankan ID penyelesaian dan jangan arahkan pengunjung Explore kembali ke ringkasan hanya untuk pengantar. Pengantar bahasa terikat ke ringkasan Study; host memiliki panduan aktivitas.

Ikuti urutan UI kecuali ketergantungan interaksi memerlukan urutan berbeda. Setiap tahap menyorot kontrol atau area berbeda. Gabungkan penjelasan berulang. Jelaskan tujuan dan hasil bagi pengguna. Jangan menjelaskan Simpan/Buang atau Tinjau Perubahan jika perubahan tidak dapat dibuat. Cakup kalender dan daftar kosong, kontrol opsional, peran, serta fitur yang tidak tersedia.

`targetMatch: "first"` mempertahankan elemen terhubung yang dipilih selama kontribusi terpasang; perubahan urutan akibat sorotan kursor tidak boleh memindahkan panduan ke kartu lain. Target yang sejak awal tidak ada mengikuti kebijakan yang ditulis. Jika target yang sudah ditampilkan hilang, kontrol tetap tersedia dan menunggu pemulihan sampai lima belas detik, lalu Berikutnya atau Mulai Ulang tetap dapat digunakan. Menggulir tidak boleh diam-diam menyelesaikan panduan.

Cabang detail menggunakan `interaction: "target"`, `suppressHover`, gerbang peristiwa, `group`, dan `dependsOn`. Berikutnya sebelum membuka melewati cabang. Selektor opsional `popup` hanya mengizinkan dialog milik fitur yang diharapkan; dialog lain tetap menginterupsi. Kontribusi halaman dapat memakai `portal` untuk membatasi target pada permukaan dokumen sama yang dipilih secara eksplisit. Halaman pemilik harus tetap tersedia. Ikat penutupan ke `groupSignal` agar Kembali, Mulai Ulang, Selesai, navigasi, dan pelepasan pemilik membersihkannya. Penjelasan pasif memakai `layer: "overlay"` di atas dialog tanpa mengubah data.

Shell menutup menu akun pada tahap validasi awal tutorial, termasuk awal langsung oleh penyedia. Kepemilikan pemblokir kesiapan berada pada `ui:pageReadiness.registerBlocker(options, handler)`, bersama untuk impor bundel dan langsung. Gunakan metode ini atau `registerPageReadinessBlocker`; ganti berdasarkan ID pemilik dan jaga agar pembatalan lama tidak menghapus pengganti. Jangan gunakan peta registrasi lokal yang saling bersaing.

Verifikasi target hasil render dan progres melalui kontrak publik pada build sumber dan produksi: pemasangan langsung dan SPA berulang, perubahan bagian tanpa URL baru, data kosong dan terisi, gulir/perubahan tata letak, sorotan kursor, kontrol opsional, hilangnya peran, cabang yang dilewati dan Kembali, mulai ulang, pelepasan pemilik, serta penutupan dialog. Periksa hitungan tahap dan serah-terima menu. Pemeriksaan demo browser tetap sementara; pembantu pengujian otomatis bersama dipertahankan. Perubahan fitur harus meninjau panduan, terjemahan, dan dokumentasi milik komponennya bersama.

Callback enter/waitFor tepercaya menerima ctx publik beserta sinyal masa hidup. Ambil perilaku bersama melalui kapabilitasnya. Dialog fitur mendaftarkan elemen, operasi penutupan pemilik, dan sinyal melalui ui:transientSurfaces; cabang detail mengikat groupSignal melalui kontrak itu, bukan mencari tombol internal dialog.

Target portal dialog hanya diselesaikan dalam modal aktif yang diharapkan. Overlay yang ditutup dapat tetap terhubung selama animasi keluar; overlay itu tidak boleh menjadi target atau memengaruhi hitungan kontrol opsional cabang berikutnya. Uji Kembali, buka ulang, dan Mulai Ulang dengan cepat pada build produksi maupun sumber.

Kondisi menerima targetAvailable sebagai boolean tetap yang diselesaikan melalui target tahap dengan otorisasi pemilik. Nilainya salah untuk target hilang, tersembunyi, nonaktif, atau portal tidak aktif. Gunakan untuk aksi opsional, bukan memeriksa kelas modal komponen lain.

Mulai Ulang Tutorial menjadi aksi pertama pada menu mengambang dan memakai gaya btn-cancel. Aksi ini tetap tersembunyi pada langkah terlihat pertama.

Periksa target pada UI yang dirender dengan data terisi maupun kosong. Selektor harus mengenali satu area konkret yang terlihat; bedakan bagian berulang dengan penanda semantik milik komponen dan sesuaikan sorotan dengan kontrolnya. Aksi opsional yang tidak tersedia tidak dihitung sebagai langkah. Panduan modul bahasa hanya ditawarkan untuk bahasa yang didaftarkan secara eksplisit; kunjungan langsung bukan pendaftaran. Gunakan cabang interaksi untuk membuka detail dan pengaturan: Berikutnya melewati cabang yang belum dibuka, Kembali menuju awalnya. Jika komponen mencegah aksi klik bawaan, advance.accept harus memeriksa keadaan hasilnya. Jelaskan aksi berguna dan hasilnya, bukan perlindungan implementasi. Pilihan panduan memakai animasi berdenyut yang sama dengan Berikutnya dan menghormati preferensi gerakan.

Langkah kartu terkait memakai wadah targetScope yang stabil: kontrol favorit dan detail kartu harus merujuk contoh yang sama setelah pengurutan berubah. targetScope adalah selektor CSS milik halaman yang digunakan bersama dan tidak boleh digabung dengan portal. Periksa warna animasi terhitung untuk pilihan panduan di luar lapisan panduan aktif; Batal tetap tanpa animasi. Contoh konfigurasi harus memiliki bidang skema yang dapat diedit; endpoint saja tidak membuktikannya. Hilangkan pengelolaan ruang jika belum ada percakapan dan tempatkan aksi sosial profil sebelum langkah posting yang berurutan.

Target contoh dan lingkup kartu bersama direset pada setiap sesi ulang baru, sementara Kembali dan Mulai Ulang mempertahankan contoh sesi saat ini. Uji pemutaran ulang setelah menyembunyikan kartu lama tanpa melepasnya dari DOM. Jangan mengganti kontrol dalam menu antre dengan label terdekat; hilangkan langkah saat kontrol aslinya tidak dapat ditampilkan. Editor adaptor yang dibuka melalui API popup terinjeksi berbagi target konten dan masa aktif milik host, termasuk editor khusus dan formulir multihalaman. Pertahankan callback onOpen dan perlindungan perubahan; dialog konfirmasi bersarang tetap memiliki identitas modal sendiri.

## Panduan Konten Bahasa

`automatic` menerima boolean atau predikat sinkron `({ pathname }) => boolean`. Penemuan mengevaluasinya tanpa navigasi. Panduan dapat dipilih manual dari ringkasan dan hanya dimulai otomatis di halaman kontennya. Pertahankan pemilik dan ID agar penyelesaian sebelumnya tetap berlaku.

Gunakan `backTo: "earlier-step-id"` saat cabang menggantikan tampilan pembukanya, misalnya dialog kartu menjadi kanvas. Kembali akan menuju langkah pembuka sebelumnya dan menghapus hasil setelahnya, bukan menyorot dialog yang sudah ditutup.

Pisahkan navigasi ringkasan dari panduan aktivitas. Varian bahasa menggantikan panduan umum pada tampilan yang sama, bukan mengantre setelahnya. Buka kartu, kanvas, dan editor melalui tindakan pengguna yang nyata. Berikutnya melewati cabang yang belum dibuka. Ikat tampilan sementara ke masa hidup grup agar Kembali, Mulai Ulang, selesai, dan penghapusan menutupnya dengan perlindungan perubahan yang belum disimpan. Jangan membuat atau menyimpan kartu contoh secara otomatis.

Hasil pencarian, permintaan, dan administrasi Library menghilangkan langkah khusus rekaman saat tidak ada rekaman terlihat. Kontrol ringkasan tetap tersedia tanpa menunggu target yang tidak ada.
