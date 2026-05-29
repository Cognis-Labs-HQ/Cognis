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
