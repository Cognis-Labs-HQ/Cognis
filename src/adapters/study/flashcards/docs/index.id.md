# Adaptor Kartu Belajar

## Penggunaan

Aktifkan adaptor Kartu Belajar Study untuk membuat dek bernama dari lapisan pustaka yang dapat dibaca atau mengimpor catatan TSV kompatibel Anki. Adaptor memiliki rute, penyimpanan, perender, jadwal, antarmuka, dan teksnya sendiri. Balik kartu untuk melihat pelafalan dan definisi. Lagi mengulang setelah satu menit; Baik dimulai dari satu hari dan berlipat dua; Mudah dimulai dari empat hari dan berlipat tiga.

## Spesifikasi Teknis

Dek menggunakan jenis sumber daya `studyDeck` dan kemampuan baca `study:flashcards:read`. Kontrol Berbagi Cognis mendukung pengguna, tautan publik, masa berlaku, kata sandi, dan pencabutan. Hanya pemilik dapat mengubah atau menghapus dek. Penerima dapat belajar dan mengekspor dengan jadwal terpisah per akun. Tamu tautan belajar sementara tanpa mengubah jadwal akun. Masa berlaku dan pencabutan diperiksa pada setiap operasi dek.

Berbagi secara eksplisit membagikan salinan keadaan dek beserta konten kartu dan definisi terpilih, tanpa memberikan akses pustaka sumber atau mengubah cakupannya. Perubahan pemilik memperbarui salinan ini. Kartu sumber yang tidak tersedia dilewati saat pemilik belajar. Salinan yang sudah dibagikan tetap menjadi konten dek hingga pemilik mengubah atau menghapus dek. Penghapusan mencabut pembagian dan menghapus kemajuan belajar.

Impor dan ekspor memakai teks UTF-8 dengan kolom berpetik yang dipisahkan tab: Front, Back, dan Pronunciation opsional. Ekspor menyertakan kepala Anki untuk pemisah, dek, dan teks biasa serta konteks Cognis opsional yang dapat diabaikan Anki. Kutipan, tab, dan baris baru dipertahankan. Format ini adalah TSV, bukan arsip `.apkg`. Riwayat belajar pribadi tidak diekspor.
