# Pemulihan Koneksi Andal

**Cabang Fitur:** feature-tune-connection-interrupted-detection

## Konfirmasi Gangguan Koneksi

Peringatan koneksi kini memerlukan pemeriksaan kesehatan dengan asal yang sama yang gagal sehingga respons dan galat API lain tidak menghasilkan status gangguan palsu. Status pemulihan dipisahkan berdasarkan asal Cognis agar instalasi yang berbeda tidak saling memengaruhi.

## Segarkan Setelah Pulih

Cognis kini memeriksa kembalinya layanan setelah gangguan terkonfirmasi, mempertahankan peringatan gangguan saat menambahkan toast informasi pemulihan, lalu menyegarkan halaman saat masa tampil toast pemulihan berakhir. Menutup toast pemulihan secara manual membatalkan penyegaran agar pengembang dapat memeriksa keadaan halaman yang telah pulih.

## Commit

- [8f529113](https://github.com/Cognis-Labs-HQ/Cognis/commit/8f52911346de2bc69b977b2345e072e7631f8033)

- [16536120](https://github.com/Cognis-Labs-HQ/Cognis/commit/16536120a1eb3de2bceda8db1a0b19ff73bf4e22)

- [9b9ed168](https://github.com/Cognis-Labs-HQ/Cognis/commit/9b9ed168bd6d841e229b2611a2c2f2f0db626c25)
