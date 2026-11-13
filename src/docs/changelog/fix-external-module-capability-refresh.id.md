# Penyegaran Kapabilitas Modul

**Cabang Fitur:** fix-external-module-capability-refresh

## Pencarian kapabilitas publik

Perbaiki pencarian modul eksternal agar kapabilitas penyedia yang diterbitkan tetap terlihat melalui ctx sistem yang aktif. Data papan milik Whiteboard kembali tersedia bagi konsumen rapat, sementara kapabilitas privat tetap tersembunyi.

## Penyegaran berurutan

Jalankan penyegaran modul berurutan untuk mencegah pembongkaran dan pendaftaran kapabilitas yang bertumpang tindih. Tambahkan uji regresi untuk registri terpisah, penyedia terverifikasi, penyegaran berulang, penonaktifan dan pengaktifan ulang, permintaan bersamaan, serta pemulihan setelah kegagalan. Naikkan versi API Server ke 0.6.4.

## Komit

- [35277745](https://github.com/Cognis-Labs-HQ/Cognis/commit/35277745a929001fd66152ac879a6acc2418056a)
