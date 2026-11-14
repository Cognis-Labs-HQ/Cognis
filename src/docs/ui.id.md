# UI

## Ikhtisar

`src/ui/` menjadi tuan rumah frontend browser Cognis. Menyediakan alur kerja studi, permukaan interaksi sosial, panel administrasi, dan browser dokumentasi yang tertanam. UI adalah aplikasi multi-halaman yang di-render oleh server.

Lapisan UI tidak mengetahui gateway atau adapter mana yang terinstal. Sebaliknya, gateway berkontribusi elemen UI saat runtime melalui `UIRegistry` dan API page-extensions.

Semua teks yang terlihat pengguna melewati sistem i18n di `src/ui/reuse/i18n.js`. Tidak ada teks yang dikodekan secara keras di JavaScript atau template HTML.

## Tanggung Jawab

- Menjalankan semua titik masuk halaman dan template HTML terkait.
- Menyediakan shell layout yang digunakan semua halaman non-login untuk merender.
- Memelihara utilitas reuse untuk i18n, page composer, guard perubahan yang belum disimpan.
- Menegakkan paritas tema: setiap elemen menyelesaikan warnanya dari variabel CSS.
- Menyediakan paket string i18n untuk keempat bahasa yang diperlukan.

## Arsitektur

### Struktur Direktori

| Path                | Tujuan                                            |
| ------------------- | ------------------------------------------------- |
| `src/ui/layouts/`   | Shell HTML bersama                                |
| `src/ui/app/`       | Modul JavaScript titik masuk halaman              |
| `src/ui/reuse/`     | Modul utilitas lintas halaman                     |
| `src/ui/styles/`    | CSS: token dasar, layout, aturan spesifik halaman |
| `src/ui/languages/` | Paket string i18n (en, de, ja, id)                |

### Konvensi Kunci i18n

| Awalan               | Penggunaan                                                  |
| -------------------- | ----------------------------------------------------------- |
| `ui.reuse.*`         | Label yang dibagikan di beberapa halaman                    |
| `ui.reuse.generic.*` | Kata aksi mandiri bebas konteks (simpan, buang, atur ulang) |
| `ui.app.<page>.*`    | Teks spesifik halaman                                       |
| `ui.layout.*`        | Teks shell layout dan label ARIA                            |

## Pratinjau Gambar Bersama

Kapabilitas global `ui:imagePreview` menyediakan tampilan gambar mini, pengikatan interaksi, dan tindakan `open` melalui alur terdaftar `ui:imagePreview:open`. Fitur ini juga tersedia melalui `ui:reuse` sebagai `image-preview.js`; penyedianya memuat lembar gaya bersama sebelum menerbitkan kontrol. Tombol gambar membuka gambar asli dalam ukuran alaminya, dibatasi area layar, dengan hanya tombol X standar yang terlihat. Aktivasi papan ketik, Escape, pemulihan fokus, dan penutupan saat tampilan atau penyedia dilepas memakai siklus hidup popup bersama. Pemanggil mengelola URL gambar dan tindakan penghapusan opsional. Library memakai kontrol ini untuk gambar unggahan dan bawaan dalam editor serta galeri detail.

Penyedia pratinjau gambar bersama memuat lembar gayanya sebelum menerbitkan kontrol. Popup khusus gambar menghapus elemen judul dan menyesuaikan gambar asli lanskap, potret, serta panorama ke area layar tanpa gulir horizontal maupun vertikal. Pratinjau detail Library tetap dibatasi 20rem × 18rem; gambar mini editor tetap 8rem × 6rem.

## Navigasi Sesi Responsif

Keluar membersihkan data sesi pribadi tanpa menunggu pemeliharaan rute publik oleh pekerja layanan. Permintaan kebijakan identik memakai satu pertukaran tanpa menggabungkan keputusan akses yang berubah. Pengalih bahasa menunggu penyedia katalog dan menyembunyikan kontrol khusus akun setelah keluar. Salinan router dalam bundel dan yang dimuat langsung berbagi status dokumen, pendengar, dan pembatalan tampilan, termasuk navigasi Pengaturan ke Dasbor.

