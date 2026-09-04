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

Penyedia dapat menetapkan `context.allowNavigation: true` pada tindakan komponennya dan dapat menyediakan `minSize` untuk permukaan PiP. UI Panggilan meneruskan izin tersebut saat memunculkan komponen dan memindahkan host PiP ke shell persisten, tetapi baru mengaktifkan retensi navigasi setelah panggilan memasuki PiP; mengembalikan panggilan ke Messages memasang kembali host penyedia yang ada dan memulihkan pembersihan berbasis rute untuk navigasi berikutnya.

Panggilan masuk memakai lease `/ringing` terautentikasi per pengguna. Permukaan peramban memperbarui lease selama berdering dan melepasnya saat selesai, sehingga hanya satu tab atau prompt yang memiliki nada dering. Menjawab atau menolak memancarkan penyelesaian berkorelasi yang menutup notifikasi dan prompt Messages bersama-sama.

Host Call mempertahankan konteks penyedia dan secara eksplisit menandai komponen panggilan yang dimunculkan sebagai `voipCall`, sesuai kontrak komponen Jitsi Meet agar panggilan PiP sekali pakai tidak menampilkan chat rapat.

Pembersihan jendela mengambang memvalidasi hierarki tujuan tersimpan dan beralih dari operasi `moveBefore` penjaga status yang ditolak ke pemindahan DOM biasa. Jika kedua pemindahan tidak valid secara struktural, portal dibiarkan agar dibuang pemiliknya tanpa memunculkan penolakan yang tidak tertangani.

Saat komponen penyedia tetap tertambat di Messages, utas panggilan aktif beralih ke kisi dua baris dan panggung Call, host komponen, serta jendela komponen mengisi sisa tinggi kartu widget. PiP tetap memakai dimensi mengambang yang dibatasi secara terpisah.

Endpoint lease `/ringing` bersifat idempoten setelah panggilan berakhir: pembaruan dan pelepasan yang terlambat mengembalikan hasil berhasil tanpa dering, bukan kesalahan panggilan tidak ditemukan. Saat pengguna mencoba menutup panggilan gambar-dalam-gambar setelah berpindah ke halaman lain, Calls meminta pilihan untuk kembali ke Messages, menutup panggilan, atau membatalkan. Pilihan kembali memakai navigasi SPA, memasang kembali host penyedia yang sama tanpa memuat ulang rapat, lalu menutup gambar-dalam-gambar.

Penangan penutupan gambar-dalam-gambar mengambil panggilan aktif dari siklus hidup stage sebelum menampilkan atau menjalankan pilihan penutupan, sehingga menghindari kesalahan cakupan usang setelah navigasi. Kontrol tutup kembali memakai dimensi standar jendela mengambang dan gaya konsekuensi destruktif `btn-cancel`.

Keluar dari panggilan merupakan operasi pembongkaran idempoten: jika penyedia rapat ditutup setelah server lebih dahulu mengakhiri panggilan, endpoint mengembalikan panggilan yang telah berakhir dan UI menyelesaikan pembersihan tanpa toast kesalahan. Setelah panggilan gambar-dalam-gambar kembali ke Messages, pembersihan rute memeriksa apakah panggilan telah masuk ke gambar-dalam-gambar lagi sebelum membuangnya, sehingga perpindahan kedua tetap bertahan selama navigasi SPA.

Rute panggilan memvalidasi ulang keanggotaan Messages yang aktif dan tidak diarsipkan untuk setiap operasi baca atau perubahan status. Label peserta dimasukkan sebagai teks, peserta grup aktif bergabung secara eksplisit ke status pensinyalan, penolakan perpanjangan dering menghentikan nada lokal, dan polling keluar yang dibatalkan mengakhiri undangan. Serah-terima penyedia mempertahankan jenis ruang. Teks notifikasi masuk dibawa sebagai metadata terlokalisasi yang disediakan produsen dan dipilih oleh perender notifikasi internal yang netral berdasarkan prioritas bahasa peramban.
