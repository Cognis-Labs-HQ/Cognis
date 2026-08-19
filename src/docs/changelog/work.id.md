# Pulihkan halaman modul terpasang

## Muat rute UI modul eksternal dari direktori pemasangannya

Modul terpasang kini ditemukan berdasarkan UUID stabilnya di direktori modul eksternal. Halaman dan kontribusi navigasi yang dideklarasikan dimuat secara otomatis saat aplikasi dimulai, bukan dicari di jalur modul bawaan.

## Selesaikan bootstrap sebelum permintaan

Cognis kini menunggu pemulihan status modul tersimpan dan bootstrap modul selesai sebelum menerima permintaan. Dengan demikian, skrip dan gaya modul eksternal telah terdaftar sebelum diminta oleh halamannya.

## Sediakan kapabilitas autentikasi

Gateway autentikasi kini menerbitkan fungsi autentikasi permintaan dan akses peran melalui bus kapabilitas. Modul eksternal dapat memulai rute API terlindungi tanpa mengimpor internal gateway, sehingga aset UI dan pendaftaran navigasinya tetap aktif.

## Muat hanya kapabilitas UI yang dinyatakan

Modul dapat menyatakan `requiresCapabilities` dalam manifesnya. Sebelum memasang rute modul, Cognis hanya mengimpor skrip penyedia terdaftar untuk kapabilitas `ui:*` yang dinyatakan, sehingga layanan UI yang diperlukan siap tanpa memberikan integrasi yang tidak terkait.

## Periksa dan dokumentasikan kapabilitas

Owner dapat mencantumkan semua ID kapabilitas terdaftar melalui `GET /api/v1/system/capabilities` atau `cognisctl system:capabilities`. Dokumentasi modul, gateway Autentikasi, dan adapter Profil kini mencatat deklarasi kebutuhan serta kapabilitas yang disediakan setiap penyedia.

## Tampilkan arah versi rilis

Kartu dan tampilan detail modul terpasang kini menempatkan versi saluran terpilih yang berbeda di bawah versi saat ini. Peningkatan memakai panah ke atas, sedangkan penurunan versi yang jarang terjadi memakai panah ke bawah dalam pil oranye muda.

## Pertahankan detail modul stabil

Membuka atau memperbarui tampilan detail modul kini mempertahankan posisi halaman. Setiap versi yang ditampilkan memakai awalan `v`, dan pembaruan modul aktif menjalankan urutan nonaktifkan, pasang, lalu aktifkan kembali dalam satu tindakan.

## Stabilkan kontrol detail modul

Halaman detail modul kini memakai deep link UUID berbasis router sambil tetap berada di Page Composer. Penyegaran siklus hidup mempertahankan susunan tombol yang terlihat, termasuk saat modul aktif dinonaktifkan sementara untuk peningkatan.

## Bootstrap halaman modul langsung sekali

Pemuatan langsung rute SPA modul eksternal kini melalui entrypoint inti yang mengimpor penyedia kapabilitas yang dinyatakan sebelum rute modul. URL penyedia dan rute memakai versi aset yang sama dengan navigasi router, mencegah kapabilitas yang sesekali hilang dan kontribusi navbar ganda.

## Siapkan modul bawaan untuk dipisahkan

Analytics dan Nextcloud Whiteboard kini menjadi repositori modul eksternal mandiri dengan metadata repositori khusus, lisensi, README, inventaris integritas lengkap, panduan distribusi terjemahan, dependensi UUID, dan kebutuhan kapabilitas eksplisit.

## Tingkatkan penjelajahan tangkapan layar modul

Tangkapan layar detail modul kini berada dalam karusel terbatas dengan kontrol sebelumnya dan berikutnya, pratinjau gambar di sebelah yang memudar, transisi animasi, dan rotasi otomatis. Manifes dengan kolom opsional `template: true` tidak ditampilkan dalam hasil marketplace maupun tampilan detail langsung.

## Terapkan modul marketplace yang unik

