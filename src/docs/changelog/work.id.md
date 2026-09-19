# Pustaka dan Keamanan

**Cabang Fitur:** work

## Modul UI Pustaka terfokus

Titik masuk peramban Study Library kini menjadi koordinator halaman yang ringkas. Perenderan kartu, kisi berlapis, popup detail, pemilihan, interaksi peramban, dan interaksi varian berada dalam modul terfokus sekitar 100–200 baris tanpa mengubah perilaku UI yang ada.

## Koreksi kemajuan atomik

Peristiwa kemajuan biasa tidak lagi dapat menyisipkan pengenal kompensasi. Koreksi memakai operasi khusus, dan penyimpanan peristiwa persisten menjamin secara atomik bahwa setiap target memiliki paling banyak satu koreksi.

## Penghapusan Pustaka terotorisasi

Penghapusan Pustaka kini menyelesaikan kaskade akhir dan mengotorisasi setiap entri yang terdampak di dalam transaksi penghapusan, sehingga menutup celah antara otorisasi dan perubahan relasi bersamaan.

## Batas modul yang lebih kuat

Validasi modul eksternal menolak tautan simbolis sumber, tautan direktori (termasuk nama bertitik), dan tautan aset yang keluar dari batas modul. Tautan aset lokal modul yang aman tetap dapat digunakan. Kelas UI terlindungi yang ditargetkan melalui pemilih atribut kelas juga dikenali.

## Ejaan sekunder pada judul

Ejaan alternatif kata dan kalimat kini muncul sebagai konten judul sekunder yang dapat dinavigasi tepat di bawah ejaan utama. Varian struktural seperti karakter tidak lagi diulang dalam konten detail.

## Judul pelafalan yang jelas

Ejaan utama dan sekunder tidak lagi diulang sebagai metadata pelafalan. Pelafalan tetap berupa teks judul biasa dan tidak pernah diubah secara heuristik menjadi tautan unit tulisan, sehingga relasi yang ditampilkan hanya mencerminkan graf Pustaka yang disediakan modul.

## Ketepatan relasi Pustaka dan paket konten

Pratinjau penghapusan kini menghormati kebijakan kaskade, pelepasan, dan pembatasan tanpa menjadikan entri bergantung sebagai penghapusan eksplisit. Entri tersembunyi atau yang ditempatkan tidak masuk urutan popup, dan peningkatan paket konten menghapus rekaman penyedia yang tidak ada pada versi baru.

## Perilaku kemajuan yang tahan lama dan deterministik

Percobaan ulang kemajuan membandingkan peristiwa secara struktural, stempel waktu yang sama memakai ID peristiwa sebagai penentu deterministik, tanggal ekstrem yang tidak aman ditolak sebelum penyimpanan, JSON rusak menghasilkan galat klien, dan adapter nonaktif memblokir kapabilitas serta hook alurnya.

## Validasi stylesheet modul yang lengkap

Validasi modul eksternal kini mendeteksi URL internal Cognis langsung di impor CSS dan URL aset maupun di skrip.

## Commit

- [f006429b](https://github.com/Cognis-Labs-HQ/Cognis/commit/f006429b)
- [458c6bea](https://github.com/Cognis-Labs-HQ/Cognis/commit/458c6bea)
- [a009f770](https://github.com/Cognis-Labs-HQ/Cognis/commit/a009f770)
- [799fc33d](https://github.com/Cognis-Labs-HQ/Cognis/commit/799fc33d)
- [d472ffa9](https://github.com/Cognis-Labs-HQ/Cognis/commit/d472ffa9)
