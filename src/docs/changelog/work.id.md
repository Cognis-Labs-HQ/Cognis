# Perbaikan Status Runtime

## Status gateway sekarang memiliki tabel database

Cognis sekarang membuat tabel status gateway tersimpan saat inisialisasi database dan juga memastikan tabel itu ada sebelum pemulihan status runtime membacanya. Ini mencegah log startup PostgreSQL melaporkan bahwa relasi `gateways` tidak ada.

## Undangan registrasi menginisialisasi skema sebelum pembacaan

Adapter undangan registrasi sekarang memastikan tabel tokennya ada sebelum menampilkan, menerbitkan, atau mencabut undangan, sehingga halaman administrasi undangan dapat membaca status undangan pada database baru tanpa error tabel hilang.
