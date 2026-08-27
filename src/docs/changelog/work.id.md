# Teks Modul Andal

## Hentikan polling teks yang hilang

Katalog modul kini hanya mengumumkan sumber daya pelokalan setelah memastikan aset teks bahasa Inggris yang diwajibkan tersedia di cache server. Polling lokapasar berkala tidak lagi mengulangi permintaan ke alamat teks yang hanya dapat menghasilkan 404.

Antarmuka lokapasar kini juga mempertahankan pencegahan tersebut, alih-alih membentuk ulang alamat statis konvensional untuk entri katalog yang aset pelokalannya tidak tersedia.

## Diagnosis cache modul tidak lengkap

API mencatat peringatan terstruktur beserta modul, bahasa, dan pengenal aset ketika modul mendeklarasikan pelokalan tetapi sumber daya bahasa Inggris tidak tersedia di cache. Pemindaian ulang sumber dapat mengisi kembali cache, sedangkan pembuat modul tetap harus menyediakan `ui/languages/en/strings.xml` dan terjemahan lain yang didukung.

## Konfigurasikan modul sebelum validasi

Rute yang secara tegas ditandai oleh modul agar tersedia saat dinonaktifkan kini didaftarkan melalui bootstrap konfigurasi terbatas. Rute lain, kontribusi UI, kapabilitas, dan kait alur tetap tidak aktif. Administrator dapat mengonfigurasi modul seperti Jitsi Meet sebelum validasi pengaktifan memeriksa konfigurasi tersebut.
