# Dependensi modul eksternal

## Instalasi sadar dependensi

Modul eksternal dapat menyatakan dependensi keras yang tidak dianjurkan dan dependensi lunak opsional. Instalasi kini menampilkan semua dependensi, memblokir persyaratan keras yang belum terpenuhi, memungkinkan administrator memilih pendamping opsional, dan mengaktifkan dependensi terpilih.

## Aktivasi dan kanal rilis yang andal

Membatalkan peringatan integritas modul kini menghentikan aktivasi dependensi dan alur konfigurasi wajib. Kanal rilis yang dipilih disimpan oleh server dan tetap tersedia setelah server dimulai ulang, bahkan sebelum instalasi.

## Verifikasi integritas tautan simbolis yang aman

Validasi SHASUM modul kini mengikuti tautan simbolis berkas yang mengarah ke dalam modul, termasuk alias `AGENTS.md` ke `.github/copilot-instructions.md`, sambil menolak tautan rusak, direktori, dan target di luar modul.

## Alias terverifikasi dan pemberitahuan pembatalan

Alias tautan simbolis yang tidak dideklarasikan tidak lagi memicu peringatan SHASUM ketika mengarah ke berkas modul yang sudah dideklarasikan dan diverifikasi. Pembatalan instalasi kini menampilkan pemberitahuan yang jelas.

## Kartu dependensi untuk instalasi dan pengaktifan

Konfirmasi dependensi kini menampilkan kartu modul lengkap dengan label wajib, opsional, dan direkomendasikan serta tautan langsung ke detail. Pemeriksaan dijalankan sebelum instalasi maupun pengaktifan dan dilewati ketika semua dependensi sudah aktif.
