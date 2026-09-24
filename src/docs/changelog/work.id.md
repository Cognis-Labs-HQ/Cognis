# Pilihan, filter permintaan, dan penulisan audio Study Library
**Cabang Fitur:** work

## Pilihan jamak yang dapat diprediksi
Ketika semua kartu yang terlihat dipilih, tindakan mengambang berubah menjadi “Batalkan Semua Pilihan”. Membatalkan pilihan atau berpindah halaman SPA kini selalu keluar dari mode pilihan jamak.

## Penelusuran permintaan yang terarah
Halaman Permintaan kini menyediakan filter status dan kepemilikan, sedangkan antrean peninjauan hanya ditampilkan kepada administrator dan pengajar.

## Penulisan kartu yang lebih aman
Audio bersifat opsional dan disimpan dengan kunci deterministik yang berasal dari kartu. Enter pada masukan tag tidak lagi mengirim formulir, kotak centang memakai gaya Cognis, tindakan batal memakai gaya pembatalan, dan catatan lapisan karakter tidak dapat dibuat atau disunting.

## Pengguliran Library alami
Tampilan Library kini menggunakan perilaku pengguliran alami dari penyusun halaman.

## Perancang kartu komposit terpandu
Kartu komposit kini memakai carousel horizontal berurutan untuk setiap lapisan relasi. Tindakan buat selalu terlihat dan dapat membuka penyusun kartu bertingkat, sehingga komponen yang belum ada dapat dibuat tanpa menghilangkan draf induk. Komposisi teks bebas menampilkan komponen yang cocok dan menandai teks yang belum cocok.

## Visibilitas komposisi dan pemutaran audio yang aman
Layanan kini menolak komposit bila bagian yang dirujuk tidak terlihat pada tujuan komposit. Placeholder audio lama yang tidak valid tidak lagi memicu permintaan audio yang gagal.

## Commit
- https://github.com/Cognis-Labs-HQ/Cognis/commit/7d00b6a7c8e6c0eaaf5315d595618f33c32dc3dc
- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c9c4e376ffde5af485772367430d3122b589b0e
