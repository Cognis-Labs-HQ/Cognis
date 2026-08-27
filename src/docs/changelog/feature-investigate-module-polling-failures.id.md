# Teks Modul Andal

## Hentikan polling teks yang hilang

Katalog modul kini hanya mengumumkan sumber daya pelokalan setelah memastikan aset teks bahasa Inggris yang diwajibkan tersedia di cache server. Polling lokapasar berkala tidak lagi mengulangi permintaan ke alamat teks yang hanya dapat menghasilkan 404.

Antarmuka lokapasar kini juga mempertahankan pencegahan tersebut, alih-alih membentuk ulang alamat statis konvensional untuk entri katalog yang aset pelokalannya tidak tersedia.

## Segarkan sumber modul saat mulai

Cognis kini melakukan satu pemindaian paksa terhadap sumber modul saat API dimulai. Langkah ini menyegarkan aset pelokalan yang tersimpan di cache sebelum polling lokapasar dimulai, sehingga modul dengan berkas teks yang valid dapat menampilkan nama dan ringkasan terjemahan setelah dimulai ulang.

## Jaga penyegaran modul tetap stabil

Pemeriksaan lokapasar berkala kini mempertahankan kartu modul yang sedang ditampilkan sampai data cache dan sumber siap, sehingga teks tidak berkedip pada tahap perantara. Aset modul yang aktif juga tetap dapat diakses langsung ketika kontribusi UI diperbarui, sehingga kesalahan sementara pada dependensi navigasi setelah pengaktifan dapat dicegah.

## Muat setiap terjemahan modul

Teks modul GitHub publik kini menggunakan endpoint konten mentah repositori, selaras dengan cara Nextcloud Whiteboard menyerahkan berkas bahasa kepada Cognis sekaligus menghindari batas permintaan API selama penemuan paralel. Metadata Jitsi Meet, Nextcloud Whiteboard, dan modul bahasa Study kini dapat diterjemahkan secara konsisten tanpa bergantung pada permintaan bahasa yang selesai sebelum batas tercapai.

## Diagnosis cache modul tidak lengkap

API mencatat peringatan terstruktur beserta modul, bahasa, dan pengenal aset ketika modul mendeklarasikan pelokalan tetapi sumber daya bahasa Inggris tidak tersedia di cache. Pemindaian ulang sumber dapat mengisi kembali cache, sedangkan pembuat modul tetap harus menyediakan `ui/languages/en/strings.xml` dan terjemahan lain yang didukung.

## Konfigurasikan modul sebelum validasi

Rute yang secara tegas ditandai oleh modul agar tersedia saat dinonaktifkan kini didaftarkan melalui bootstrap konfigurasi terbatas. Rute lain, kontribusi UI, kapabilitas, dan kait alur tetap tidak aktif. Administrator dapat mengonfigurasi modul seperti Jitsi Meet sebelum validasi pengaktifan memeriksa konfigurasi tersebut.

## Modul nonaktif tetap tidak dimuat

Modul eksternal yang dinonaktifkan tidak lagi diimpor atau di-bootstrap saat rute diperbarui sehingga kode tingkat atas dan kode siklus hidupnya tidak dijalankan.

## Pemindaian sumber privat menunggu kredensial

Penemuan saat startup kini hanya memindai sumber modul publik. Sumber privat berkredensial tetap tersedia bagi polling marketplace terautentikasi tanpa percobaan tanpa kredensial yang menunda penyegaran berikutnya.
