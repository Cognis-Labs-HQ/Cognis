# Penerima berbagi tetap masuk

## Berbagi terlindungi meminta kata sandi, bukan terlihat hilang

Gateway Berbagi kini membedakan token valid yang dilindungi kata sandi dari token tidak valid. Halaman berbagi menerima tantangan autentikasi, memeriksa keyring terenkripsi, meminta kata sandi bila diperlukan, menyimpan kata sandi terverifikasi, lalu memuat objek bersama.

## Akses notifikasi tidak lagi mengganti status masuk

Penerima yang sudah masuk mempertahankan token akun saat membuka notifikasi berbagi. Token berbagi terbatas yang terpisah diberikan langsung kepada perender komponen untuk operasi API bersama, sehingga penulisan Kalender tetap dikendalikan izin tanpa mengeluarkan pengguna.