Analytics dan Nextcloud Whiteboard telah dipindahkan ke repositori khusus dan tidak lagi dibundel. Penemuan marketplace kini menerima repositori pertama untuk setiap UUID modul, mencatat serta menolak duplikat berikutnya, dan memperbarui metadata tampilan dari repositori yang diterima sambil mempertahankan status siklus hidup instalasi.

## Abaikan direktori infrastruktur gateway

Penemuan gateway otomatis kini hanya menjalankan direktori yang memiliki manifes gateway, sehingga direktori infrastruktur `gateways/reuse` tidak lagi diimpor sebagai gateway dalam build produksi.

## Perjelas umpan balik siklus hidup modul

Penonaktifan modul kini dicatat sebagai peringatan dan penghapusan modul eksternal dicatat secara eksplisit. Penyegaran marketplace menampilkan satu pemberitahuan selesai untuk setiap klik, sedangkan modul tetap terlihat kecuali manifesnya secara eksplisit menetapkan `template` ke `true`.

## Rekomendasikan modul Cognis HQ

Daftar rekomendasi bawaan kini memuat UUID modul Jitsi Meet, Nextcloud Whiteboard, dan Analytics yang diterbitkan oleh organisasi Cognis Labs HQ.

## Perluas pencatatan siklus hidup modul

Penambahan, pembaruan, penghapusan, pemindaian sumber modul, serta jumlah hasil pemindaian kini dicatat dengan tingkat yang sesuai, sedangkan kegagalan validasi dan pengaktifan dicatat sebagai kesalahan. Penemuan gambar marketplace juga menggunakan PNG yang cocok atau gambar lain yang didukung ketika manifes menyebut ekstensi yang tidak ada, sehingga gambar Jitsi Meet kembali tampil selama manifesnya masih menunjuk ke berkas SVG yang tidak tersedia.

## Cegah kilatan gambar modul

Kartu modul dan media detail kini tetap tersembunyi sampai setiap gambar yang disegarkan melaporkan dimensi yang valid. Dimensi ikon yang tetap juga menyediakan ruang kartu sebelum pemuatan, sehingga gambar modul mentah atau terlalu besar tidak lagi berkedip saat marketplace disegarkan.

## Pertahankan modul saat pemindaian tidak meyakinkan

Pemindaian marketplace tidak lagi menganggap respons repositori kosong, manifes yang sementara hilang, respons sementara yang tidak valid, atau kegagalan permintaan sumber sebagai bukti bahwa modul yang sebelumnya ditemukan telah dihapus. Entri cache tetap terlihat sampai sumbernya dihapus secara eksplisit, dan log peringatan menunjukkan pemindaian yang gagal serta jumlah modul yang dipertahankan.

## Penemuan modul lebih aman dan efisien

Penyegaran marketplace dipusatkan dalam satu pemindaian terautentikasi, token pengguna GitHub ditambahkan untuk sumber tepercaya, pemeriksaan dependensi dan persetujuan dipulihkan sebelum kode eksternal dijalankan, serta permintaan manifes GitHub Enterprise memakai API yang dikonfigurasi.

## Selesaikan pemuatan modul langsung

Pemuatan langsung halaman Modul kini selalu mengakhiri tugas pemuatan yang dilacak setelah penyusun halaman selesai atau gagal, sehingga roda pemuatan tidak terus terlihat setelah penyegaran browser.

## Simpan dan batasi pemindaian

Setelah server dimulai ulang, data modul terlebih dahulu dimuat dari katalog marketplace yang tersimpan. Pemindaian otomatis saat halaman atau server dimulai tidak lagi memakai kuota penyedia. Percobaan pemindaian disimpan dengan interval satu jam agar penyegaran berulang memakai kembali katalog di cakram.

## Otoritas cache sumber

Sumber bawaan Cognis Labs HQ kini menerima pembaruan PAT sementara bidang identitasnya tetap terkunci. UUID modul duplikat dipilih dari sumber Cognis, dan katalog marketplace, metadata pemindaian, serta aset disimpan di bawah direktori modul yang dikonfigurasi pada .cache.

