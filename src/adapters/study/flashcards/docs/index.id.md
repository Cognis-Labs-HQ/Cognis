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

Saat membuka dek akun maupun dek bersama, pelajar memilih Membaca atau Menulis sebelum latihan dimulai. Mode tetap terkunci selama sesi, termasuk setelah mengunjungi Jelajahi dan kembali melalui tombol Kembali browser. Kartu yang tidak mendukung mode dapat dilewati tanpa pergantian mode otomatis. Jawaban kartu baru mula-mula disembunyikan. Semua, Baru, Jatuh Tempo, dan Selesai mempertahankan filter ulasan; mengganti filter memulai antrean baru dalam mode yang sama.

Membaca memakai pelafalan utama dan tiga pengecoh berbeda dari kartu Library yang terlihat. Menulis menanamkan pad bersama dengan petunjuk arti dan bacaan, sedangkan karakter disembunyikan di balik judul yang dapat diklik. Kesalahan goresan tidak otomatis membuka karakter. Membuka karakter dianggap sebagai bantuan dan memberi hasil Ulangi, meskipun goresan berikutnya benar. Keberhasilan tanpa bantuan memberi hasil Baik. Jawaban kartu yang sudah diulas tetap dapat diperiksa.

Galeri memakai `/study/<iso>/flashcards`; tautan dek memakai nama yang mudah dibaca diikuti `--<deck-id>`, misalnya `/study/ja/flashcards/first-japanese-words--<deck-id>`. Nama Inggris kanonis menjaga bagian terbaca tetap sama di semua bahasa antarmuka. Akhiran identitas membedakan nama duplikat dan menjaga tautan tetap konsisten bagi pemilik serta penerima dengan katalog dek berbeda. ID sumber daya API tetap sama.

Entri riwayat browser menyimpan antrean dek, posisi, nilai, jawaban tertunda, filter, serta mode. Kembali dari Jelajahi memulihkan antrean asli dengan tombol Sebelumnya/Berikutnya yang berfungsi. Membuka jawaban atau meninggalkan kartu yang belum dijawab untuk diperiksa menyimpan hasil Ulangi. Tautan sumber membawa urutan ID kartu melalui status riwayat agar pratinjau Jelajahi juga dapat menavigasi dek, termasuk kartu turunan. Akses tetap mengikuti otorisasi Library; kartu yang tidak lagi dapat diakses dikeluarkan saat pemulihan.

Semua tindakan menjalankan alur dek dan menggambar Study yang sudah dideklarasikan. Antarmuka memakai popup, tombol, dan gaya kartu yang sudah ada. Dek akun dan bersama memakai perender serta latihan yang sama; snapshot bersama tidak memperoleh akses Library. Perpindahan halaman menghentikan penangan dan sesi menggambar.
