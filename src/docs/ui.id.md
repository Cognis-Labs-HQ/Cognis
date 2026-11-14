# UI

## Ikhtisar

`src/ui/` menjadi tuan rumah frontend browser Cognis. Menyediakan alur kerja studi, permukaan interaksi sosial, panel administrasi, dan browser dokumentasi yang tertanam. UI adalah aplikasi multi-halaman yang di-render oleh server.

Lapisan UI tidak mengetahui gateway atau adapter mana yang terinstal. Sebaliknya, gateway berkontribusi elemen UI saat runtime melalui `UIRegistry` dan API page-extensions.

Semua teks yang terlihat pengguna melewati sistem i18n di `src/ui/reuse/i18n.js`. Tidak ada teks yang dikodekan secara keras di JavaScript atau template HTML.

## Tanggung Jawab

- Menjalankan semua titik masuk halaman dan template HTML terkait.
- Menyediakan shell layout yang digunakan semua halaman non-login untuk merender.
- Memelihara utilitas reuse untuk i18n, page composer, guard perubahan yang belum disimpan.
- Menegakkan paritas tema: setiap elemen menyelesaikan warnanya dari variabel CSS.
- Menyediakan paket string i18n untuk keempat bahasa yang diperlukan.

## Arsitektur

### Struktur Direktori

| Path                | Tujuan                                            |
| ------------------- | ------------------------------------------------- |
| `src/ui/layouts/`   | Shell HTML bersama                                |
| `src/ui/app/`       | Modul JavaScript titik masuk halaman              |
| `src/ui/reuse/`     | Modul utilitas lintas halaman                     |
| `src/ui/styles/`    | CSS: token dasar, layout, aturan spesifik halaman |
| `src/ui/languages/` | Paket string i18n (en, de, ja, id)                |

### Konvensi Kunci i18n

| Awalan               | Penggunaan                                                  |
| -------------------- | ----------------------------------------------------------- |
| `ui.reuse.*`         | Label yang dibagikan di beberapa halaman                    |
| `ui.reuse.generic.*` | Kata aksi mandiri bebas konteks (simpan, buang, atur ulang) |
| `ui.app.<page>.*`    | Teks spesifik halaman                                       |
| `ui.layout.*`        | Teks shell layout dan label ARIA                            |

## Pratinjau Gambar Bersama

Kapabilitas global `ui:imagePreview` menyediakan tampilan gambar mini, pengikatan interaksi, dan tindakan `open` melalui alur terdaftar `ui:imagePreview:open`. Fitur ini juga tersedia melalui `ui:reuse` sebagai `image-preview.js`; penyedianya memuat lembar gaya bersama sebelum menerbitkan kontrol. Tombol gambar membuka gambar asli dalam ukuran alaminya, dibatasi area layar, dengan hanya tombol X standar yang terlihat. Aktivasi papan ketik, Escape, pemulihan fokus, dan penutupan saat tampilan atau penyedia dilepas memakai siklus hidup popup bersama. Pemanggil mengelola URL gambar dan tindakan penghapusan opsional. Library memakai kontrol ini untuk gambar unggahan dan bawaan dalam editor serta galeri detail.

Penyedia pratinjau gambar bersama memuat lembar gayanya sebelum menerbitkan kontrol. Popup khusus gambar menghapus elemen judul dan menyesuaikan gambar asli lanskap, potret, serta panorama ke area layar tanpa gulir horizontal maupun vertikal. Pratinjau detail Library tetap dibatasi 20rem × 18rem; gambar mini editor tetap 8rem × 6rem.

## Navigasi Sesi Responsif

Keluar membersihkan data sesi pribadi tanpa menunggu pemeliharaan rute publik oleh pekerja layanan. Permintaan kebijakan identik memakai satu pertukaran tanpa menggabungkan keputusan akses yang berubah. Pengalih bahasa menunggu penyedia katalog dan menyembunyikan kontrol khusus akun setelah keluar. Salinan router dalam bundel dan yang dimuat langsung berbagi status dokumen, pendengar, dan pembatalan tampilan, termasuk navigasi Pengaturan ke Dasbor.