## Gunakan kredensial GitHub segera

Bidang PAT yang telah dikonfigurasi menampilkan nilai tersamar tanpa mengungkap rahasia. Menyimpan kredensial baru menghapus masa tunggu pemindaian sumber tersebut, sehingga permintaan marketplace berikutnya langsung memakai otorisasi GitHub yang baru.

## Validasi token penyedia

PAT marketplace baru diperiksa terhadap namespace penyedia yang dikonfigurasi sebelum disimpan. Kredensial yang tidak valid, tidak berwenang, tidak dapat diperiksa, atau cakupannya kurang menampilkan peringatan terlokalisasi dan membiarkan editor sumber tetap terbuka.

## Pertahankan konfigurasi PAT

Pengenal kredensial marketplace kini juga disimpan dalam cache direktori modul. Sumber bawaan Cognis memulihkan penanda PAT yang telah dikonfigurasi setelah server atau kontainer dimulai ulang tanpa menyimpan PAT di luar keyring pengguna.

## Rujuk izin PAT

Peringatan kredensial di antarmuka kini ringkas. Log server mencatat masalah validasi secara tepat serta izin GitHub fine-grained yang diperlukan (akses repositori, baca Metadata, baca Contents), cakupan klasik repo untuk repositori privat, otorisasi SSO organisasi, dan rujukan dokumentasi resmi.

## Stabilkan perubahan rilis

Instalasi perubahan kanal rilis, peningkatan, dan penurunan kini menyimpan branch, commit, dan versi yang dipilih sebelum mulai ulang. Peringatan mulai ulang hanya muncul untuk modul yang sebelumnya aktif, modul terdampak menolak tindakan siklus hidup lain hingga mulai ulang, dan perubahan kanal tanpa perubahan atau yang dibatalkan tidak bertabrakan dengan tindakan berikutnya.

## Pertahankan detail modul

Tindakan detail modul kini memakai menu mengambang composer, sedangkan navigasi status dan kategori memakai toolbar samping yang seimbang dan dapat digulir. Pilihan detail bertahan saat penyegaran, peristiwa siklus hidup, dan toast; hanya navigasi eksplisit yang meninggalkan tampilan detail.

## Selaraskan tindakan modul

Tindakan modul mengambang kini memiliki tinggi dan perataan vertikal yang konsisten, termasuk kontrol kembali. Menu hamburger lanjutan tetap berada di header detail agar popup tertambat dengan baik, dan pembaruan tindakan ringan menghindari penggambaran ulang seluruh kartu modul untuk klik yang tidak terkait.

## Petakan tindakan modul dengan jelas

Tindakan pada kartu modul kini dibungkus ke kolom kisi yang mudah dibaca agar label Terpasang, Peningkatan atau Penurunan, Aktifkan, dan Copot tetap terhubung dengan kontrol yang berbeda. Mengaktifkan modul kini mengaktifkan dan menyimpan dependensi gateway yang dinonaktifkan, sedangkan dependensi yang benar-benar tidak tersedia menghasilkan respons khusus yang dapat ditindaklanjuti alih-alih galat 400 umum.

## Segarkan versi kanal rilis

Penyegaran katalog secara eksplisit kini melewati jeda pemindaian penyedia biasa dan membaca ulang setiap manifes cabang. Jika cabang yang dipilih menyamai versi terpasang, Cognis segera menghapus tindakan penurunan versi yang usang. Penurunan versi yang sebenarnya kini memasang cabang terpilih dan melaporkan Menurunkan serta Versi modul diturunkan secara terpisah dari peningkatan.

## Pasang revisi penurunan yang dipilih

Penurunan versi kini memasang commit tepat yang diumumkan katalog terbaru meskipun cabang bergerak maju sebelum pemasangan dimulai. Indikator penurunan memiliki tema gelap khusus, dan header detail modul mendapat latar buram agar gambar banner tidak terlihat menembus header aplikasi yang melekat.

## Selesaikan versi cabang melalui commit

