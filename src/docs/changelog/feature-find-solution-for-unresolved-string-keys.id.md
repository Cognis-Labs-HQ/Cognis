# Penemuan Modul Terlokalisasi

## Nama modul langsung dimuat

Bursa modul kini menyimpan dan menyediakan string terlokalisasi milik setiap modul yang ditemukan, sehingga nama, ringkasan, kategori, dan tag telah diterjemahkan sebelum pemasangan pada pemuatan pertama.

## Inti tetap di runtime inti

Pemuat rute modul eksternal kini mengabaikan manifes inti sehingga tidak lagi mencari Cognis Core di dalam direktori pemasangan modul eksternal.

## Struktur pemuat bursa lebih jelas

Pemuatan bursa kini berada dalam direktori khusus dengan penemuan katalog, akses repositori, dan layanan publik yang dipisahkan menjadi berkas lebih kecil dan jauh di bawah batas ukuran sumber.
