# Perbaikan Waktu MariaDB

## Pendaftaran akun menerima stempel waktu ISO

MariaDB kini mengenali nama kolom yang sepenuhnya memenuhi syarat dalam kesalahan nilai waktu dan mencoba ulang penulisan skema mentah dengan nilai `DATETIME` kanonis, sehingga pendaftaran akun tidak lagi menghentikan runtime API.
