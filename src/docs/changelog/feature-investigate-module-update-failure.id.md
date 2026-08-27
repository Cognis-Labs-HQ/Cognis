# Pembaruan Modul Andal

## Pemeriksaan ditunda saat update

Pembaruan modul kini mengganti checkout saat modul dinonaktifkan dan menunda pemeriksaan kesiapan dependensi ke alur pengaktifan normal. Hal ini mencegah status runtime sementara modul terpasang membuat pembaruan commit berversi sama yang valid gagal dengan HTTP 422, sementara pengaktifan tetap memerlukan semua dependensi yang dideklarasikan.
