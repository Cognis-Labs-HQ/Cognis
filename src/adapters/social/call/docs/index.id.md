# Pensinyalan panggilan

Adaptor Call memiliki undangan panggilan per ruang, dering, jawaban, penutupan, batas waktu, dan penyerahan ke penyedia peramban. Messages hanya memakai kapabilitas `social:callUi` miliknya.

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

Portal PiP yang dipertahankan menjaga panggung komponen milik broker di sekitar jendela, termasuk ID elemennya yang stabil. Penyedia seperti Jitsi dapat menemukan panggung induknya dan memanggil kapabilitas host `component-pages:discard` ketika peserta keluar, dikeluarkan, atau konferensi berakhir; panggung panggilan sementara dihapus setelah pembuangan tersebut.

Sebelum menampilkan tindakan panggilan ruang, UI Call meminta endpoint status ruang yang terautentikasi. Panggilan aktif menandai tindakan kamera sebagai aktif dan klik langsung menghubungkan kembali ke pertemuan penyedia yang ada. Panggilan berdering digunakan kembali alih-alih membuat undangan lain: penelepon melanjutkan menunggu dan peserta lain menjawab panggilan yang ada. Server mengulangi pemeriksaan panggilan saat ini tepat sebelum pembuatan untuk mencegah undangan silang saat terjadi perlombaan.

Penyedia komponen mungkin baru selesai menentukan tindakan setelah klik awal berakhir. Karena itu, UI Panggilan menangkap izin pemunculan komponen sekali pakai dari inti secara sinkron saat Mulai atau Jawab, lalu meneruskannya ke pemasangan komponen berikutnya. Izin kedaluwarsa setelah 60 detik dan tidak dapat mengizinkan jendela kedua.
