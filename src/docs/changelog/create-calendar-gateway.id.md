# Catatan Perubahan PR — Desain Ulang UI Kalender

## Ringkasan

Toolbar samping kini dipersempit untuk memberikan lebih banyak ruang horizontal
pada kalender. Item daftar kalender kini menampilkan ikon visibilitas (gembok
untuk privat, globe untuk publik) sejajar dengan nama kalender.

Formulir pembuatan kalender baru dipindahkan dari toolbar ke popup yang dibuka
oleh tombol "+" di samping judul "Kalender Saya". Pemilih warna di popup tersebut
kini berada di sebelah kiri input nama tanpa label "Warna" yang terpisah.

Komposer Acara bukan lagi elemen halaman mandiri dan kini hanya dibuka sebagai
popup melalui sistem popup yang dapat digunakan kembali.

Tampilan hari kini menampilkan satu hari dengan nama dan tanggal sebagai heading.
Slot waktu dirender sebagai indeks baris berlabel di kolom kiri yang tetap. Acara
untuk setiap slot muncul di kolom kanan yang berdampingan. Mengklik kolom acara
yang kosong atau tombol "+" pada baris slot waktu akan membuka popup Komposer
Acara; mengklik label slot waktu itu sendiri tidak memicu tindakan apapun.

Tampilan mingguan kini menampilkan baris label bulan di atas kisi hari. Setiap
header kolom hari menampilkan nama hari dan tanggal serta dapat diklik untuk
beralih ke tampilan hari tersebut.

Tampilan bulanan tidak lagi menampilkan tombol "Buka Tampilan Mingguan" secara
eksplisit. Sebagai gantinya, nomor minggu ISO adalah elemen yang dapat diklik di
sel paling kiri setiap baris minggu dan memuat minggu tersebut dalam tampilan
mingguan.

## File/komponen yang diubah

- `src/gateways/calendar/ui/app.js`
- `src/gateways/calendar/ui/calendar-ui-helpers.js`
- `src/gateways/calendar/ui/calendar.css`
- `src/gateways/calendar/ui/languages/en/strings.xml`
- `src/gateways/calendar/ui/languages/de/strings.xml`
- `src/gateways/calendar/ui/languages/id/strings.xml`
- `src/gateways/calendar/ui/languages/ja/strings.xml`
