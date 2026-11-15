# Referensi Teknis

Antarmuka publik dan aturan operasional UI.

## Antarmuka

UIRegistry menerbitkan direktori aset, plugin navigasi, bagian administrasi, dan perluasan halaman. Penyedia peramban memakai uiCtx serta sinyal pembersihan; halaman memakai Page Composer.

## Konfigurasi

Preferensi akun memilih tema, bahasa, dan font. Katalog komponen menyediakan terjemahan dan metadata; opsi tata letak tetap pada Page Composer.

## Perilaku

Pemulihan koneksi membatalkan cache terjemahan inti dan komponen sebelum halaman digambar ulang. Permintaan pembaruan mengambil konten server terbaru sambil mempertahankan salinan luring lengkap saat terjadi gangguan. Respons XML yang tidak valid tidak disimpan sehingga pemuatan berikutnya dapat pulih tanpa pemuatan ulang penuh.

### Ikhtisar

`src/ui/` menjadi tuan rumah frontend browser Cognis. Menyediakan alur kerja studi, permukaan interaksi sosial, panel administrasi, dan browser dokumentasi yang tertanam. UI adalah aplikasi multi-halaman yang di-render oleh server.

Lapisan UI tidak mengetahui gateway atau adapter mana yang terinstal. Sebaliknya, gateway berkontribusi elemen UI saat runtime melalui `UIRegistry` dan API page-extensions.

Semua teks yang terlihat pengguna melewati sistem i18n di `src/ui/reuse/i18n.js`. Tidak ada teks yang dikodekan secara keras di JavaScript atau template HTML.

### Tanggung Jawab

- Menjalankan semua titik masuk halaman dan template HTML terkait.
- Menyediakan shell layout yang digunakan semua halaman non-login untuk merender.
- Memelihara utilitas reuse untuk i18n, page composer, guard perubahan yang belum disimpan.
- Menegakkan paritas tema: setiap elemen menyelesaikan warnanya dari variabel CSS.
- Menyediakan paket string i18n untuk keempat bahasa yang diperlukan.

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

### Pratinjau Gambar Bersama

Kapabilitas global `ui:imagePreview` menyediakan tampilan gambar mini, pengikatan interaksi, dan tindakan `open` melalui alur terdaftar `ui:imagePreview:open`. Fitur ini juga tersedia melalui `ui:reuse` sebagai `image-preview.js`; penyedianya memuat lembar gaya bersama sebelum menerbitkan kontrol. Tombol gambar membuka gambar asli dalam ukuran alaminya, dibatasi area layar, dengan hanya tombol X standar yang terlihat. Aktivasi papan ketik, Escape, pemulihan fokus, dan penutupan saat tampilan atau penyedia dilepas memakai siklus hidup popup bersama. Pemanggil mengelola URL gambar dan tindakan penghapusan opsional. Library memakai kontrol ini untuk gambar unggahan dan bawaan dalam editor serta galeri detail.

Penyedia pratinjau gambar bersama memuat lembar gayanya sebelum menerbitkan kontrol. Popup khusus gambar menghapus elemen judul dan menyesuaikan gambar asli lanskap, potret, serta panorama ke area layar tanpa gulir horizontal maupun vertikal. Pratinjau detail Library tetap dibatasi 20rem × 18rem; gambar mini editor tetap 8rem × 6rem.

### Navigasi Sesi Responsif

Keluar membersihkan data sesi pribadi tanpa menunggu pemeliharaan rute publik oleh pekerja layanan. Permintaan kebijakan identik memakai satu pertukaran tanpa menggabungkan keputusan akses yang berubah. Pengalih bahasa menunggu penyedia katalog dan menyembunyikan kontrol khusus akun setelah keluar. Salinan router dalam bundel dan yang dimuat langsung berbagi status dokumen, pendengar, dan pembatalan tampilan, termasuk navigasi Pengaturan ke Dasbor.

### Polling Marketplace Ringan

Perilaku ini dijelaskan dalam [kontrak bersama](/docs/api/technical).

