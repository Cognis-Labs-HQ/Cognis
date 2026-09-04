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

## Commit

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
