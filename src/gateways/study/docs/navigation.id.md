# Navigasi Study

Flashcards memakai `/study/<iso>/flashcards` dan `/study/<iso>/flashcards/<deck-id>`. Kontrol bahasa membuka galeri terkait tanpa membawa dek bahasa lain. `/study/flashcards` menentukan bahasa saat ini. Pustaka dan Permintaan tetap merupakan halaman bersama.

## Contoh penggunaan

Buka `/study/ja/flashcards` untuk deck Jepang; memilih Inggris membuka `/study/en/flashcards`.

## Spesifikasi teknis

Galeri menentukan bahasa dari jalur dan memfilter deck yang terlihat melalui kontrak publik Study. URL detail menyebut bahasa serta UUID deck; pergantian bahasa kembali ke galeri yang sesuai. Navigasi tidak membawa data kueri sementara.

Study menggunakan `navigationLabels` terlokalisasi dari deskriptor rute adapter aktif untuk tautan milik adapter, termasuk Permintaan. Kunci label tersebut tidak dicari melalui paket bahasa gateway. Label dipilih berdasarkan lokal UI yang tepat, bahasa dasarnya, lalu bahasa Inggris; tautan milik Study tetap memakai sumber daya XML gateway.

## Ukuran panel gambar konsisten

Panel gambar mengambang dibuka dalam bingkai besar yang tidak bergantung pada rasio aspek kata atau pola. Pergantian kartu mempertahankan posisi dan ukuran yang disesuaikan pengguna; proporsi gambar tetap terjaga.

## Panduan goresan yang konsisten

Sebelum masukan pertama, pola yang belum pernah diselesaikan menampilkan seluruh goresan. Setelah masukan dimulai, hanya goresan berikutnya yang dipandu, termasuk saat berpindah karakter. Pola yang pernah diselesaikan langsung memakai panduan goresan berikutnya, dengan pengujian goresan tersembunyi dan tombol pengungkap tetap tersedia.

## Simpan kemajuan menggambar

Status penyelesaian dan jumlah goresan yang disembunyikan disimpan per akun dan kartu melalui penyimpanan preferensi. Setiap percobaan, pengaturan ulang, dan pengulangan memilih posisi acak berbeda berdasarkan jumlah tersebut. Penyelesaian dengan paling banyak satu kesalahan menambah jumlahnya satu, dibatasi jumlah goresan pola saat ini. Pola yang pernah diselesaikan tetap memandu goresan berikutnya, sedangkan pola yang belum selesai menampilkan seluruh pola sebelum masukan. Permintaan GET dan POST terautentikasi ke `/api/v1/study/drawing/:cardId` menjalankan alur `study:drawing:readProgress` dan `study:drawing:complete`; peramban tidak mengirim identitas akun.