### Batalkan Sebelum Pengiriman

Klien luring UI bersama meneruskan AbortSignal pemanggil melalui tahap permintaan terdaftar, pembacaan antrean tertunda, dan penantian pengiriman. Pembatalan sebelum permintaan jaringan atau penulisan antrean permanen dimulai mencegah tindakan baru tersebut. Kotak keluar memeriksa pembatalan lagi di dalam kunci penyimpanannya.

Kontrak tambahan adalah `deliverOrQueue(ctx, owner, id, payload, send, { signal } = {})` dan `outbox.submit(owner, id, payload, { signal } = {})`. Pemanggil tanpa sinyal dan pemutaran ulang tersimpan tetap berperilaku sama. Pembatalan kemudian tidak pernah menghapus catatan antrean yang diterima atau membatalkan permintaan yang sudah dikirim. Konfirmasi yang hilang dapat membuat hasil tidak pasti dan tidak boleh memicu pengiriman ulang tanpa pemeriksaan.

Kontrak ini dimiliki aset UI bersama, bukan paket gateway atau adaptor. Rilis aset bersama yang diperbarui bersama Profile 4.0.1. Profil, Pesan, Kalender, dan email Notify memakai klien HTTP bersama; gambar Study, pustaka, favorit, dan Flashcards juga memakai pembantu pengiriman opsional. Panggilan tanpa sinyal mempertahankan kontrak yang ada. Perilaku waktu jalan Kalender tidak disesuaikan secara khusus.

### Kontrak Pemilihan Pencarian

Pilih hasil dengan penunjuk atau Enter, lalu tunggu tindakannya selesai. Setiap popup hanya mengizinkan satu callback pemilihan selama proses berjalan. Selama pemilik Pencarian masih aktif, galat yang dilempar atau promise yang ditolak mempertahankan kueri, kategori, dan pilihan jamak serta menampilkan toast terjemahan. Periksa tujuan sebelum mencoba lagi: pesan kegagalan tidak membuktikan bahwa operasi belum dikirim. Hasil yang tidak lagi tersedia meminta Anda mencari kembali.

`openSearchPopup` dan `createSearchBar` menerima `signal` opsional dan memberikan konteks pemilihan sebagai argumen kedua callback, termasuk `context.signal`. Callback sinkron dan hasil sukses `undefined` mempertahankan perilakunya; promise ditunggu sebelum popup ditutup setelah sukses. Hanya `false` yang menjadi hasil pembatalan tambahan untuk membiarkan Pencarian terbuka tanpa galat selama pemiliknya masih aktif. Tindakan bagian bawah memakai aktivasi `click` asli, termasuk aktivasi papan ketik dan browser; `mousedown` tidak memanggil callback pemilihan.

Tutup, Escape, perpindahan rute atau pelepasan halaman, berakhirnya masa aktif penyedia, dan pergantian akun membatalkan kewenangan penyelesaian UI yang tertunda. Membatalkan registrasi penyedia hasil membatalkan kewenangan pemilihan miliknya. Penyelesaian lama tidak dapat menutup popup pengganti atau menampilkan pesan terlambat, tetapi pembatalan tidak dapat mengurungkan operasi yang sudah dikirim. Pemanggil harus memberikan sinyal masa aktifnya dan mematuhi sinyal callback sebelum mengirim pekerjaan.

Pemilihan pada bilah navigasi meneruskan hasil `false` dari `navigateTo` sebelum pelepasan rute, sehingga Pencarian tetap terbuka tanpa galat jika navigasi ditolak. Setelah `route-will-change` atau `pagehide` terjadi, Pencarian ditutup sebagai pembatalan siklus hidup meskipun halaman tujuan kemudian gagal dimuat. Umpan balik hasil selanjutnya menjadi tanggung jawab tujuan atau router, bukan popup Pencarian yang sudah ditutup.

