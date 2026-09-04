# Pensinyalan panggilan

Adaptor Call memiliki undangan panggilan per ruang, dering, jawaban, penutupan, batas waktu, dan penyerahan ke penyedia peramban. Messages menyediakan flow tindakan ruang yang netral; adaptor Call menyuntikkan kontrol dan perilakunya ke tahap tersebut.

Panggilan dimulai pada permukaan dering yang menggantikan riwayat percakapan dan penyusun pesan sambil mempertahankan tajuk utas. Penerima memperoleh notifikasi Calls persisten dengan tindakan Jawab yang membuka ruang beserta token panggilan. Panggilan berakhir setelah 45 detik jika tidak dijawab. Setelah dijawab, adaptor memanggil `voip:startCall` dengan `phase: connect`; penyedia mengembalikan tindakan komponen atau navigasi. Kontrol rapat tertanam tetap terpisah dari bilah alat Call, yang panahnya memindahkan rapat ke gambar-dalam-gambar dan memulihkan Messages.

## Contoh penggunaan

Adapter Call diaktifkan otomatis ketika Messages dan penyedia browser `voip:startCall` tersedia.

## Spesifikasi teknis

Kapabilitas `social:callUi` mengelola status undangan, batas waktu 45 detik, tautan jawab notifikasi, pemasangan komponen, penutupan panggilan, dan penyerahan ke penyedia.

Panggilan masuk tidak dimasukkan ke daftar lonceng notifikasi. Panggilan tetap berada di area notifikasi singkat hingga dijawab, ditolak, atau kedaluwarsa, dengan kontrol Jawab hijau dan Tolak merah. Saat Messages terbuka, ruang terkait dipindahkan sementara ke posisi teratas daftar ruang. Penelepon menerima umpan balik yang berbeda saat membatalkan, penerima menolak, tidak ada jawaban, atau penyedia pertemuan menolak penyerahan.

Setiap transisi panggilan disimpan sebagai peristiwa ruang dalam riwayat Messages, sehingga semua peserta melihat siapa yang memulai, menjawab, membatalkan, atau menolak panggilan serta kapan panggilan tidak dijawab. Browser memainkan nada dering sintetis masuk dan keluar yang berbeda secara berulang hingga undangan dijawab, ditolak, dibatalkan, atau kedaluwarsa.

Selama undangan terbaru berdering, peristiwa ruangnya menjadi kartu panggilan interaktif: penerima dapat menjawab atau menolak dalam percakapan, sementara penelepon melihat status berdering. Setelah status panggilan berubah atau panggilan yang lebih baru dimulai, entri riwayat menjadi peristiwa biasa tanpa tindakan. Prompt panggilan masuk dipulihkan dari notifikasi persisten saat shell dimulai, dan nada dering menggunakan denyut berulang yang lebih kuat.

Memindahkan komponen yang diterima ke gambar-dalam-gambar bersifat idempoten: aktivasi panah berikutnya tidak membuat ulang atau mengubah ukuran jendela mengambang. Aktivasi pertama menyembunyikan panah dan tahap inline, memulihkan serta menyegarkan percakapan, dan menonaktifkan tindakan kamera hingga komponen ditutup. Kartu panggilan aktif memakai permukaan berbayang dan batas animasi; peristiwa selesai tidak mempertahankan kontrol jawab atau tolak.

Setelah komponen panggilan dipindahkan ke gambar-dalam-gambar, komponen dipindahkan ke shell dokumen persisten dan dipertahankan melewati pembatalan halaman pemanggil serta pembersihan rute SPA. Penutupan komponen secara eksplisit tetap melakukan pembersihan lengkap dan memulihkan host asal jika masih terhubung.

Saat komponen aktif dipindahkan ke gambar-dalam-gambar, penyedia tetap terpasang di host komponen yang stabil. Host berbatas menjadi permukaan mengambang, memotong konten penyedia sesuai dimensinya, dan menyediakan kontrol tutup transparan sebagian opsional yang mengembalikan komponen aktif yang sama ke tahap panggilan Messages.

Panggilan aktif mencatat akun yang sedang bergabung. Penelepon dan penjawab pertama sudah cukup untuk mengaktifkan panggilan grup; undangan lain dapat bergabung setelahnya. Pembongkaran penyedia membuat akun lokal keluar, dan panggilan dilepas setelah akun terakhir keluar, sehingga tindakan kamera dapat membuat undangan baru dan memberi tahu semua peserta ruang lainnya.

Penyedia komponen mungkin baru selesai diatasi setelah klik awal berakhir. Karena itu, UI Panggilan menangkap izin pemunculan komponen sekali pakai milik inti secara sinkron saat Mulai atau Jawab dan meneruskannya ke pemasangan komponen berikutnya. Izin berakhir setelah 60 detik dan tidak dapat mengotorisasi jendela kedua.

Penyedia dapat menetapkan `context.allowNavigation: true` pada tindakan komponennya dan dapat menyediakan `minSize` untuk permukaan PiP. UI Panggilan meneruskan izin tersebut saat memunculkan komponen dan memindahkan host PiP ke shell persisten, tetapi baru mengaktifkan retensi navigasi setelah panggilan memasuki PiP; mengembalikan panggilan ke Messages segera memulihkan pembatasan navigasi halaman pemanggil.
