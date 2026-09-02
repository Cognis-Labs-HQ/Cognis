# Pemulihan Koneksi Andal

**Cabang Fitur:** work

## Konfirmasi Gangguan Koneksi

Peringatan koneksi kini memerlukan pemeriksaan kesehatan dengan asal yang sama yang gagal sehingga respons dan galat API lain tidak menghasilkan status gangguan palsu. Status pemulihan dipisahkan berdasarkan asal Cognis agar instalasi yang berbeda tidak saling memengaruhi.

## Segarkan Setelah Pulih

Cognis kini memeriksa kembalinya layanan setelah gangguan terkonfirmasi, mengganti peringatan dengan toast informasi pemulihan, lalu menyegarkan halaman saat toast tersebut menghilang.

## Commit

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)