Tutorial ruang kerja menjelaskan pemilihan, penantian, dan percobaan ulang yang aman, dengan tetap mempertahankan target, ID penyelesaian, Berikutnya, Kembali, dan pemutaran ulang. Pencarian merupakan UI bersama tanpa paket atau manifes berversi tersendiri.

### Validasi Formulir

Kolom yang telah diperiksa dan dinyatakan tidak valid memiliki `aria-invalid="true"`. Atribut `aria-describedby` menghubungkan kriteria terjemahan yang belum terpenuhi, bersama deskripsi yang diberikan pemanggil. Setelah kolom diperbaiki, pembuat formulir hanya menghapus status tidak valid dan rujukan deskripsinya sendiri. Kontrol yang belum disentuh dan kriteria yang belum dapat ditentukan (`null`) tidak mendapat status ARIA tidak valid sebelum diperiksa. Aturan kolom wajib, opsional, dan nilai hasil validasi tetap berlaku; validitas bawaan peramban dan pemilihan tab tetap terpisah dari kriteria khusus.

Setiap kriteria yang ditampilkan memiliki ID unik, termasuk saat beberapa formulir menggunakan nama kolom yang sama. `detach()` pada pengontrol dan sinyal pembatalan pengaitan menghapus pendengar peristiwa dan status ARIA miliknya; pemanggilan validasi secara eksplisit tetap tersedia. Pemilik halaman dan dialog harus mengakhiri pengaitan saat masa aktif formulir berakhir. Perilaku tampilan ini tidak mencatat nilai kolom.

Perubahan `aria-invalid` oleh pemanggil, termasuk penghapusan, tetap dipertahankan setelah pemeriksaan tidak valid berikutnya serta perbaikan atau pembersihan. Penulisan nilai `true` yang sama oleh pemanggil tidak dapat dibedakan dari nilai pembuat formulir yang sudah ada. Jika kriteria khusus mengakhiri pengaitan, pemeriksaan kolom atau seluruh formulir yang terputus tetap mengembalikan hasil validasinya, tetapi tidak memperbarui tampilan setelah pembersihan. Pemanggilan validasi secara sengaja setelah pembersihan memulai pemeriksaan baru yang dapat dibersihkan kembali.

### Cakupan tutorial

Ikuti persyaratan kolom, perbaiki kriteria yang belum terpenuhi, lalu coba kembali tindakan pada formulir. Tutorial administrasi pendaftaran dan Keamanan mempertahankan kontrol, target, ID penyelesaian, dan navigasi yang ada. Panduan Keamanan sudah menjelaskan persyaratan kata sandi, konfirmasi, dan pembatalan. Validasi bersama tidak menambah tindakan atau langkah tutorial. UI bersama tidak memiliki paket atau manifes dengan versi tersendiri.

## Keamanan

Navigasi tersembunyi bukan kontrol akses. Penyedia memakai kapabilitas pemilik dan membatalkan pekerjaan saat unmount atau pergantian akun; data privat terikat akun.

## Referensi

### Tutorial terpandu

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

`showToast(message, { minRole: "admin" })` membatasi informasi operasional kepada administrator dan pemilik. Peran lain atau tidak dikenal tidak membuat DOM toast, timer, atau callback penutupan. Tanpa `minRole`, umpan balik biasa tetap terlihat oleh semua pengguna. Opsi tampilan ini bukan otorisasi operasi server.

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.

Toast memuat lembar gaya bersama tanpa menunda pembuatan atau penutupan pemberitahuan. Pemberitahuan serentak berbagi siklus dengan maksimal dua percobaan selama lima detik masing-masing. Setelah siklus gagal, pemberitahuan berikutnya dapat mencoba lagi. Tautan eksternal tetap dipertahankan; hanya tautan gagal yang dibuat pemuat toast yang dihapus. Penutupan saat pemuatan tetap berlaku. Target dan alur tutorial halaman tidak berubah.

### Navigasi Papan Ketik Dialog

