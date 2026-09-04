# Filter pencarian Ruang Baru untuk pengguna

**Cabang Fitur:** work

## Penemuan ruang khusus pengguna

Pemilih Ruang Baru di Messages kini meneruskan kategori pengguna dan filter tipe milik utilitas pencarian bersama, sesuai dengan parameter pencarian terfilter Jitsi Meet dan mengecualikan tipe hasil lain.

## Status pencarian yang responsif

Pencarian kini mengganti petunjuk panjang minimum dengan status pemuatan segera setelah kueri yang memenuhi syarat dijalankan. Permintaan yang gagal atau melewati batas waktu menampilkan galat yang jelas, bukan membiarkan hasil lama atau petunjuk yang tidak responsif.

## Prompt panggilan masuk yang tersinkronisasi

Panggilan masuk kini muncul dalam bilah tepat di atas tajuk utas Messages. Jawab dan Tolak menyelesaikan notifikasi berkorelasi serta prompt dalam obrolan bersama-sama, sedangkan lease dering per pengguna mencegah beberapa tab atau permukaan memutar nada dering ganda.

## Bilah panggilan terlihat dan PiP terfokus

Status panggilan masuk kini menyegarkan ruang terpilih sehingga bilah tindakannya muncul tepat di bawah tajuk utas sementara notifikasi dapat tetap terlihat. Komponen VoIP yang dimunculkan ditandai secara eksplisit dengan konteks `voipCall` Jitsi Meet agar chat rapat tidak tampil pada permukaan PiP.

## Pembongkaran PiP yang aman

Saat panggilan VoIP dalam PiP ditutup, hierarki portal asal kini divalidasi dan memakai jalur cadangan dengan aman jika peramban menolak pemindahan atomik penjaga status. Pembongkaran komponen selesai tanpa `HierarchyRequestError` yang tidak tertangani.

## Panggung panggilan tertambat setinggi penuh

Panggilan penyedia yang tertambat kini memakai seluruh sisa tinggi kartu widget Messages. Utas aktif menyusut menjadi baris tajuk dan panggung panggilan, sedangkan panggung, host komponen, serta jendela komponen meregang memenuhi baris konten yang tersedia.

## Pembersihan dering andal dan kembali dari gambar-dalam-gambar

Permintaan lease dering yang terlambat kini berhasil dengan hasil tanpa dering setelah panggilan berakhir. Menutup panggilan dari gambar-dalam-gambar setelah navigasi SPA menawarkan Kembali ke Messages, Tutup Panggilan, dan Batal dengan gaya tindakan yang sesuai konsekuensi. Kembali akan bernavigasi ke ruang panggilan dan memulihkan komponen penyedia yang ada tanpa memasangnya ulang.

## Kontrol tutup gambar-dalam-gambar yang stabil

Tindakan tutup gambar-dalam-gambar kini menyimpan panggilan aktif dalam siklus hidup stage sehingga menghapus `ReferenceError` setelah navigasi. Kontrol tutup kembali menggunakan ukuran standar jendela mengambang dan kini memakai kelas destruktif `btn-cancel`.

## Keluar idempoten dan persistensi gambar-dalam-gambar berulang

Pembongkaran penyedia yang terlambat tidak lagi melaporkan kesalahan ketika server telah mengakhiri panggilan. Keluar kini berhasil secara idempoten dan pembersihan menekan kondisi balapan panggilan-tidak-tersedia yang telah diketahui. Setelah kembali ke Messages, perpindahan kedua ke gambar-dalam-gambar kini mempertahankan panggilan selama navigasi SPA berikutnya.

## Perbaikan keamanan, siklus hidup, dan rangkaian pengujian

Perenderan panggilan kini memasukkan label yang dikendalikan peserta melalui simpul teks, operasi panggilan memvalidasi ulang keanggotaan Messages saat ini, ruang yang diarsipkan dikecualikan, peserta grup aktif didaftarkan, penolakan perpanjangan dering menghentikan audio, pembatalan polling keluar membatalkan undangan, dan kontrak penyedia mempertahankan jenis ruang sebenarnya. Teks panggilan masuk disediakan dalam semua bahasa yang didukung melalui metadata notifikasi netral. Pencocok pencarian bersama dipisah menjadi modul hasil API khusus untuk memenuhi batas 1.000 baris, dan pengujian Messages, notifikasi, serta string hardcode yang usang diperbaiki tanpa menghapus baris baru.

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713
- https://github.com/Cognis-Labs-HQ/Cognis/commit/da2e46c1
