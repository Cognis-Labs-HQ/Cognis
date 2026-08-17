# Bursa Modul

## Toko aplikasi khusus

Modul kini memiliki halaman Administrasi terpisah dengan tampilan terpasang, tersedia, rekomendasi, dan kategori serta sumber GitHub dan GitLab yang dapat dikonfigurasi.

## Repositori eksternal

Administrator dapat menemukan repositori publik atau privat dengan PAT opsional yang dilindungi keyring; Cognis memvalidasi manifes dan UUID tetap saat instalasi.

## Dependensi UUID

Semua manifes komponen tetap memiliki nama dan ID yang mudah dibaca, tetapi memakai UUID stabil untuk dependensi.

## Kontrol bursa yang andal

Kartu modul, filter, pengaturan sumber, dan kontrol siklus hidup kini langsung memperbarui isi bursa tanpa mengatur ulang tata letak halaman di sekitarnya. Detail modul tetap menampilkan navigasi bursa, sementara ukuran kartu yang konsisten menjaga deskripsi dan tindakan siklus hidup tetap sejajar.

Checkout eksternal kini melewati pemeriksaan kesiapan repositori untuk kontrak paket dan rute, titik masuk, gambar, jalur aman, serta checksum berkas opsional sebelum dapat menggantikan instalasi aktif.

Repositori terpasang kini ditemukan sebagai komponen runtime lengkap. Titik masuk bootstrap dapat menyumbangkan rute, UI, dokumentasi, catatan perubahan, kapabilitas, dan tahap alur melalui lingkup `ctx` yang dilacak; penonaktifan atau penghapusan membongkar seluruh kontribusi tersebut.

Jitsi Meet telah dihapus dari pohon sumber bawaan dan kini disediakan melalui bursa. Cognis Labs HQ di GitHub selalu tersedia sebagai sumber modul tepercaya yang tidak dapat diubah.
