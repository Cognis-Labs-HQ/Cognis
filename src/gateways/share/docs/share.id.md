# Share Gateway

## Ikhtisar

Gateway Share memiliki token bagikan publik untuk sumber daya Cognis. Gateway ini membuat, menampilkan, mencabut, dan menyelesaikan tautan bagikan melalui flow `ctx` kanonis sehingga gateway dan modul pemilik sumber daya dapat ikut tanpa mengimpor internal share.

## Halaman Share

Sumber daya bersama dibuka di `/share/:token`. Halaman ini memakai page composer standar dengan shell minimal, header bermerek Cognis, dan renderer yang dipilih oleh komponen pemilik.

## Sesi Tamu

Saat token share di-resolve, gateway Share sekarang menerbitkan token akses tamu berumur pendek (`purpose: share`) yang terikat ke record share tersebut (`sub: share:<shareId>`). Halaman share menukar token ini sementara ke `localStorage` agar panggilan API dari halaman bersama yang dipasang berjalan sebagai sesi tamu anonim, lalu memulihkan token sebelumnya saat halaman ditutup.

## Kontrak Manifest Share

Komponen yang dapat dibagikan mendeklarasikan blok `share` di manifest dengan `shareable`, `mountScriptUrl`, `stringsBaseUrl`, dan `guestApiScopes`. Halaman share memprioritaskan `mountScriptUrl` agar sumber daya bersama dapat memuat komponen halaman asli, bukan kartu statis.

## Batas Keamanan

Token tamu dibatasi ke satu record share, kedaluwarsa cepat (maksimal empat jam dan tidak pernah lebih lama dari token share), serta hanya membuka rute yang secara eksplisit memvalidasi cakupan share dan kapabilitasnya. Rute yang mengubah data tetap memakai pemeriksaan user/session yang ada dan menolak tamu share.

## Kontrol berbagi

Catatan berbagi kini membawa kontrol akses milik gateway: izin baca/tulis, penerima bertipe untuk pengguna dalam aplikasi, grup/kelas, dan penerima email, perlindungan kata sandi opsional, serta penanda watermark untuk berbagi hanya-baca. Gateway Share menyediakan rute umum untuk membuat dan memperbarui token sehingga modul meminta berbagi melalui `ctx` atau `/api/v1/share/tokens` dan tidak memiliki pengiriman penerima atau pengeditan izin sendiri. Berbagi hanya-baca memakai watermark secara default, sementara berbagi dengan izin tulis menghapus default itu kecuali pemanggil secara eksplisit mempertahankannya.

## Adapter metode berbagi

Popup menemukan metode berbagi dari adapter gateway Share dan menampilkannya dalam baris metode. Tautan dan Pengguna masing-masing memiliki penyiapan masukan serta halaman popup, sedangkan riwayat difilter berdasarkan metode terpilih.

## Kedaluwarsa dan perlindungan

Kedua metode bawaan menerima tanggal dan waktu kedaluwarsa yang opsional; jika tidak diisi, berbagi tidak kedaluwarsa. Hash dan verifikasi kata sandi tetap dimiliki gateway Share. Komponen sumber daya dapat menyediakan mode akses Tautan beserta izin dan kemampuan yang sesuai.

## Umpan balik pengiriman penerima dan alias kata sandi

Fasilitator berbagi dapat mengembalikan umpan balik pengiriman generik yang berisi kunci terjemahan dan URL dasar string komponen. Tindakan notifikasi terautentikasi menampilkan umpan balik tersebut sebelum menavigasi ke sumber daya yang dikirim. Setelah token terlindungi diselesaikan, Share menyimpan kata sandi terverifikasi di bawah token tautan buram dan pengenal berbagi kanonis agar komponen penerima dapat menggunakannya kembali tanpa meminta ulang.
