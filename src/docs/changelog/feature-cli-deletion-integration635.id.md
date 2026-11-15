# Hasil Penghapusan yang Akurat

**Cabang Fitur:** feature-cli-deletion-integration635

## Bedakan hasil akun

Penghapusan akun membedakan penghapusan terkonfirmasi pemilik dengan pembersihan belum selesai, penolakan otoritatif, dan hasil tidak diketahui. HTTP 200 normal tetap sama. Status, kode, dan pesan penolakan aman yang ada dipertahankan; data hasil eksplisit ditambahkan. Kesalahan alur asli mempertahankan atribusi pemulihan komponennya.

Alur yang selesai dengan bukti tidak tersedia mempertahankan bidang kesalahan HTTP 503 yang sudah ada dan melaporkan hasil penghapusan null serta tidak diketahui, termasuk ketika penghapusan mungkin telah terjadi. Ketidakpastian akibat kesalahan yang dilempar dan hasil penyelesaian rusak tetap memakai HTTP 500 dengan hasil tidak diketahui; pemeriksaan otorisasi dan masa berlaku tidak berubah.

## Wajibkan bukti penyelesaian

CLI memerlukan HTTP 200 dan pengakuan penghapusan yang tepat. Status sukses lain serta hasil penyelesaian rusak atau hilang tetap tidak diketahui. Batasan status transportasi publik yang opsional tidak mengubah pemanggil yang sudah ada secara bawaan.

## Jelaskan kegagalan tanpa mengulang

Hasil parsial, ditolak, dan tidak diketahui memakai pesan stderr terlokalisasi dan kode keluar bukan nol. Respons yang hilang tidak memicu pengulangan otomatis penghapusan atau pembersihan. Dokumentasi bahasa Jerman, Inggris, Indonesia, dan Jepang menjelaskan kontrak hasil dan tindak lanjut yang aman.

## Komit

- [f9f217e23dd3c2b9e5854320602e72f333ca4fbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/f9f217e23dd3c2b9e5854320602e72f333ca4fbc)