## Polling Marketplace Ringan

Marketplace memvalidasi ulang satu snapshot khusus administrator di `/api/v1/modules/marketplace-state` setiap lima belas detik. ETag mencakup sumber, status pemasangan, penemuan dalam cache, rekomendasi dan kebutuhan memulai ulang. Jika tidak berubah, respons berupa `304` tanpa isi; halaman mempertahankan katalog siap tampil tanpa mengambil ulang terjemahan atau menggambar ulang. Penemuan sumber berjalan sekali setelah pemasangan halaman, setiap jam, dan setelah perubahan sumber; Refresh manual tetap memaksa pemindaian. Halaman tersembunyi, offline atau sibuk menghentikan polling sementara; pelepasan halaman membatalkan permintaan dan menghapus timer.

Tampilan katalog menyertakan `ui.stringsRevision` yang diturunkan dari konten. `extendI18n(base, stringsBaseUrl, { revision })` dapat menggunakan kembali paket bahasa terautentikasi berversi dalam akun dan sesi yang sama. Revisi baru mengambil teks baru; pergantian identitas menghapus paket privat, respons terlambat tidak dapat mengisi sesi lain, dan pengambilan yang gagal dapat dicoba lagi. Paket publik mempertahankan cache dan pembatalan saat perubahan siklus hidup yang sudah ada.

Feed rekomendasi dibagikan oleh layanan marketplace, menggabungkan pembacaan serentak dan tetap segar selama lima menit. Kegagalan pembaruan mempertahankan daftar terakhir yang berhasil dan menunda percobaan berikutnya satu menit. Perubahan URL konfigurasi memilih hasil tersendiri, sedangkan Refresh manual melewati masa kesegaran.

## Tutorial terpandu

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

`showToast(message, { minRole: "admin" })` membatasi informasi operasional kepada administrator dan pemilik. Peran lain atau tidak dikenal tidak membuat DOM toast, timer, atau callback penutupan. Tanpa `minRole`, umpan balik biasa tetap terlihat oleh semua pengguna. Opsi tampilan ini bukan otorisasi operasi server.

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.

Toast memuat lembar gaya bersama tanpa menunda pembuatan atau penutupan pemberitahuan. Pemberitahuan serentak berbagi siklus dengan maksimal dua percobaan selama lima detik masing-masing. Setelah siklus gagal, pemberitahuan berikutnya dapat mencoba lagi. Tautan eksternal tetap dipertahankan; hanya tautan gagal yang dibuat pemuat toast yang dihapus. Penutupan saat pemuatan tetap berlaku. Target dan alur tutorial halaman tidak berubah.

## Navigasi Papan Ketik Dialog

Setiap dialog memiliki judul aksesibel tersendiri, termasuk konfirmasi perubahan yang belum disimpan dan dialog beberapa halaman. Tab dan Shift+Tab tetap berada di dalam dialog aktif. Mempertahankan draf mengembalikan fokus ke editor; menutup dialog terakhir mengembalikan fokus ke kontrol pembukanya yang masih tersedia, atau ke halaman jika kontrol tersebut sudah hilang. Dialog kosong mempertahankan fokus hingga kontrol tersedia. Pembatalan saat navigasi melepaskan fokus dialog tanpa mengembalikannya ke halaman lama. Animasi penutupan tidak mempertahankan kendali papan ketik. Kontrol bersama ini juga berlaku untuk dialog yang dibuka dari tutorial terpandu.

### Fokus Tutorial Terbatas

Kapabilitas tambahan `ui:popupFocus` mengoordinasikan pemilik dialog melalui `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })`, dan `restore(overlay, preferred)`. Registrasi dilakukan oleh perender dialog. Tutorial hanya mendelegasikan dialog aktif yang diterima secara eksplisit oleh langkah saat ini. Delegasi menyediakan target dan kontrol yang diizinkan, permukaan yang masih terhubung pada dokumen yang sama, serta fungsi fokus. Sinyal pembatalan wajib, penghapusan permukaan, atau penutupan dialog mencabut delegasi. Dialog yang lebih baru tetap memiliki fokus eksklusif, termasuk sebelum animasi pembukaan. Menutup atau mengulang tutorial memulihkan kendali papan ketik biasa tanpa membuka kembali halaman yang telah ditutup. Opsi `openPopup` tidak berubah.

