# Pensinyalan panggilan

Adaptor Call memiliki undangan panggilan per ruang, dering, jawaban, penutupan, batas waktu, dan penyerahan ke penyedia peramban. Messages hanya memakai kapabilitas `social:callUi` miliknya.

Panggilan dimulai pada permukaan dering yang menggantikan riwayat percakapan dan penyusun pesan sambil mempertahankan tajuk utas. Penerima memperoleh notifikasi Calls persisten dengan tindakan Jawab yang membuka ruang beserta token panggilan. Panggilan berakhir setelah 45 detik jika tidak dijawab. Setelah dijawab, adaptor memanggil `voip:startCall` dengan `phase: connect`; penyedia mengembalikan tindakan komponen atau navigasi. Kontrol rapat tertanam tetap terpisah dari bilah alat Call, yang panahnya memindahkan rapat ke gambar-dalam-gambar dan memulihkan Messages.

## Contoh penggunaan

Adapter Call diaktifkan otomatis ketika Messages dan penyedia browser `voip:startCall` tersedia.

## Spesifikasi teknis

Kapabilitas `social:callUi` mengelola status undangan, batas waktu 45 detik, tautan jawab notifikasi, pemasangan komponen, penutupan panggilan, dan penyerahan ke penyedia.

Panggilan masuk tidak dimasukkan ke daftar lonceng notifikasi. Panggilan tetap berada di area notifikasi singkat hingga dijawab, ditolak, atau kedaluwarsa, dengan kontrol Jawab hijau dan Tolak merah. Saat Messages terbuka, ruang terkait dipindahkan sementara ke posisi teratas daftar ruang. Penelepon menerima umpan balik yang berbeda saat membatalkan, penerima menolak, tidak ada jawaban, atau penyedia pertemuan menolak penyerahan.
