# Kerangka Bahasa Studi (Study Language Framework)

## Gambaran Umum

Kerangka Bahasa Studi mendefinisikan bagaimana konten pembelajaran bahasa disusun, didaftarkan, dan dikirimkan di Cognis. Kerangka ini memisahkan infrastruktur Study Gateway dari modul bahasa individual (konten), dan memisahkan pustaka inti setiap bahasa (register referensi semua karakter, kata, dan definisi) dari komponen anaknya (aktivitas belajar interaktif).

**Modul bahasa** adalah paket TypeScript mandiri yang mendaftarkan diri ke Study Gateway saat bootstrap. Modul ini tidak mengikuti pola adaptor; melainkan modul konten. Menambahkan bahasa baru berarti menambahkan direktori modul baru — Study Gateway menemukannya secara otomatis.

## Tanggung Jawab

- Mendefinisikan kontrak yang harus diimplementasikan setiap modul bahasa.
- Mendefinisikan model data pustaka: register berlapis dari karakter, karakter alternatif, definisi, kata, dan kalimat.
- Mendefinisikan cara komponen anak mendaftarkan halaman sub-navigasi.
- Menyediakan standar agar kontributor dapat menambahkan karakter, kata, atau aktivitas belajar tanpa memahami keseluruhan sistem.

Bukan tanggung jawab: penemuan adaptor oleh Study Gateway, manajemen sesi atau kelas.

## Arsitektur

### Model Data Pustaka

Pustaka adalah register berlapis yang berisi semua elemen suatu bahasa. Lapisan-lapisan saling membangun dari bawah ke atas:

**Lapisan 1 — Karakter (`characters`)**: Unit penulisan atomik bahasa. Untuk bahasa Jepang, ini adalah hiragana dan katakana (bukan Kanji — itu ada di alt_characters). Setiap karakter memiliki `id`, `symbol`, `romanization`, dan `category`.

**Lapisan 2 — Karakter Alternatif (`alt_characters`)** _(opsional)_: Simbol majemuk atau logografis. Kanji adalah contoh kanonik. Setiap karakter alternatif memiliki `id`, `symbol`, `components` (ID karakter dasar), dan `readings`.

**Lapisan 3 — Definisi (`definitions`)**: Penyimpanan makna yang datar dalam bahasa tertentu. Direferensikan oleh kata dan kalimat.

**Lapisan 4 — Kata (`words`)**: Kombinasi karakter atau karakter alternatif. Dipetakan ke satu atau lebih definisi yang diurutkan berdasarkan frekuensi.

**Lapisan 5 — Kalimat (`sentences`)**: Urutan kata yang tersusun. Sebuah kalimat dapat memiliki referensi definisi eksplisit atau memperoleh maknanya dari definisi utama setiap kata penyusunnya.

### Komponen Anak

Komponen anak adalah fitur belajar yang dapat dikirimkan secara mandiri untuk bahasa tertentu. Ia mengiklankan dirinya melalui modul bahasa sehingga UI dapat membangun menu sub-navigasi. Komponen anak harus terutama berfungsi sebagai antarmuka ke dan dari pustaka.

### Struktur Direktori

Modul bahasa berada di `src/modules/study/languages/<code>/`. Komponen anak berada di `components/<id>/` dalam modul bahasa.

## Rute API

| Metode | Path                                    | Deskripsi                                              | Auth     |
| ------ | --------------------------------------- | ------------------------------------------------------ | -------- |
| GET    | `/api/v1/study/languages`               | Daftar semua bahasa studi yang tersedia                | Required |
| GET    | `/api/v1/study/languages/:code/modules` | Daftar komponen anak yang terdaftar untuk suatu bahasa | Required |