Fungsi `onRevoke` yang wajib menghapus penangan kejadian delegasi secara sinkron sebelum fokus dikembalikan.

Fungsi delegasi bersifat sinkron, dan `contains` harus mengembalikan nilai boolean. Galat, nilai predikat yang tidak valid, hasil asinkron, atau upaya fokus rekursif mencabut delegasi, mencatat metadata diagnostik yang aman, dan memulihkan penanganan fokus biasa. Kegagalan fungsi maupun pencatatan tidak boleh menghambat penutupan dialog atau membiarkan hasilnya tertunda.

## Gestur daftar bahasa

Seret baris bahasa, atau pegangannya pada layar sentuh, ke posisi yang diinginkan dalam daftar pilihan. Titik tengah baris tujuan menentukan penyisipan sebelum atau sesudahnya; area tabel lainnya menambahkan bahasa di akhir. Bahasa Inggris tetap menjadi bahasa cadangan pilihan. Perubahan tetap berupa draf hingga disimpan; membuang perubahan mengembalikan urutan tersimpan. Mode luring mengizinkan pengurutan bahasa pilihan, tetapi tidak mengubah keanggotaannya.

Seret bawaan dan pegangan sentuh/pena di Pengaturan memakai `bindListDropzones` di `src/ui/app/settings/dropzones.js`. Pengendali Pengaturan memiliki selektor, kelayakan, dan fungsi penempatan; fungsi bantu memiliki pemeriksaan tujuan, penanda, penangkapan penunjuk, dan pembatalan. `cancel()` membersihkan gestur sebelum perenderan ulang; `dispose()` atau sinyal yang diberikan menghapus pendengar. Pembatalan, hilangnya penangkapan, Escape, perpindahan halaman, dan penempatan tidak valid tidak menerapkan perubahan. Kegagalan pemeriksaan kelayakan melepaskan gestur sebelum diteruskan; pelepasan penangkapan tidak menerapkan perubahan setelah pembatalan, penghentian pengendali, atau penggantian baris. Tutorial bahasa di Pengaturan mempertahankan sasaran daftar tersedia/pilihan dan menjelaskan alur seret lalu simpan yang sama.

## Pratinjau Gaya Pesan

Tampilan memperlihatkan percakapan fiktif berlabel di bawah Gaya Pesan. Contoh pesan masuk dan keluar memakai tampilan Messages dengan nama serta tanggal dan waktu setempat. Mengganti gaya menampilkan pilihan yang belum disimpan; Simpan menerapkannya dan Buang mengembalikan tata letak tersimpan. Panduan tampilan menyertakan pratinjau hanya saat tersedia. Contoh tidak memuat tautan, tindakan profil, tanda baca pesan, atau percakapan nyata. Jika Messages tidak tersedia, pemilih dan alur preferensi tetap dapat digunakan. Penggambaran ulang bagian mempertahankan pilihan tertunda, dan meninggalkan Pengaturan membatalkan penggambaran yang belum selesai.

Pratinjau Gaya Pesan memerlukan penyedia tampilan versi 2 yang siap. Jika Profile atau Messages tidak tersedia, hanya contoh yang disembunyikan; pemilih dan pilihan yang belum disimpan tetap dapat digunakan. Pilihan saat ini muncul otomatis saat penyedia pulih. Langkah tutorial pratinjau opsional mengikuti area terlihat yang sama. Rilis aset Settings yang sesuai bersama Messages 2.8.1 dan Profile 3.0.19.

## Hasil tindakan modul

