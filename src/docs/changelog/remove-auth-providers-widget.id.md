# Update Auth dan Kata Sandi

**Feature Branch:** copilot/remove-auth-providers-widget

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

## Nama pengguna dibatasi hanya huruf, angka, tanda hubung, dan garis bawah

Validasi nama pengguna kini hanya menerima karakter alfanumerik, tanda hubung, dan garis bawah. Karakter khusus seperti `!@#$%^&*()` tidak lagi diizinkan. Pesan validasi telah diperbarui sesuai perubahan ini.

## Baris kriteria menampilkan warna penuh dengan ikon yang mencolok

Setiap baris kriteria validasi kini menyorot seluruh latar belakang dengan warna hijau saat terpenuhi dan merah saat tidak terpenuhi, menggantikan perubahan warna teks biasa sebelumnya. Ikon status ditingkatkan menjadi tanda centang tebal (✔) dan tanda silang tebal (✘) agar status mudah terlihat sekilas.

## Ketidakcocokan konfirmasi kata sandi hanya ditampilkan saat ada nilai yang dimasukkan

Pesan ketidakcocokan konfirmasi kata sandi tidak lagi muncul terlalu dini. Kolom tetap dalam status netral hingga pengguna mengetik sesuatu di kolom konfirmasi, sehingga tidak ada indikator gagal palsu saat kolom masih kosong.

## Waktu evaluasi kecocokan kata sandi

Kriteria konfirmasi kata sandi kini tetap netral sampai ada teks yang dimasukkan ke kolom kata sandi. Ini mencegah pemeriksaan kecocokan muncul terlalu dini saat kata sandi utama masih kosong.

## Status konfirmasi tidak cocok yang reaktif

Kolom konfirmasi kata sandi sekarang langsung divalidasi ulang saat salah satu kolom kata sandi berubah, sehingga status tidak cocok langsung berubah merah saat pengguna mengetik.

## Frasa kriteria bernada positif

Label kriteria konfirmasi kini menggunakan “Kata sandi cocok.” agar baris yang sama tetap jelas baik pada kondisi berhasil maupun gagal melalui gaya kriteria hijau/merah.

## Perbaikan Kondisi Konfirmasi Kosong

Kriteria konfirmasi kata sandi pada pendaftaran diperbaiki agar nilai konfirmasi yang kosong tidak lagi dianggap cocok ketika kolom kata sandi utama sudah berisi.

## Status netral sebelum pemeriksaan

Kriteria kecocokan kata sandi kini tetap netral (bukan terpenuhi atau tidak terpenuhi) sampai kolom kata sandi berisi, sehingga umpan balik “cocok” tidak muncul terlalu dini.

## Commits

- [a103596](https://github.com/Cognis-Labs-HQ/Cognis/commit/a103596a317f506ede1967a31791b935db24f047)
