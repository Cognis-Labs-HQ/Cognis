# Peningkatan Kalender

## Penyimpanan kalender persisten

Gateway kalender kini menyimpan kalender, acara, dan respons peserta melalui
store berbasis DB saat kemampuan DB executor tersedia. Rute kalender sekarang
mendukung baca, ubah, hapus acara tunggal, penanganan respons peserta, dan
salinan undangan pengguna internal otomatis ke kalender Invited.

## Alur kalender yang lebih kaya

Popup kalender sekarang mendukung melihat, mengedit, menghapus, dan merespons
acara, termasuk pengaturan pengulangan, status kosong/sibuk, dan peringatan
tumpang tindih. Tampilan kalender menampilkan lencana acara yang lebih kaya,
dasbor menampilkan acara kalender mendatang, terjemahan diperluas, dan pengujian
gateway kini mencakup kalender Invited khusus, pembaruan acara, dan penghapusan
salinan cermin.

## Perbaikan: popup acara dari URL kini dapat ditutup

Ketika halaman kalender dibuka dengan parameter URL `eventId`, popup detail acara
kini dapat ditutup dengan normal. Sebelumnya, tindakan tutup diabaikan tanpa
pemberitahuan karena penangan `onAction` memeriksa string `"close"`, padahal
implementasi popup mengubahnya menjadi `null` sebelum memanggil handler.
Pemeriksaan kini dilakukan terhadap `null`, sehingga popup dapat ditutup dan
indikator pemuatan halaman tidak lagi berputar tanpa henti saat membuka halaman
melalui tautan langsung.

## Klik kalender untuk mengedit

Setiap kalender di bilah alat samping kini merupakan satu elemen interaktif: mengkliknya
langsung membuka popup edit. Tombol pensil terpisah yang sebelumnya muncul di
samping nama kalender telah dihapus.

## Penyempurnaan antarmuka kalender

Kontrol tampilan kalender kini berupa bilah alat satu baris — tombol navigasi dan
label periode saat ini berada di sisi kiri, sedangkan tombol pemilih tampilan
(Hari / Minggu / Bulan / Tahun) berada di sisi kanan. Tampilan minggu menampilkan
nomor minggu ISO setelah bulan dan tahun. Di tampilan bulan, penghitung acara per
hari dihapus; hingga tiga acara ditampilkan langsung, dan "…" muncul jika ada lebih
banyak. Di tampilan tahun, hari dengan acara kini diarsir dengan warna yang lebih
kontras. Sudut sumbu minggu kini menggunakan warna latar yang sama dengan label
slot waktu agar terlihat menyambung. Kartu bulan Februari di tampilan tahun tidak
lagi lebih tinggi dari bulan-bulan lainnya.

## Tautan berbagi dengan nama dan tanpa batas

UI berbagi kalender kini menerima nama opsional untuk setiap tautan yang dibuat,
memudahkan identifikasi saat ada beberapa tautan. Tidak ada lagi batas jumlah
tautan yang dapat dibuat — setiap tautan baru ditampilkan di popup dan tetap dapat
diakses hingga kedaluwarsa.

## Preferensi format waktu

Pengaturan sekarang memiliki preferensi jam 12/24 di bagian Tanggal &amp; Waktu. Format
waktu bersama memakai pilihan itu agar waktu pada kalender, cap waktu pesan, jam, dan
label waktu lainnya tetap konsisten dengan format yang dipilih pengguna.

## Slot kalender yang lebih rapi

Slot mingguan dan harian kini mempertahankan jarak yang konsisten sambil menampilkan
acara sebagai kartu bertumpuk dengan tombol tambah yang menempel di tempatnya, jadi
baris tidak lagi melebar tidak merata. Klik pada area kosong slot sekarang juga selalu
membuka pembuatan acara sehingga dead zone hilang.
