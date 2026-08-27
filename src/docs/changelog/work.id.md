# Teks Modul Andal

## Hentikan polling teks yang hilang

Katalog modul kini hanya mengumumkan sumber daya pelokalan setelah memastikan aset teks bahasa Inggris yang diwajibkan tersedia di cache server. Polling lokapasar berkala tidak lagi mengulangi permintaan ke alamat teks yang hanya dapat menghasilkan 404.

## Diagnosis cache modul tidak lengkap

API mencatat peringatan terstruktur beserta modul, bahasa, dan pengenal aset ketika modul mendeklarasikan pelokalan tetapi sumber daya bahasa Inggris tidak tersedia di cache. Pemindaian ulang sumber dapat mengisi kembali cache, sedangkan pembuat modul tetap harus menyediakan `ui/languages/en/strings.xml` dan terjemahan lain yang didukung.
