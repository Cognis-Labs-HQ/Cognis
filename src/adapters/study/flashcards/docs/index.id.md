# Adaptor Kartu Belajar

## Penggunaan

Buka dek yang terlihat dari Flashcards untuk langsung berlatih. Pilih Total, Selesai, Jatuh Tempo atau Baru untuk menentukan kartu.

## Spesifikasi Teknis

Dek menggunakan jenis sumber daya `studyDeck` dan kemampuan baca `study:flashcards:read`. Kontrol Berbagi Cognis mendukung pengguna, tautan publik, masa berlaku, kata sandi, dan pencabutan. Hanya pemilik dapat mengubah atau menghapus dek. Penerima dapat belajar dengan jadwal terpisah per akun; ekspor hanya untuk pembuat atau administrator. Tamu tautan belajar sementara tanpa mengubah jadwal akun. Masa berlaku dan pencabutan diperiksa pada setiap operasi dek.

Berbagi secara eksplisit membagikan salinan keadaan dek beserta konten kartu dan definisi terpilih, tanpa memberikan akses pustaka sumber atau mengubah cakupannya. Perubahan pemilik memperbarui salinan ini. Kartu sumber yang tidak tersedia dilewati saat pemilik belajar. Salinan yang sudah dibagikan tetap menjadi konten dek hingga pemilik mengubah atau menghapus dek. Penghapusan mencabut pembagian dan menghapus kemajuan belajar.

Impor dan ekspor memakai teks UTF-8 dengan kolom berpetik yang dipisahkan tab: Front, Back, dan Pronunciation opsional. Ekspor menyertakan kepala Anki untuk pemisah, dek, dan teks biasa serta konteks Cognis opsional yang dapat diabaikan Anki. Kutipan, tab, dan baris baru dipertahankan. Format ini adalah TSV, bukan arsip `.apkg`. Riwayat belajar pribadi tidak diekspor.

## Penelusuran dan Favorit Study

Flashcards membuka daftar dek milik sendiri, dek yang dibagikan kepada akun, dan dek awal lengkap dari penyedia bahasa aktif. Tautan berbagi tetap memerlukan izin yang berlaku dan bukan direktori publik. Menu + di kanan atas menawarkan Buat Dek dan Impor Dek. Jelajahi, Library, dan Flashcards menggunakan favorit Study tersimpan per akun dan kontrol urutan bersama. Pilih urutan penyedia, A–Z, Z–A, terbaru atau terlama. Bintang menjadi emas saat menyaring hasil favorit. Item Library, dek, dan kartu belajar memiliki favorit terpisah. Favorit tidak memberikan hak akses. Papan gambar mengakhiri sesi saat rute berubah dan tidak menimpa kelas composer atau shell.

## Dek Awal dari Penyedia

Deskriptor bahasa dapat menetapkan `starterDecks` berupa `{ key, name, schemaId, sourceRecordIds }`. Kunci stabil dalam paket, nama dipetakan per bahasa, dan hingga 500 kunci rekaman unik menentukan urutan belajar. Cognis menyelesaikan rekaman Library global menjadi ID Library kanonis. ID dek tetap stabil lintas revisi. Dek tidak lengkap dan penyedia nonaktif disembunyikan. Dek awal hanya-baca; jadwal dan favorit tetap pribadi. Detail kartu baru dimuat ketika dek dibuka.

Flashcards memuat stylesheet bersama page-builder dan page-sections seperti Explore dan Requests. Setiap pemasangan memiliki cakupan interaksi yang dapat dibatalkan agar handler jelajah atau belajar lama tidak tetap aktif setelah navigasi. Gaya adapter tidak menimpa kelas composer, shell, atau tombol bersama; pemeriksaan regresi memastikan batas ini dan dependensi stylesheet.

Pembuatan dan impor dek yang berhasil menutup editor terlindungi sebelum membuka halaman jelajah yang diperbarui, sehingga perubahan tersimpan tidak memicu dialog pembuangan. Hasil Library khusus favorit menampilkan kartu anak terpilih secara mandiri; urutan penyedia memulihkan penempatan bersarang asli.

## Latihan Kartu

Dek langsung membuka latihan. Total mencakup semua kartu; Baru mencakup kartu tanpa catatan ulasan; Jatuh Tempo mencakup kartu yang telah diulas dan waktunya telah tiba; Selesai mencakup kartu dengan jadwal berikutnya. Kartu baru, termasuk dalam Total, menampilkan kartu lengkap. Kartu lain hanya memperlihatkan jawaban setelah pilihan bacaan salah atau goresan ditolak. Memilih kategori memulai antrean baru.

Membaca menawarkan pelafalan utama serta tiga pelafalan berbeda dari kemiripan Perpustakaan yang terlihat dan berperingkat, sama seperti Jelajahi. Membaca tersedia hanya jika ada tiga pengecoh sah. Menulis menyematkan seluruh papan gambar Study bersama, mengunci karakter, dan menilai urutan goresan. Kartu yang tidak didukung dapat dilewati tanpa mencatat ulasan berhasil. Jawaban benar dan kartu baru dijadwalkan sebagai Baik; jawaban salah sebagai Lagi.

Label, pelafalan, dan definisi dari Perpustakaan menautkan kartu sumber di Jelajahi. Konfirmasi melindungi sesi saat meninggalkan latihan. Sumber yang tidak dapat diakses tetap dilindungi izin Perpustakaan dan tidak dapat dibuka melalui salinan bersama. Ekspor menggunakan ikon unduh bertema di kanan atas, hanya untuk pembuat atau administrator. Menu Kartu Belajar tetap aktif pada halaman dek.

Tindakan peramban menjalankan alur study:decks dengan tahap before, execute, dan after. Daftar dan detail server menjalankan authorize, read, dan audit; penyimpanan, ulasan, dan penghapusan mempertahankan validasi, izin, dan transaksi. Study memiliki papan gambar, penyusunan pola, kemiripan, dan alur tindakan bersama. Adaptor Gambar opsional hanya mengintegrasikan papan mengambang; Menulis tertanam tetap tersedia tanpanya. Halaman dan sesi dibatalkan saat ditinggalkan.
