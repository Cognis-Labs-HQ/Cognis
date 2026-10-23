# Latihan Menulis

Study memiliki papan gambar lengkap di `src/gateways/study/ui/reuse/drawing.js`, termasuk kanvas, kontrol, panduan, penilaian dan hasil. Adaptor Gambar opsional menyediakan `study:drawing:open` dan `study:drawing:load` melalui `uiCtx` browser. Pemanggil menunggu tindakan ini dan memberikan kartu Library lengkap serta `strokePattern` tervalidasi.

## Contoh Penggunaan

Mesin `openDrawingPad` yang sama menerima `container`, `signal` pembatalan dan `onResult`. Tanpa kontainer, jendela dapat dipindahkan dan diubah ukurannya; memuat karakter lain mempertahankan posisi. Dengan kontainer, seluruh papan ditanam, karakter asal dikunci dan keberhasilan dilaporkan hanya setelah semua goresan berurutan diterima. Menulis tertanam tidak memerlukan adaptor Gambar opsional.

## Spesifikasi Teknis

Masukan pena, sentuhan dan tetikus dinilai menurut urutan, arah dan kedekatan. Goresan yang diterima diganti dengan pola baku. Sebelum masukan pertama, pola yang belum diselesaikan akun saat ini menampilkan semua panduan bernomor. Setelah masukan dimulai dan pada pola yang pernah diselesaikan, hanya goresan berikutnya yang dipandu, termasuk saat berpindah karakter. Tombol panduan dinonaktifkan ketika semua panduan terlihat. Sepuluh kesalahan beruntun mengakhiri percobaan; hasil menunjukkan jumlah kesalahan dan kontrol ulang. Status penyelesaian dan jumlah goresan tersembunyi disimpan per akun dan kartu. Penyelesaian dengan paling banyak satu kesalahan menambah jumlahnya hingga batas goresan pola. Setiap percobaan, pengaturan ulang, dan pengulangan memilih posisi acak baru.

Pola gabungan mempertahankan proporsi, urutan, waktu, tekanan dan keselarasan penunjuk tanpa mengubah data penyedia. Label menghindari lintasan goresan, dan kanvas diperbarui sekali per bingkai. Jendela mengambang memakai SVG tutup standar; papan tertanam tetap berada di kontainer. Gaya milik komponen tidak mengubah composer, kerangka halaman atau menu samping.

Buka, muat, goresan, reset, panduan, ulang dan tutup menjalankan alur `study:drawing` dengan tahap before, execute dan after. Navigasi atau pembatalan melepaskan penangan penunjuk, pengamat ukuran dan render. Library dan Flashcards menggunakan kontrak reuse publik Study.

Papan gambar bersama memuat templat HTML miliknya sekali per modul browser. Permintaan gagal menolak tindakan buka; navigasi saat pemuatan membatalkan pemasangan. Kelompok karakter penyedia tetap utuh dalam pola banyak karakter.

## Sembunyikan jawaban menulis

Judul pad mula-mula menyamarkan karakter dengan tombol standar untuk membukanya. Memuat karakter lain menyamarkannya kembali. Sesi mengambang menyediakan kartu aktif melalui kapabilitas yang dapat dilepas `study:drawing:observe`. Pratinjau Library yang cocok tetap terbuka, diburamkan, dan tidak interaktif sampai pad berganti karakter atau ditutup; bacaan dan arti tetap tersedia di pad. Mode Menulis tertanam memakai penyamaran yang sama serta melaporkan pembukaan karakter sebagai percobaan berbantuan.