Setiap dialog memiliki judul aksesibel tersendiri, termasuk konfirmasi perubahan yang belum disimpan dan dialog beberapa halaman. Tab dan Shift+Tab tetap berada di dalam dialog aktif. Mempertahankan draf mengembalikan fokus ke editor; menutup dialog terakhir mengembalikan fokus ke kontrol pembukanya yang masih tersedia, atau ke halaman jika kontrol tersebut sudah hilang. Dialog kosong mempertahankan fokus hingga kontrol tersedia. Pembatalan saat navigasi melepaskan fokus dialog tanpa mengembalikannya ke halaman lama. Animasi penutupan tidak mempertahankan kendali papan ketik. Kontrol bersama ini juga berlaku untuk dialog yang dibuka dari tutorial terpandu.

### Kontrak Tindakan Dialog

Enter dan Spasi mengaktifkan kontrol asli yang sedang difokuskan, sehingga Batal tidak memilih tindakan lain di bagian bawah dialog. Dialog perubahan yang belum disimpan mula-mula memfokuskan Batal yang aman; Buang menggunakan tampilan bahaya. Menahan Enter tidak mengulang aktivasi dialog. Tindakan yang sedang berjalan tidak dapat dikirim ulang; Tutup dan Batal yang dipilih secara langsung tetap tersedia. Kontrol lama atau dialog yang sedang ditutup tidak dapat memanggil tindakan.

Enter biasa pada kolom teks, pencarian, email, URL, telepon, atau kata sandi satu baris di luar formulir asli menggunakan tindakan bawah pertama yang tersedia dengan `variant: "confirm"`. Deskriptor tindakan saat ini menyatakan hasil konstruktif tersebut; kelas CSS dan ID tindakan tidak memberikan kewenangan sebagai tindakan bawaan. Pemanggil harus menandai akibat merusak sebagai `cancel` dan penutupan aman sebagai `neutral`. Pengiriman formulir asli, tombol, tautan, area teks, konten yang dapat diedit, pilihan, kontrol gabungan, kombinasi tombol, dan komposisi IME mempertahankan perilakunya sendiri. Kontrol yang dinonaktifkan, tersembunyi, inert, atau telah dihapus tidak memenuhi syarat.

Bagian bawah awal maupun setelah pergantian halaman menggunakan `button type="button"` asli dengan tepat satu kelas akibat bersama. Tindakan netral, termasuk Selesai, mempertahankan tampilan netral khusus dialog serta memakai aturan pembungkusan teks dan target sentuh bersama. Halaman dapat menambah atau menghapus bagian bawah; tindakan pada isi pengganti memakai siklus hidup callback yang sama. Target tutorial, label, ID penyelesaian, dan perilaku pengulangan tetap sama; Berikutnya dan Kembali mempertahankan tindakan papan ketiknya sendiri. Dialog host bersama tidak memiliki versi komponen atau manifes tersendiri.

Kontrol penyelesaian terdaftar pada isi boleh sengaja disembunyikan dan diaktifkan secara programatis, seperti pada verifikasi email. Kontrol tersebut tidak pernah menjadi tindakan papan ketik bawaan dan tetap mengikuti pemeriksaan aktif, inert, tindakan tertunda, serta masa hidup dialog.

Dialog pembuat formulir dengan `includeSubmitButton: false` menyatakan `data-form-submit="external"`. Kolomnya dapat memakai tindakan bawah yang konstruktif, dan callback tindakan tetap bertanggung jawab atas validasi. Tombol kirim asli atau masukan gambar yang terkait dengan formulir itu didahulukan, termasuk kontrol di luar elemen formulir.

### Fokus Tutorial Terbatas

Kapabilitas tambahan `ui:popupFocus` mengoordinasikan pemilik dialog melalui `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })`, dan `restore(overlay, preferred)`. Registrasi dilakukan oleh perender dialog. Tutorial hanya mendelegasikan dialog aktif yang diterima secara eksplisit oleh langkah saat ini. Delegasi menyediakan target dan kontrol yang diizinkan, permukaan yang masih terhubung pada dokumen yang sama, serta fungsi fokus. Sinyal pembatalan wajib, penghapusan permukaan, atau penutupan dialog mencabut delegasi. Dialog yang lebih baru tetap memiliki fokus eksklusif, termasuk sebelum animasi pembukaan. Menutup atau mengulang tutorial memulihkan kendali papan ketik biasa tanpa membuka kembali halaman yang telah ditutup. Opsi `openPopup` tidak berubah.

