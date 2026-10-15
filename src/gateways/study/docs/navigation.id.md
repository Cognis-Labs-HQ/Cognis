# Navigasi Study

Flashcards memakai `/study/<iso>/flashcards` dan `/study/<iso>/flashcards/<deck-id>`. Kontrol bahasa membuka galeri terkait tanpa membawa dek bahasa lain. `/study/flashcards` menentukan bahasa saat ini. Pustaka dan Permintaan tetap merupakan halaman bersama.

## Contoh penggunaan

Buka `/study/ja/flashcards` untuk deck Jepang; memilih Inggris membuka `/study/en/flashcards`.

## Spesifikasi teknis

Galeri menentukan bahasa dari jalur dan memfilter deck yang terlihat melalui kontrak publik Study. URL detail menyebut bahasa serta UUID deck; pergantian bahasa kembali ke galeri yang sesuai. Navigasi tidak membawa data kueri sementara.

Study menggunakan `navigationLabels` terlokalisasi dari deskriptor rute adapter aktif untuk tautan milik adapter, termasuk Permintaan. Kunci label tersebut tidak dicari melalui paket bahasa gateway. Label dipilih berdasarkan lokal UI yang tepat, bahasa dasarnya, lalu bahasa Inggris; tautan milik Study tetap memakai sumber daya XML gateway.
