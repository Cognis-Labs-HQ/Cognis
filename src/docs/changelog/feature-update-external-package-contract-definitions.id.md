# Pelacakan konten Pustaka baru per pengguna

**Cabang Fitur:** feature-update-external-package-contract-definitions

## Cache konten yang telah dilihat secara persisten

Cognis kini menyimpan UUID entri Pustaka yang telah dilihat untuk setiap akun. Mengarahkan penunjuk ke kartu atau membukanya secara langsung maupun melalui relasi akan menandainya sebagai telah dilihat tanpa mengungkap riwayat pengguna lain.

## Indikator dan notifikasi konten baru

Entri yang belum dilihat menampilkan pil **Baru** satu kali pada pratinjau dan popup detail. Pembaruan penyedia serta kontribusi global yang disetujui memberi tahu pengguna aktif ketika konten bahasa baru tersedia.

## Kontribusi terbatas dan alur peninjauan

Pengguna dapat membuat kartu pribadi, guru juga dapat membuat kartu di kelas miliknya, dan administrator dapat membuat kartu global. Permintaan peningkatan yang disetujui memindahkan kartu ke kelas milik guru atau koleksi global, sedangkan penurunan yang berwenang mengembalikannya kepada pengirim awal. Kartu yang dilindungi penyedia tidak dapat dipindahkan atau dihapus.

## UI Pustaka yang dapat dicari dan dikonfigurasi

Penyedia bahasa dapat membentuk bidang pembuatan milik lapisan melalui kapabilitas ctx. Deteksi duplikat global menjeda pembuatan untuk konfirmasi, rekaman impor memiliki indeks pencarian persisten, pencarian Pustaka mencakup semua lapisan, definisi pratinjau opsional tampil di bawah isi kartu, dan kontrol multi-pilih kini berada di tepi kartu yang diminta dengan tindakan mengambang dipulihkan.

## Pembuatan yang ditentukan bahasa telah lengkap

Paket bahasa kini dapat mendeklarasikan `cardConstructor` tervalidasi untuk setiap lapisan yang dapat dibuat, atau mendaftarkannya melalui kapabilitas ctx publik `study:library:provider`. Cognis menggabungkan bidang penyedia dengan kontrol visibilitas dan kelas sesuai peran, menampilkan pilihan kelas hanya bila diperlukan, serta menyediakan permintaan tinjauan bagi guru berwenang dan administrator.

## Status kartu terbatas dan penerbitan kontekstual

Indikator cakupan, Baru, dan pilihan pada tepi kartu kini tetap berada dalam batas horizontal kartu, sedangkan pratinjau sempit memprioritaskan nilai utama. Multi-pilih kini menyediakan menu arahkan Terbitkan ke, label hapus terlokalisasi yang nyata, penarikan permintaan tertunda, dan tindakan pengembalian berizin tanpa tombol tutup yang berlebihan.

## Tautan ringkas dan penemuan cerdas

Kontrol item terkait kini hanya menampilkan nilai utama setiap kartu. Kartu anak memiliki permukaan yang lebih jelas, pemisahan latar yang lebih kuat, dan penanda Baru yang dapat diarahkan secara mandiri. Popup detail menyarankan item serupa pada lapisan yang sama berdasarkan tulisan, metadata kosakata, dan relasi bersama, sementara penyedia bahasa dapat menampilkan kolom metadata tambahan sebagai filter untuk pelajar.

## Kontrak resmi paket eksternal

Study Library kini memvalidasi dan mempertahankan metadata terlokalisasi serta metadata penyedia, jenis bidang yang dapat diperluas dan divalidasi secara deklaratif, daftar aset, kepemilikan dan perlindungan paket, presentasi semantik, pelokalan definisi, minat, dan kompatibilitas aktivitas. Fixture paket sintetis meniru struktur penyedia produksi, dan kapabilitas penyedia publik dapat memeriksa paket nyata tanpa memasangnya.

## Perbaikan penjelajahan Pustaka dan siklus hidup penyedia