Fungsi `onRevoke` yang wajib menghapus penangan kejadian delegasi secara sinkron sebelum fokus dikembalikan.

Fungsi delegasi bersifat sinkron, dan `contains` harus mengembalikan nilai boolean. Galat, nilai predikat yang tidak valid, hasil asinkron, atau upaya fokus rekursif mencabut delegasi, mencatat metadata diagnostik yang aman, dan memulihkan penanganan fokus biasa. Kegagalan fungsi maupun pencatatan tidak boleh menghambat penutupan dialog atau membiarkan hasilnya tertunda.

### Gestur daftar bahasa

Seret baris bahasa, atau pegangannya pada layar sentuh, ke posisi yang diinginkan dalam daftar pilihan. Titik tengah baris tujuan menentukan penyisipan sebelum atau sesudahnya; area tabel lainnya menambahkan bahasa di akhir. Bahasa Inggris tetap menjadi bahasa cadangan pilihan. Perubahan tetap berupa draf hingga disimpan; membuang perubahan mengembalikan urutan tersimpan. Mode luring mengizinkan pengurutan bahasa pilihan, tetapi tidak mengubah keanggotaannya.

Seret bawaan dan pegangan sentuh/pena di Pengaturan memakai `bindListDropzones` di `src/ui/app/settings/dropzones.js`. Pengendali Pengaturan memiliki selektor, kelayakan, dan fungsi penempatan; fungsi bantu memiliki pemeriksaan tujuan, penanda, penangkapan penunjuk, dan pembatalan. `cancel()` membersihkan gestur sebelum perenderan ulang; `dispose()` atau sinyal yang diberikan menghapus pendengar. Pembatalan, hilangnya penangkapan, Escape, perpindahan halaman, dan penempatan tidak valid tidak menerapkan perubahan. Kegagalan pemeriksaan kelayakan melepaskan gestur sebelum diteruskan; pelepasan penangkapan tidak menerapkan perubahan setelah pembatalan, penghentian pengendali, atau penggantian baris. Tutorial bahasa di Pengaturan mempertahankan sasaran daftar tersedia/pilihan dan menjelaskan alur seret lalu simpan yang sama.

### Pratinjau Gaya Pesan

Tampilan memperlihatkan percakapan fiktif berlabel di bawah Gaya Pesan. Contoh pesan masuk dan keluar memakai tampilan Messages dengan nama serta tanggal dan waktu setempat. Mengganti gaya menampilkan pilihan yang belum disimpan; Simpan menerapkannya dan Buang mengembalikan tata letak tersimpan. Panduan tampilan menyertakan pratinjau hanya saat tersedia. Contoh tidak memuat tautan, tindakan profil, tanda baca pesan, atau percakapan nyata. Jika Messages tidak tersedia, pemilih dan alur preferensi tetap dapat digunakan. Penggambaran ulang bagian mempertahankan pilihan tertunda, dan meninggalkan Pengaturan membatalkan penggambaran yang belum selesai.

Pratinjau Gaya Pesan memerlukan penyedia tampilan versi 2 yang siap. Jika Profile atau Messages tidak tersedia, hanya contoh yang disembunyikan; pemilih dan pilihan yang belum disimpan tetap dapat digunakan. Pilihan saat ini muncul otomatis saat penyedia pulih. Langkah tutorial pratinjau opsional mengikuti area terlihat yang sama. Rilis aset Settings yang sesuai bersama Messages 2.8.1 dan Profile 3.0.19.

### Hasil tindakan modul