Penemuan marketplace kini membaca setiap manifes cabang dan rilis melalui SHA commit penyedia yang tidak berubah, bukan nama cabang yang dapat berubah. Hal ini menghindari respons usang dari GitHub Contents API atau cache perantara serta menyelaraskan versi katalog, arah pembaruan yang ditampilkan, dan revisi terpasang dengan commit cabang dari penyedia.

## Validasi dependensi modul sebelum pemasangan

Manifes modul kini dapat mendeklarasikan komponen inti yang diperlukan melalui UUID stabil atau ID lama. Cognis memvalidasi manifes otoritatif dari repositori yang telah di-checkout sebelum mengganti modul terpasang; pemasangan gagal dengan galat khusus jika komponen yang dirujuk tidak ada atau dinonaktifkan, sedangkan dependensi UUID aktif dipasang secara normal.

## Selesaikan dependensi UUID adapter

Jitsi Meet dan Nextcloud Whiteboard dengan benar memerlukan UUID adapter Profil Sosial, sedangkan Jitsi juga memerlukan UUID adapter Pesan Sosial. Pemasangan kini menemukan manifes adapter secara otomatis dan menyelesaikan UUID tersebut melalui gateway pemiliknya, menerimanya saat gateway aktif serta menolaknya saat dinonaktifkan atau tidak ada.

## Selesaikan dependensi adapter saat pengaktifan

Pengaktifan modul kini menggunakan katalog komponen inti yang ditemukan seperti pada pemasangan. Persyaratan UUID adapter seperti Profil Sosial dan Pesan Sosial diselesaikan ke gateway Sosial pemiliknya alih-alih salah dilaporkan sebagai gateway yang tidak tersedia.

## Hormati dependensi yang sengaja dinonaktifkan

Mengaktifkan modul tidak lagi mengaktifkan gateway yang dinonaktifkan untuk memenuhi manifesnya. Cognis membiarkan dependensi tetap nonaktif, menolak pengaktifan, dan mengembalikan nama komponen yang mudah dibaca—seperti Profile Adapter atau File Gateway—agar halaman Modul dapat menampilkan pesan koreksi yang jelas.

## Penuhi kartu dengan aksi modul

Tombol aksi kartu modul kini membagi seluruh baris yang tersedia secara merata. Kartu dengan satu, dua, atau tiga aksi tidak lagi menyisakan celah sebesar tombol atau memindahkan satu aksi ke baris berikutnya.

## Stabilkan navigasi SPA modul

Halaman SPA yang disediakan modul kini mempertahankan sesi terautentikasi ketika hanya titik akhir modul yang mengembalikan kesalahan otorisasi; Cognis memverifikasi sesi akun sebelum menganggapnya kedaluwarsa. Menu ketersediaan Profil juga dipasang ulang secara idempoten setelah penyegaran kerangka dasbor dan menunggu lembar gayanya, sehingga kontrol kehadiran tidak hilang atau muncul ganda. Bilah navigasi Modul kini tumbuh hingga tinggi alaminya tanpa bilah gulir vertikal sendiri, sedangkan konten utama yang melampaui tinggi tersebut bergulir di panel konten yang sepadan.

## Perbaiki judul Modul dan penyiapan penunjuk

Kartu konten Modul kini mempertahankan judul Modul yang tetap, sedangkan filter status tetap berada di navigasi. Pelacakan penunjuk bersama kini mengimpor bus kapabilitas CTX secara eksplisit sehingga halaman yang disediakan modul tidak gagal saat dimuat langsung.

## Hapus modul bahasa bawaan

Cognis English dan Cognis Japanese kini dipasang secara eksklusif dari repositori marketplace mandirinya. Workspace modul bawaan telah dihapus; penemuan runtime, perutean UI, pemeriksaan integritas, plugin CLI, dan pendaftaran bahasa Study kini hanya menggunakan pemasangan beralamat UUID di bawah `COGNIS_EXTERNAL_MODULES_ROOT`. Aset navigasi Study bersama kini dimiliki oleh gateway Study.