Kontrol pencarian dan penyuntingan Pustaka kini ringkas serta aman untuk semua tema. Pilihan klik kanan ditangkap secara andal, kartu anak bertingkat mempertahankan area arahkan, dan kartu non-karakter menampilkan bacaan serta definisi lengkap tanpa pemotongan yang tidak perlu. Penyedia konten kini mengendalikan ketersediaan bahasa secara resmi. Rekaman konten mendukung kelas bernamespace, daftar media bertahan saat ingest, editor khusus mengikuti kontrak validasi, batasan bawaan diterapkan, dan tanda terima pemasangan mempertahankan metadata penyedia.

## Kontrol Pustaka stabil dan kartu kalimat seimbang

Kartu kalimat kini menggunakan tinggi terbatas yang konsisten, menghilangkan pratinjau pelafalan berulang, serta membatasi teks utama dan definisi menjadi dua baris. Pencarian hanya menampilkan satu tindakan hapus terkontrol, ikon sunting memakai aset tema eksplisit, dialog penghapusan memiliki label terlokalisasi, dan detail kosakata menampilkan bacaan kana. Pilihan klik kanan ditangkap pada batas dokumen di setiap halaman Study yang terpasang, sedangkan pembaruan penyedia resmi memangkas rekaman yang tidak ada dalam paket terbaru kecuali paket parsial menolaknya secara eksplisit.

## Navigasi khusus permintaan penerbitan

Tinjauan penerbitan kini berada pada halaman Permintaan khusus di subnavigasi Study dan tidak lagi memakai ruang bilah alat Pustaka. Permintaan tertunda yang dapat ditinjau memberi tautan Permintaan garis tepi merah bernapas dengan alternatif pengurangan gerakan, dan sinyal hilang setelah tinjauan terakhir diselesaikan. Ikon hapus pencarian Pustaka kini menyesuaikan tema terang maupun gelap.

## Administrasi berbasis bahasa dan penyuntingan kartu terpandu

Administrasi Pustaka kini menampilkan menu lapisan datar untuk bahasa terpilih. Kelas kartu terlihat dan dapat disunting dengan aman, definisi serta komposit mendapat kelas wajib, definisi tetap tersembunyi dari pelajar, dan partikel maupun rekaman yang dikunci penyedia tidak dapat disunting. Dialog membedakan Lihat/Edit, menyediakan Simpan, dan melindungi perubahan belum tersimpan. Pembuatan kartu dipindah ke tindakan halaman `+` terpandu pada halaman pelajar, pengirim dapat melihat status permintaan, bacaan judul popup mempertahankan tautan penyedia, dan ketersediaan bahasa Study dimuat ulang pada setiap pemuatan halaman.

## Tindakan kartu pelajar yang andal

Kartu pelajar kini tetap memiliki kontrol pilihan terlepas dari izin penghapusan, sehingga klik kanan dapat membuka pemilihan jamak tanpa menampilkan menu peramban. Tindakan pembuatan kini menemukan konstruktor kartu kontribusi penyedia dan mendaftarkan tombol + melalui kapabilitas CTX tindakan halaman.

## Navigasi Permintaan terlokalisasi saat pemuatan awal

Item navigasi Permintaan kini menerima label cadangan terlokalisasi dari rute Library pemiliknya, sehingga pemuatan awal server atau peramban tidak lagi menampilkan jalur internal `/study/library/requests` ketika bundel terjemahan masih dimuat.

## Peran relasi urutan terurut

Validasi paket konten kini merekonstruksi label urutan terurut hanya dari relasi komposisi. Relasi pelafalan dan ejaan alternatif dapat menargetkan rekaman leksikal serta memakai urutan posisinya sendiri tanpa memicu `ordered_sequence_content_unresolved`, selaras dengan kontrak penyedia pembelajaran bahasa Jepang.

## Detail kelas konten dan tautan balik yang jelas

