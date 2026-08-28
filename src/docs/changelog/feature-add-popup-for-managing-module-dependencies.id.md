# Dependensi modul eksternal

## Instalasi sadar dependensi

Modul eksternal dapat menyatakan dependensi keras yang tidak dianjurkan dan dependensi lunak opsional. Instalasi kini menampilkan semua dependensi, memblokir persyaratan keras yang belum terpenuhi, memungkinkan administrator memilih pendamping opsional, dan mengaktifkan dependensi terpilih.

## Aktivasi dan kanal rilis yang andal

Membatalkan peringatan integritas modul kini menghentikan aktivasi dependensi dan alur konfigurasi wajib. Kanal rilis yang dipilih disimpan oleh server dan tetap tersedia setelah server dimulai ulang, bahkan sebelum instalasi.

## Verifikasi integritas tautan simbolis yang aman

Validasi SHASUM modul kini mengikuti tautan simbolis berkas yang mengarah ke dalam modul, termasuk alias `AGENTS.md` ke `.github/copilot-instructions.md`, sambil menolak tautan rusak, direktori, dan target di luar modul.