## Polling Marketplace Ringan

Marketplace memvalidasi ulang satu snapshot khusus administrator di `/api/v1/modules/marketplace-state` setiap lima belas detik. ETag mencakup sumber, status pemasangan, penemuan dalam cache, rekomendasi dan kebutuhan memulai ulang. Jika tidak berubah, respons berupa `304` tanpa isi; halaman mempertahankan katalog siap tampil tanpa mengambil ulang terjemahan atau menggambar ulang. Penemuan sumber berjalan sekali setelah pemasangan halaman, setiap jam, dan setelah perubahan sumber; Refresh manual tetap memaksa pemindaian. Halaman tersembunyi, offline atau sibuk menghentikan polling sementara; pelepasan halaman membatalkan permintaan dan menghapus timer.

Tampilan katalog menyertakan `ui.stringsRevision` yang diturunkan dari konten. `extendI18n(base, stringsBaseUrl, { revision })` dapat menggunakan kembali paket bahasa terautentikasi berversi dalam akun dan sesi yang sama. Revisi baru mengambil teks baru; pergantian identitas menghapus paket privat, respons terlambat tidak dapat mengisi sesi lain, dan pengambilan yang gagal dapat dicoba lagi. Paket publik mempertahankan cache dan pembatalan saat perubahan siklus hidup yang sudah ada.

Feed rekomendasi dibagikan oleh layanan marketplace, menggabungkan pembacaan serentak dan tetap segar selama lima menit. Kegagalan pembaruan mempertahankan daftar terakhir yang berhasil dan menunda percobaan berikutnya satu menit. Perubahan URL konfigurasi memilih hasil tersendiri, sedangkan Refresh manual melewati masa kesegaran.

## Tutorial terpandu

Tutorial terikat pada halaman atau URL. Kunjungan pertama yang memenuhi syarat otomatis memulai tutorial halaman yang belum selesai. SVG tanda tanya di samping judul dalam `page-context` memutar ulang tutorial yang tersedia pada halaman itu. Host memiliki tampilan dan siklus hidup; fitur memiliki teks, target, dan skrip. Tutorial tidak mengubah izin.

`showToast(message, { minRole: "admin" })` membatasi informasi operasional kepada administrator dan pemilik. Peran lain atau tidak dikenal tidak membuat DOM toast, timer, atau callback penutupan. Tanpa `minRole`, umpan balik biasa tetap terlihat oleh semua pengguna. Opsi tampilan ini bukan otorisasi operasi server.

Menu mengambang memakai kapabilitas `ui:floatingMenus` versi 1 dan alur bertahap `ui:floatingMenu:request`, `present`, `dismiss`, serta `release`. Prioritas sama mengikuti urutan permintaan; prioritas lebih tinggi menangguhkan menu di bawahnya. Reservasi menyediakan `ready` untuk izin pertama atau pembatalan, `present(element, { visible })`, `dismiss(element)`, dan `dispose()`. Tutorial menahan prioritas 100 sampai selesai, dibatalkan, atau pemilik dilepas, termasuk di antara langkah. Slot komposer dan pemilih pemutaran ulang memakai antrean yang sama. Permintaan batal dan tampilan lama tidak dapat menggantikan menu baru; slot kosong mengalah, dan pelepasan halaman membersihkan observer serta reservasi.

Toast memuat lembar gaya bersama tanpa menunda pembuatan atau penutupan pemberitahuan. Pemberitahuan serentak berbagi siklus dengan maksimal dua percobaan selama lima detik masing-masing. Setelah siklus gagal, pemberitahuan berikutnya dapat mencoba lagi. Tautan eksternal tetap dipertahankan; hanya tautan gagal yang dibuat pemuat toast yang dihapus. Penutupan saat pemuatan tetap berlaku. Target dan alur tutorial halaman tidak berubah.
