# Grup Dokumentasi

**Cabang Fitur:** feature-docs-module-headings

## Grup Dokumentasi

Buka Dokumentasi, perluas grup modul berdasarkan nama tampilannya, lalu pilih halaman. Modul dengan nama tampilan yang sama tetap menjadi grup terpisah. Deskripsi dan teks pencarian memakai nama terjemahan yang sama.

Dokumen yang hanya tersimpan dalam arsip mendapat metadata tampilan terkini selama manifes pemilik tersedia. Jika metadata tidak tersedia, label pengenal sebelumnya tetap digunakan; dokumen, versi, dan pengelompokan tetap dapat diakses. Penghapusan modul tidak membuat atau mempertahankan nama terjemahan lama.

## Spesifikasi teknis

Ekspor bersama localizeModulePresentation di /static/reuse/presentation.js digunakan oleh Modul dan Dokumentasi. Kunci nama manifes dan URL katalog yang ada digunakan tanpa menebak kunci. Nilai bahasa pilihan yang kosong atau tidak tersedia menggunakan bahasa Inggris. Jika nilai bahasa Inggris juga kosong atau tidak ada, perenderan gagal dengan missing_translation, bukan menampilkan kunci atau label pengganti.

URL katalog bahasa harus berupa jalur kanonis di bawah /static/modules/{id}/ dengan segmen publik yang tidak kosong, tanpa penelusuran direktori, kueri, fragmen, atau asal eksternal. URL bukan teks dan deskriptor yang tidak valid ditolak sebelum penerjemahan. Manifes terpasang tanpa URL menggunakan rute /static/modules/{id}/languages yang dipetakan host ke direktori UI milik UUID, bahkan sebelum inisialisasi modul.

JSON, bentuk data, atau deskriptor bahasa manifes opsional yang tidak dapat dipakai diabaikan dengan diagnostik terstruktur berisi grup dan alasan yang aman. Dokumen valid lainnya tetap tersedia dengan identitas aslinya. Kegagalan sistem berkas yang tidak terduga tetap diteruskan. Penanganan metadata ini tidak pernah menyembunyikan kunci terjemahan yang dinyatakan tetapi hilang.

Revisi versi berlaku untuk katalog eksplisit maupun konvensional sehingga pembaruan modul menyegarkan label terjemahan saat halaman dipasang kembali. Halaman dan pencarian global memakai bahasa tampilan aktif, meskipun berbeda dari prioritas tersimpan; pencarian latar belakang tidak menulis ulang preferensi tersebut.

Revisi konten juga berubah saat hash berkas bahasa publik berubah pada versi perangkat lunak yang sama. Label diperbarui setelah pembaruan di luar tab aktif tanpa mengungkap status pemasangan. Perubahan isi bahasa yang tidak dinyatakan memerlukan pembatalan cache siklus hidup modul seperti biasa.

Pengenal versi prarilis yang dipublikasikan tetap valid untuk revisi tampilan, termasuk dokumen yang hanya tersimpan dalam arsip. Aset publik lain, termasuk nama berkas dengan spasi atau karakter non-Latin, tidak memengaruhi validasi atau ringkasan bahasa.

## Komit

- [215f842f7e7ce230d29c27c47b40ef12976c2372](https://github.com/Cognis-Labs-HQ/Cognis/commit/215f842f7e7ce230d29c27c47b40ef12976c2372)
- [25a87fd0684de8205bc8310ce0e2cd17397a76b0](https://github.com/Cognis-Labs-HQ/Cognis/commit/25a87fd0684de8205bc8310ce0e2cd17397a76b0)
- [13a45bbe7ec03660fc40d0cc06934fef7cf6b3d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/13a45bbe7ec03660fc40d0cc06934fef7cf6b3d9)
- [f7a840d84e9dda280de54dd84e08519ed35a0a13](https://github.com/Cognis-Labs-HQ/Cognis/commit/f7a840d84e9dda280de54dd84e08519ed35a0a13)
- [d66a4fdeccb120a7d39837df821b15e29db48143](https://github.com/Cognis-Labs-HQ/Cognis/commit/d66a4fdeccb120a7d39837df821b15e29db48143)
- [5995ab80c44feb429ec0afd1ad046b76f1834a1e](https://github.com/Cognis-Labs-HQ/Cognis/commit/5995ab80c44feb429ec0afd1ad046b76f1834a1e)
