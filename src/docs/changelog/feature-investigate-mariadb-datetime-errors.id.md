# Perbaikan Waktu MariaDB

**Cabang Fitur:** feature-investigate-mariadb-datetime-errors

## Pendaftaran akun menerima stempel waktu ISO

MariaDB kini mengenali nama kolom yang sepenuhnya memenuhi syarat dalam kesalahan nilai waktu dan mencoba ulang penulisan skema mentah dengan nilai `DATETIME` kanonis, sehingga pendaftaran akun tidak lagi menghentikan runtime API.

## Kesalahan waktu diurai dengan aman

Kesalahan waktu MariaDB kini memakai ekspresi terarah untuk mengambil pengenal kolom terakhir yang diapit tanda kutip, sehingga dukungan kolom berkualifikasi penuh tetap tersedia dengan logika penguraian yang jauh lebih ringkas.

## Komit

- [5f4972b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f4972b0a20caebb2e365204dd1c945e05ad0085)
- [5a95fce](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a95fce9c4f66ef6b1f931fb03ec3f54b2e7c22a)
- [2d3d380](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d3d3806)
- [ebc448f1](https://github.com/Cognis-Labs-HQ/Cognis/commit/ebc448f1)
