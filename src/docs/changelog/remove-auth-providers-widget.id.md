# Update Auth dan Kata Sandi

## Menghapus widget penyedia auth yang duplikat dari Administrasi

Widget kartu penyedia auth telah dihapus dari bagian Autentikasi di Administrasi karena sudah muncul di halaman Komponen. Seluruh bagian admin Autentikasi telah dihapus.

## Kebijakan kata sandi dipindahkan ke Administrasi → Keamanan

Widget konfigurasi kebijakan kata sandi telah dipindahkan dari bagian Autentikasi lama ke bagian Keamanan di Administrasi. Sekarang terintegrasi dengan pelacak dirty-state standar, sehingga perubahan disimpan atau dibatalkan melalui bilah perubahan terpadu, bukan melalui tombol Simpan khusus.

## Kebijakan kata sandi menggunakan nilai minimum numerik untuk kelas karakter

Persyaratan huruf kapital, angka, dan karakter khusus kini menggunakan input numerik, bukan sakelar toggle. Menetapkan nilai ke 0 (default) menonaktifkan persyaratan tersebut; bilangan bulat positif menetapkan jumlah minimum karakter dari kelas tersebut yang harus ada dalam kata sandi.

## Halaman registrasi: validasi nama pengguna secara langsung

Formulir registrasi kini menampilkan peringatan langsung di bawah kolom nama pengguna begitu pengguna mengetikkan karakter yang bukan karakter ASCII yang dapat dicetak atau huruf besar. Peringatan muncul segera saat input, bukan hanya saat pengiriman formulir.

## Halaman registrasi: titik-titik kebijakan kata sandi yang selalu terlihat

Kolom kata sandi pada halaman registrasi kini selalu menampilkan semua persyaratan kebijakan yang berlaku sebagai daftar poin-poin di bawah kolom tersebut. Setiap poin diperbarui secara langsung saat pengguna mengetik: persyaratan yang terpenuhi ditampilkan hijau dengan tanda centang, sedangkan yang belum terpenuhi ditampilkan merah.

## Utilitas form builder untuk kriteria terstruktur

Utilitas form builder reusable baru sekarang menangani render dan validasi formulir registrasi melalui definisi field dan kriteria terstruktur yang diberikan lewat konteks bersama (`ctx`). Ini menjadi pola reusable agar formulir berikutnya dapat mendeklarasikan aturan validasi sebagai data, bukan logika DOM khusus per field.

## Batas nama pengguna kini memberi peringatan, bukan memblokir input

Kolom nama pengguna tidak lagi berhenti paksa di 25 karakter. Pengguna tetap bisa mengetik, dan peringatan inline langsung muncul saat nilai melewati 25 karakter.

## Field wajib menampilkan tanda bintang merah di samping judul field

Field wajib kini menampilkan tanda bintang merah langsung di samping judul label field, bukan di bawah input. Warna bintang menggunakan variabel tema yang sesuai agar terlihat jelas di tema terang dan gelap.

## Kriteria nama pengguna tampil di panel mengambang saat fokus

Persyaratan nama pengguna kini ditampilkan dalam panel mengambang yang sama seperti kriteria kata sandi. Panel muncul langsung di bawah kolom nama pengguna saat kolom tersebut difokuskan dan tersembunyi saat fokus berpindah.

## Panel kriteria mengikuti lebar kolom

Panel kriteria mengambang kini menyesuaikan lebar penuh kolom input yang bersangkutan, bukan mengambang di tepi kanan. Di perangkat kecil, panel tampil sebagai blok di bawah kolom saat difokuskan.

## Panel kriteria menggunakan warna tema yang tepat

Panel kriteria mengambang kini menggunakan variabel CSS tema yang benar (`--surface`, `--border`, `--text-muted`, `--color-success-outline-text`, `--color-danger-outline-text`) agar warna tampil akurat di tema terang maupun gelap.
