# Lapisan Pustaka Belajar yang ringkas

**Cabang Fitur:** work

## Tampilan lapisan minimal

Skema pustaka dapat mengaktifkan kartu ringkas pada tiap lapisan yang hanya menampilkan konten utama entri. Klik, pemilihan melalui klik kanan, penampilan varian dengan tekan lama, dan kartu turunan yang ditampilkan tetap memakai model interaksi yang ada.

## Tipografi popup relatif terhadap preferensi

Popup detail kini menetapkan tipografi berdasarkan ukuran font aplikasi pilihan pengguna, dengan tingkat judul proporsional dan bukan judul Pustaka tetap yang terlalu besar. Modul eksternal yang memakai ukuran font CSS absolut gagal dalam validasi batas sebelum aktivasi.

## Hilangkan luapan semu Pustaka

Kartu varian berarah yang tersembunyi tidak lagi ikut membentuk luapan yang dapat digulir. Kartu tersebut dikeluarkan dari tata letak hingga sengaja ditampilkan, sehingga area kosong selebar kartu dan bilah gulir horizontal hilang tanpa mengubah tekan lama maupun penampilan melalui tautan langsung.

## Kontrol Pustaka konsisten dan kalimat tervalidasi

Logout kini hanya mempertahankan tampilan batal berwarna merah saat diarahkan. Kartu minimal tetap menampilkan pelafalan dan definisi terlokalisasi di samping nilai utama, sedangkan judul detail dan kegagalan audio memakai ukuran relatif yang diperbaiki. Penyerapan paket konten menolak kalimat berurutan yang memuat teks tanpa dukungan entri unit leksikal atau partikel tertaut.

## Alihkan rute Study yang tidak tersedia

Rute SPA Study kini hanya ditawarkan selama setidaknya satu modul bahasa yang valid dan aktif tersedia. Permintaan langsung serta pemasangan SPA dari cache dialihkan ke `/error?code=503` ketika validasi bahasa membuat Study tidak tersedia, alih-alih merender kerangka Study yang kosong atau rusak.

## Kartu minimal selebar konten dan judul popup lebih tegas

Kisi Pustaka minimal tetap menyediakan jumlah kolom sama besar yang diminta modul, termasuk posisi kosong, sementara kartu yang terlihat kini menyusut sesuai konten beserta padding dan tetap berada di tengah setiap slot kisi yang diskalakan. Ukuran judul popup digandakan dan detail judul diperbesar tiga puluh persen.

## Detail kartu Pustaka yang terpadu

Setiap lapisan Pustaka kini menampilkan definisi melalui struktur detail judul popup bersama, menempatkan cakupan di samping judul, menggunakan kontrol tutup standar dan ikon navigasi SVG, serta menampilkan pratinjau definisi tertaut secara konsisten. Varian berarah di tepi kisi beralih ke atas agar tidak menimpa baris berikutnya atau sebelumnya.

## Komposisi lengkap dan navigasi Study yang stabil

Referensi komposisi Pustaka kini digabungkan berdasarkan peran presentasi dan mempertahankan posisi yang ditentukan, sehingga partikel tetap berada dalam komposisi lengkap yang sama alih-alih muncul di bawah judul duplikat. Pelipatan subnavigasi Study kini memakai ambang histeresis yang memperhitungkan tinggi header agar perubahan gulir akibat tata letak tidak membuka dan menutup navigasi utama secara cepat.

## Referensi Pustaka dalam satu lapisan

Skema dan paket konten Pustaka dapat secara eksplisit menghubungkan satu entri ke entri lain pada lapisan yang sama. Tautan tersebut kini secara default ditampilkan sebagai komposisi, sedangkan varian berarah dan hubungan yang secara eksplisit ditandai sebagai ejaan alternatif tetap mempertahankan perilakunya.

## Kisi Pustaka minimal yang seimbang

Kisi Pustaka minimal kini membatasi lebar keseluruhan bagan berdasarkan ukuran baris yang diminta serta menskalakan tinggi kartu, ruang dalam, dan teks utama secara proporsional. Posisi kosong eksplisit dirender sebagai sel kisi tersembunyi yang memiliki dimensi agar kana berikutnya tetap berada pada kolom yang diminta.

## Commit

- [00072b1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/00072b1fcccbf14a647f48d5fb5b293f72e27332)
- [e1584351](https://github.com/Cognis-Labs-HQ/Cognis/commit/e1584351d43f0337d3aba919e5c369a50be4f69e)
- [dfbc9b22](https://github.com/Cognis-Labs-HQ/Cognis/commit/dfbc9b22569c7f426d08f075c8ac79e80fa7e165)
- [98eb5217](https://github.com/Cognis-Labs-HQ/Cognis/commit/98eb5217e93fcd9cf765f3461e78080d9e33fd74)
- [a6bb913b](https://github.com/Cognis-Labs-HQ/Cognis/commit/a6bb913bf18284dd5bd7f172994ec41fdacb78d6)
- [8ec16aee](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ec16aee27bb9ba6e4d3b1461d30bb9b1003020f)
- [c7a41d2c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7a41d2c3933afa6502a7633b1f6089c816e7c8e)
- [c2b80b54](https://github.com/Cognis-Labs-HQ/Cognis/commit/c2b80b5468ee6acfcb2e525fcdbcfd6df7865f5d)
- [d07ce255](https://github.com/Cognis-Labs-HQ/Cognis/commit/d07ce255cc0f65d5402f264a21574155c11c853d)
- [92da28e2](https://github.com/Cognis-Labs-HQ/Cognis/commit/92da28e2f01c823c14ca435c44d3f47cfebede9e)
