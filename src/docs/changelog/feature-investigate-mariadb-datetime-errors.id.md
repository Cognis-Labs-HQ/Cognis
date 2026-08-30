# Perbaikan Waktu MariaDB

**Cabang Fitur:** feature-investigate-mariadb-datetime-errors

## Pendaftaran akun menerima stempel waktu ISO

MariaDB kini mengenali nama kolom yang sepenuhnya memenuhi syarat dalam kesalahan nilai waktu dan mencoba ulang penulisan skema mentah dengan nilai `DATETIME` kanonis, sehingga pendaftaran akun tidak lagi menghentikan runtime API.

## Komit

- [5f4972b](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f4972b0a20caebb2e365204dd1c945e05ad0085)
- [5a95fce](https://github.com/Cognis-Labs-HQ/Cognis/commit/5a95fce9c4f66ef6b1f931fb03ec3f54b2e7c22a)