Aktifkan dan Nonaktifkan tetap sibuk selama permintaan perubahan dan pemeriksaan status lanjutannya berjalan. Pembacaan status menetapkan status yang diamati saat ini, bukan membuktikan bahwa permintaan ini diterapkan. Meninggalkan halaman Modul tidak membatalkan perubahan yang sudah dikirim. Halaman lama tidak boleh menampilkan umpan balik terlambat atau mengubah tampilan pengganti. Pergantian akun membatalkan wewenang pekerjaan antrean dan hasil terlambat. Respons yang hilang memicu satu pembacaan status baru dengan batas lima detik, tanpa mengulangi perubahan secara otomatis. Jika hasil belum pasti, Periksa status menggantikan tindakan modul. Pembacaan berikutnya dan kunjungan SPA tetap mengunci tindakan jika status yang diamati masih berlawanan. Tindakan kembali hanya setelah status yang diminta diamati. Panduan penyiapan opsional dan pembaruan katalog yang dibatalkan tidak mengubah aktivasi yang telah dikonfirmasi menjadi penolakan. Pembatalan konfigurasi wajib tetap membatalkan aktivasi satu kali. Jika respons pembatalan hilang, hasilnya dicocokkan sebagai nonaktif hanya ketika pembacaan otoritatif menunjukkan status nonaktif. Jika tidak, hasilnya tetap belum pasti.

Tutorial marketplace menyertakan Periksa status hanya jika kontrolnya tersedia dan melewati tindakan biasa ketika hasil belum pasti. Identitas pemilik dan penyelesaian serta masa aktif popup dan tutorial konfigurasi tetap dipertahankan. Halaman Modul tidak memiliki paket komponen atau manifes berversi tersendiri. Versi dan hash API, Core, serta penyedia opsional tidak berubah.

Peristiwa hasil rekonsiliasi ditandai observed-state, berbeda dari acknowledged-response. Status yang diamati tidak membuktikan bahwa permintaan ini diterapkan. API tidak menyediakan tanda terima operasi yang persisten. Kepemilikan klien yang belum terselesaikan dipertahankan antar-mount SPA, bukan setelah pemuatan ulang browser penuh. Setelah itu hanya status server saat ini tersedia; hasil akhir permintaan sebelumnya dan bootstrap Study nyata belum dapat dipastikan.

Modul tidak dapat memenuhi dependensi selama tindakan modul masih berjalan atau hasilnya belum pasti, termasuk penonaktifan dan pembatalan penyiapan. Tindakan berulang dan kunjungan SPA mempertahankan batasan ini, dan aktivasi dalam antrean memeriksa kesiapan lagi saat mulai dijalankan tanpa mengulangi pilihan dependensi opsional. Aktivasi yang diamati tetap berbeda dari penyiapan yang selesai; pembatalan yang ditolak juga membuat penyiapan belum selesai. Menyimpan pengaturan dapat mengonfirmasi penyiapan, tetapi tidak menyelesaikan ketidakpastian perubahan. Status nonaktif yang diharapkan dan dibaca secara otoritatif memungkinkan aktivasi eksplisit biasa.

Pengaturan serta tindakan pembaruan dan pergantian kanal memakai pemeriksaan akun, status sibuk, dan hasil yang sama, termasuk aktivasi sementara, penonaktifan, dan pembatalan. Setiap aktivasi dan pemulihan memeriksa kembali dependensi yang dipilih. Pemulihan setelah instalasi hanya diizinkan setelah penolakan pengajuan yang pasti atau hasil akhir pekerjaan yang telah dikonfirmasi. Respons pengajuan atau status yang hilang serta tanda terima pekerjaan yang tidak tersedia tetap belum pasti, tanpa pemulihan atau pengulangan. Instalasi dengan hasil yang hilang tetap diblokir selama sesi halaman. Periksa status memperbarui katalog, tetapi tidak membuktikan pekerjaan telah selesai. Pemuatan ulang penuh membuang ketidakpastian lokal ini tanpa membuktikan penyelesaian; tanda terima persisten dan pemulihan setelah pemuatan ulang penuh tidak ditambahkan.