Tampilan detail kini menyembunyikan kelas struktural composite, mengubah akhiran kelas penyedia menjadi pil yang mudah dibaca, dan memakai judul komposit dua kolom dengan bacaan di bawah teks utama. Tautan kosakata terbalik berlabel sama disembunyikan tanpa menghapus relasi ejaan maju yang ditulis penyedia.

## Cabang kartu anak yang terfokus

Membuka cabang kartu anak kini memburamkan ikon visibilitas kartu yang tidak terkait serta menetralkan elevasi dan sorotan hover pada kartu induk lainnya. Cabang aktif tetap tajam dan interaktif.

## Evolusi skema aman oleh pemilik yang sama

Rilis baru paket konten otoritatif kini dapat merevisi skema tersimpannya sendiri pada versi kompatibilitas yang sama. Pemeriksaan kepemilikan tetap melindungi dari benturan skema, dan cache skema hanya diperbarui setelah ingest transaksional berhasil, sehingga paket bahasa Jepang terbaru dapat diaktifkan dengan bersih di atas rilis sebelumnya.

## Kontrol multipilih yang andal

Study Library kini selalu menyediakan menu tindakan mengambang ketika kartu dapat memasuki mode multipilih, termasuk pada tampilan tanpa rekaman penyedia yang dapat dihapus. Kotak pilihan juga menggunakan kursor penunjuk agar sifat interaktifnya terlihat jelas.

## Bahasa nonaktif dan status belajar yang bertahan

Modul bahasa yang dinonaktifkan kini sepenuhnya tidak muncul di Study meskipun capability penyedia lama masih tersisa selama penyegaran siklus hidup. Pembaruan paket konten mempertahankan pelacakan entri yang telah dilihat dan hanya memberi tahu akun tentang rekaman stabil yang benar-benar baru, bukan seluruh paket lagi.

## Commit

- [5c5cb3d4](https://github.com/Cognis-Labs-HQ/Cognis/commit/5c5cb3d4)
- [c1874177](https://github.com/Cognis-Labs-HQ/Cognis/commit/c1874177fc1875ceab65c8b7aac58d60c5c5e091)
- [d6f1cf21](https://github.com/Cognis-Labs-HQ/Cognis/commit/d6f1cf219f2739174c01019b358ab939a24659f7)
- [8e38ded6](https://github.com/Cognis-Labs-HQ/Cognis/commit/8e38ded6f03e8e36d225e8d425625c1b719fa112)
- [c916c66f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c916c66f2095da249058883026fa7eba94005316)
- [227f2166](https://github.com/Cognis-Labs-HQ/Cognis/commit/227f21669b5ab0a3473f0bf5f547bfdb424f4ca2)
- [64d53397](https://github.com/Cognis-Labs-HQ/Cognis/commit/64d53397)
- [84bedc67](https://github.com/Cognis-Labs-HQ/Cognis/commit/84bedc67)
- [617a2161](https://github.com/Cognis-Labs-HQ/Cognis/commit/617a2161)
- [365d5444](https://github.com/Cognis-Labs-HQ/Cognis/commit/365d5444)
- [11bec51d](https://github.com/Cognis-Labs-HQ/Cognis/commit/11bec51d)
- [b996336d](https://github.com/Cognis-Labs-HQ/Cognis/commit/b996336d)
- [8d4c4129](https://github.com/Cognis-Labs-HQ/Cognis/commit/8d4c4129)
- [d16a50d5](https://github.com/Cognis-Labs-HQ/Cognis/commit/d16a50d5)
- [ea24056d](https://github.com/Cognis-Labs-HQ/Cognis/commit/ea24056d)
- [bcb4e781](https://github.com/Cognis-Labs-HQ/Cognis/commit/bcb4e781)
- [87f30e20](https://github.com/Cognis-Labs-HQ/Cognis/commit/87f30e20)
- [d3ba08ef](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3ba08ef)
- [6d6e4e53](https://github.com/Cognis-Labs-HQ/Cognis/commit/6d6e4e53)
- [5f8b129c](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f8b129c)