Aktifkan dan Nonaktifkan tetap sibuk selama permintaan perubahan dan pemeriksaan status lanjutannya berjalan. Pembacaan status menetapkan status yang diamati saat ini, bukan membuktikan bahwa permintaan ini diterapkan. Meninggalkan halaman Modul tidak membatalkan perubahan yang sudah dikirim. Halaman lama tidak boleh menampilkan umpan balik terlambat atau mengubah tampilan pengganti. Pergantian akun membatalkan wewenang pekerjaan antrean dan hasil terlambat. Respons yang hilang memicu satu pembacaan status baru dengan batas lima detik, tanpa mengulangi perubahan secara otomatis. Jika hasil belum pasti, Periksa status menggantikan tindakan modul. Pembacaan berikutnya dan kunjungan SPA tetap mengunci tindakan jika status yang diamati masih berlawanan. Tindakan kembali hanya setelah status yang diminta diamati. Panduan penyiapan opsional dan pembaruan katalog yang dibatalkan tidak mengubah aktivasi yang telah dikonfirmasi menjadi penolakan. Pembatalan konfigurasi wajib tetap membatalkan aktivasi satu kali. Jika respons pembatalan hilang, hasilnya dicocokkan sebagai nonaktif hanya ketika pembacaan otoritatif menunjukkan status nonaktif. Jika tidak, hasilnya tetap belum pasti.

Tutorial marketplace menyertakan Periksa status hanya jika kontrolnya tersedia dan melewati tindakan biasa ketika hasil belum pasti. Identitas pemilik dan penyelesaian serta masa aktif popup dan tutorial konfigurasi tetap dipertahankan. Halaman Modul tidak memiliki paket komponen atau manifes berversi tersendiri. Versi dan hash API, Core, serta penyedia opsional tidak berubah.

Peristiwa hasil rekonsiliasi ditandai observed-state, berbeda dari acknowledged-response. Status yang diamati tidak membuktikan bahwa permintaan ini diterapkan. API tidak menyediakan tanda terima operasi yang persisten. Kepemilikan klien yang belum terselesaikan dipertahankan antar-mount SPA, bukan setelah pemuatan ulang browser penuh. Setelah itu hanya status server saat ini tersedia; hasil akhir permintaan sebelumnya belum dapat dipastikan.

Modul tidak dapat memenuhi dependensi selama tindakan modul masih berjalan atau hasilnya belum pasti, termasuk penonaktifan dan pembatalan penyiapan. Tindakan berulang dan kunjungan SPA mempertahankan batasan ini, dan aktivasi dalam antrean memeriksa kesiapan lagi saat mulai dijalankan tanpa mengulangi pilihan dependensi opsional. Aktivasi yang diamati tetap berbeda dari penyiapan yang selesai; pembatalan yang ditolak juga membuat penyiapan belum selesai. Menyimpan pengaturan dapat mengonfirmasi penyiapan, tetapi tidak menyelesaikan ketidakpastian perubahan. Status nonaktif yang diharapkan dan dibaca secara otoritatif memungkinkan aktivasi eksplisit biasa.

Pengaturan serta tindakan pembaruan dan pergantian kanal memakai pemeriksaan akun, status sibuk, dan hasil yang sama, termasuk aktivasi sementara, penonaktifan, dan pembatalan. Setiap aktivasi dan pemulihan memeriksa kembali dependensi yang dipilih. Pemulihan setelah instalasi hanya diizinkan setelah penolakan pengajuan yang pasti atau hasil akhir pekerjaan yang telah dikonfirmasi. Respons pengajuan atau status yang hilang serta tanda terima pekerjaan yang tidak tersedia tetap belum pasti, tanpa pemulihan atau pengulangan. Instalasi dengan hasil yang hilang tetap diblokir selama sesi halaman. Periksa status memperbarui katalog, tetapi tidak membuktikan pekerjaan telah selesai. Pemuatan ulang penuh membuang ketidakpastian lokal ini tanpa membuktikan penyelesaian; tanda terima persisten dan pemulihan setelah pemuatan ulang penuh tidak tersedia.
