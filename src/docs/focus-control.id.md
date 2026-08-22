# Kontrol Fokus

## Skema manifes

Halaman dan elemen composer dapat mendeklarasikan `focusControl` dengan ID stabil, kunci teks terlokalisasi, rute terdaftar, mode presentasi, dan status yang dapat diserialkan. Pesan tidak menerima HTML atau callback.

## Alur dan penyedia

Alur bernama memisahkan deklarasi, otorisasi, mulai, pemuatan, publikasi, penerapan, pemindahan, dan akhir. Penyedia mendaftarkan kapabilitas hanya melalui ctx.

## Keamanan dan sinkronisasi

Setiap operasi diautentikasi, dibatasi pada sumber daya kolaborasi, serta memvalidasi keanggotaan dan peran. Status dibatasi 64 KiB dan revisi monoton melindungi konflik serta mendukung penyambungan kembali.

## Modul eksternal

Modul papan tulis menunjuk rute modul yang ditemukan. Hanya referensi sumber daya dan metadata presentasi yang disinkronkan; dokumen tetap melalui penyedia papan tulis.
