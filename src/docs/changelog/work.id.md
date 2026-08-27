# Startup modul yang lebih aman

## Modul nonaktif tetap tidak dimuat

Modul eksternal yang dinonaktifkan tidak lagi diimpor atau di-bootstrap saat rute diperbarui sehingga kode tingkat atas dan kode siklus hidupnya tidak dijalankan.

## Pemindaian sumber privat menunggu kredensial

Penemuan saat startup kini hanya memindai sumber modul publik. Sumber privat berkredensial tetap tersedia bagi polling marketplace terautentikasi tanpa percobaan tanpa kredensial yang menunda penyegaran berikutnya.
