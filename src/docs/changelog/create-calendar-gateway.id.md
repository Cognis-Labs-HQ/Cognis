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
