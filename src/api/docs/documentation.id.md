# Grup Dokumentasi

Buka Dokumentasi, perluas grup modul berdasarkan nama tampilannya, lalu pilih halaman. Modul dengan nama tampilan yang sama tetap menjadi grup terpisah. Deskripsi dan teks pencarian memakai nama terjemahan yang sama.

## Contoh penggunaan

GET /api/v1/docs menyertakan metadata groupPresentation opsional bersama group, slug, title, path, dan versions yang sudah ada. Grup tetap memakai UUID modul yang tidak berubah; label tidak menggantikan identitas atau rute.

## Spesifikasi teknis

Dokumentasi membaca manifes publik di direktori sumber yang sesuai. UUID manifes harus cocok dengan grup dan jalur kanonis harus tetap berada dalam pemilik tersebut. Hanya id, name, ui.stringsBaseUrl, serta ui.stringsRevision berupa ringkasan versi yang valid dan entri SHA-256 berkas bahasa publik yang diurutkan yang disertakan. Konfigurasi, kredensial, status siklus hidup, dan data katalog administrasi tidak termasuk. Tidak diperlukan autentikasi tambahan atau titik akhir administrasi.

Ekspor bersama localizeModulePresentation di /static/reuse/presentation.js digunakan oleh Modul dan Dokumentasi. Kunci nama manifes dan URL katalog yang ada digunakan tanpa menebak kunci. Nilai bahasa pilihan yang kosong atau tidak tersedia menggunakan bahasa Inggris. Jika nilai bahasa Inggris juga kosong atau tidak ada, perenderan gagal dengan missing_translation, bukan menampilkan kunci atau label pengganti.

Dokumen yang hanya tersimpan dalam arsip mendapat metadata tampilan terkini selama manifes pemilik tersedia. Jika metadata tidak tersedia, label pengenal sebelumnya tetap digunakan; dokumen, versi, dan pengelompokan tetap dapat diakses. Penghapusan modul tidak membuat atau mempertahankan nama terjemahan lama.

Panduan Dokumentasi tetap menyorot navigasi, dokumen aktif, dan tautan versi. Langkah navigasi menjelaskan grup berdasarkan nama tampilan. Status perluasan tetap disimpan dengan ID grup yang stabil selama navigasi; pemasangan yang dibatalkan saat memuat terjemahan tidak menerbitkan menu.

URL katalog bahasa harus berupa jalur kanonis di bawah /static/modules/{id}/ dengan segmen publik yang tidak kosong, tanpa penelusuran direktori, kueri, fragmen, atau asal eksternal. URL bukan teks dan deskriptor yang tidak valid ditolak sebelum penerjemahan. Manifes terpasang tanpa URL menggunakan rute /static/modules/{id}/languages yang dipetakan host ke direktori UI milik UUID, bahkan sebelum inisialisasi modul.

JSON, bentuk data, atau deskriptor bahasa manifes opsional yang tidak dapat dipakai diabaikan dengan diagnostik terstruktur berisi grup dan alasan yang aman. Dokumen valid lainnya tetap tersedia dengan identitas aslinya. Kegagalan sistem berkas yang tidak terduga tetap diteruskan. Penanganan metadata ini tidak pernah menyembunyikan kunci terjemahan yang dinyatakan tetapi hilang.

Revisi versi berlaku untuk katalog eksplisit maupun konvensional sehingga pembaruan modul menyegarkan label terjemahan saat halaman dipasang kembali. Halaman dan pencarian global memakai bahasa tampilan aktif, meskipun berbeda dari prioritas tersimpan; pencarian latar belakang tidak menulis ulang preferensi tersebut.

Revisi konten juga berubah saat hash berkas bahasa publik berubah pada versi perangkat lunak yang sama. Label diperbarui setelah pembaruan di luar tab aktif tanpa mengungkap status pemasangan. Perubahan isi bahasa yang tidak dinyatakan memerlukan pembatalan cache siklus hidup modul seperti biasa.

Pengenal versi prarilis yang dipublikasikan tetap valid untuk revisi tampilan, termasuk dokumen yang hanya tersimpan dalam arsip. Aset publik lain, termasuk nama berkas dengan spasi atau karakter non-Latin, tidak memengaruhi validasi atau ringkasan bahasa.
