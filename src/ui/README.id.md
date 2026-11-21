# Cognis UI

Pengiriman implisit formulir yang terikat ditangani di tempat tanpa meminta dokumen browser. Penangan pengiriman komponen tetap menerima kejadian tersebut. Pengalihan internal menggunakan router SPA; tujuan yang dirender server tetap menghormati keputusan perubahan belum tersimpan dan memeriksa kembali ketersediaan offline saat dilanjutkan.

`openPopup({ signal })` mengikat popup pada pemiliknya. Pembatalan sinyal menutup popup beserta konfirmasi pembuangan dan membersihkan pendengar, pewaktu, pelacakan formulir serta kunci gulir. Pembuangan pemilik tidak meminta untuk mempertahankan isi dari halaman atau identitas yang sudah tidak berlaku. Upaya pembatalan bersamaan berbagi satu keputusan.

## Struktur

- `src/layouts/`: pembatas tata letak halaman yang dapat digunakan ulang.
- `src/reuse/`: utilitas bersama.
- `public/templates/`: template HTML yang diimpor oleh JS dan disajikan sebagai aset statis.
- `src/app/`: perilaku halaman (permukaan aplikasi study, login, docs, admin/settings/modules).

## Model UX

Halaman (kecuali login) harus dirender melalui modul layout agar pembatas baris/kolom tetap konsisten sementara kustomisasi widget tetap fleksibel.

## Fitur berbasis API

- Login menggunakan `/api/v1/auth/login`.
- UI dokumentasi produk membaca `/api/v1/docs`.
- Preferensi halaman pengguna menggunakan `/api/v1/social/users/:accountId/preferences/:pageId`.

## Internasionalisasi (i18n)

Semua teks yang terlihat oleh pengguna harus diselesaikan melalui helper i18n — jangan pernah di-hardcode di JS atau template HTML.

### Menambahkan string baru

1. Tambahkan pasangan key/value ke setiap paket bahasa di `src/ui/languages/<locale>/strings.xml`, mulai dari `en`:

    ```xml
    <string name="ui.app.mypage.my_label">My label</string>
    ```

2. Gunakan key `ui.reuse.*` untuk label yang muncul di lebih dari satu halaman, dan `ui.app.<page>.*` untuk teks khusus halaman.

3. Ambil nilainya di JS dengan `i18n.t()`:

    ```js
    const i18n = await createI18n();
    element.textContent = i18n.t("ui.app.mypage.my_label");
    ```

4. Untuk template HTML statis, tambahkan atribut `data-i18n` dan panggil `applyStaticTranslations(i18n)` sekali setelah render:

    ```html
    <span data-i18n="ui.app.mypage.my_label"></span>
    ```

    ```js
    applyStaticTranslations(i18n, root);
    ```

    Gunakan `data-i18n-placeholder` untuk atribut `placeholder` dan `data-i18n-aria-label` untuk atribut `aria-label`.

### Atribut yang didukung

| Atribut                 | Mengatur              |
| ----------------------- | --------------------- |
| `data-i18n`             | `element.textContent` |
| `data-i18n-placeholder` | `element.placeholder` |
| `data-i18n-aria-label`  | `element.ariaLabel`   |

### Berkas bahasa

Paket bahasa berada di `src/ui/languages/<iso>/strings.xml`. Runtime memuatnya saat dibutuhkan dan menyimpannya dalam cache selama sesi. Preferensi bahasa pengguna disimpan di `localStorage` dan cookie, serta dapat diubah melalui halaman Settings.

Urutan fallback: bahasa yang dipilih (sesuai prioritas) → `en`.

### Penegakan

`src/ui/tests/hardcoded-strings.test.js` menjalankan dua pemeriksaan:

- **Quoted string literals** — menandai string multi-kata dalam literal berpetik tunggal/ganda yang terlihat sebagai teks pengguna dan bukan referensi key.
- **HTML template text nodes** — memindai template literal untuk teks literal di antara tag HTML (mis. `<th>ID</th>`) dan menandai yang berisi karakter alfabet tanpa panggilan `i18n.t()` tersisip.

Jalankan dengan:

```
node --test src/ui/tests/hardcoded-strings.test.js
```

Semua kode yang dikomit di `src/ui/app` dan `src/ui/layouts` harus lulus kedua pemeriksaan.

## Penyuntingan preferensi lanjutan

Panel Lanjutan → Preferensi menampilkan dokumen preferensi antarmuka lengkap sebagai JSON setelah konfirmasi keamanan satu kali yang disimpan di profil pengguna pada server. Perubahan yang valid disimpan dan diterapkan melalui sistem preferensi biasa. Data pengakuan catatan rilis disimpan secara terpisah agar tidak memenuhi dokumen ini.

Overlay halaman dipasang pada badan dokumen agar posisi viewport tidak dipengaruhi filter latar dan blok pembatas ruang kerja. Papan gambar tetap dibatasi area halaman yang terlihat dan mempertahankan posisi hasil seretan saat menggulir.

## Kontrol Administrasi

Di Administrasi → Komponen, label status, indikator kesehatan, dan sakelar daya menggunakan lebar sesuai isinya. Baris komponen yang sempit menempatkan nama di atas kontrol dan mempertahankan kontrol pembuka detail di sampingnya; kontrol dapat membungkus dalam lebar baris yang tersedia. Nama panjang, label status, dan detail versi tetap dapat dibaca.

Sakelar daya dan kontrol pembuka detail memiliki area tekan setinggi 44 piksel. Tab memfokuskan sakelar yang tersedia, Spasi mengubahnya, dan garis fokus mengikuti penggeser yang terlihat. Gateway wajib serta adapter terkunci atau tidak tersedia tetap memiliki kontrol yang dinonaktifkan. Tutorial Komponen menjelaskan penggunaan papan ketik dan tetap memakai target sakelar, pembuka detail, metadata, dan konfigurasi yang sama.

## Judul Formulir Bersama

Pembuat formulir bersama mengelompokkan setiap judul kolom dan penanda wajibnya dalam satu wadah teks. Label dapat membungkus pada formulir sempit; penanda menggunakan spasi tanpa pemisah baris dan tetap sejajar, bukan menjadi bagian kisi tersendiri. Label kontrol asli, atribut wajib, tautan pada label, dan tombol keterangan tetap berfungsi. `setFieldRequired` memperbarui judul yang sama untuk kolom teks, pilihan, area teks, kotak centang, dan tombol radio.
Judul mencegah pemisahan antara isi dan penandanya, sementara teks label di dalamnya tetap dapat membungkus, termasuk kata panjang tanpa spasi.

Judul formulir tetap berada dalam kolom yang sama. Target dan alur panduan Kalender serta Berbagi tidak berubah; tidak diperlukan tindakan atau langkah panduan baru.

## Label Formulir Kata Sandi

Formulir kata sandi lintas komponen memakai `ui.reuse.password_requirements` dan `ui.reuse.passwords_match` dari katalog XML host. Auth dan Registration menggunakan kunci yang sama dalam bahasa Inggris, Jerman, Indonesia, dan Jepang. Rilis katalog host bersama Auth 2.2.13 dan Registration 1.2.9; integrasi yang memakai label ini harus beralih ke kunci bersama. Resolusi kunci Inggris yang sama tetap ketat dan gagal secara eksplisit jika nilai Inggris hilang atau kosong.

## Bantuan Kontekstual

Gunakan `renderInfoTooltip(localizedText, localizedLabel, optionalId)` di samping label atau judul yang ada. Ambil teks bantuan dan label tombol dari katalog XML pemiliknya; gunakan teks biasa untuk deskripsi. Komponen bantuan bersama ini tidak memiliki versi komponen tersendiri.

Arahkan penunjuk ke tombol informasi atau fokuskan tombol untuk membaca bantuan. Bantuan tetap terbuka selama tombol memiliki fokus atau penunjuk berada di tombol maupun panel. Memasuki tombol bantuan lain memilih penjelasan tersebut; saat meninggalkannya, penjelasan lain yang masih difokuskan atau ditunjuk akan muncul kembali. Escape menutup bantuan tanpa memindahkan fokus atau menghentikan penangan Escape lainnya. Interaksi yang ditutup harus berakhir sebelum tombol tersebut dapat membuka bantuan lagi. Menggulir dan mengubah ukuran tetap menutup panel.
Saat fokus papan ketik mengganti penjelasan sementara penunjuk tetap di panel bersama, interaksi penunjuk tersebut menjadi milik penjelasan yang baru ditampilkan sampai penunjuk meninggalkan panel atau bantuan ditutup.

Panel yang tidak dapat menerima fokus menggunakan `role="tooltip"`; tombol aktif menambahkan ID panel ke `aria-describedby` tanpa mengganti deskripsi lain. Menghapus tombol menutup bantuannya. Penggantian dokumen melepaskan pendengar dan pengamat lama, dan meninggalkan halaman membersihkan bantuan aktif. Panel tetap bertema mempertahankan aturan penempatannya serta menjembatani celah dengan area penunjuk transparan, tanpa pemanggilan balik tertunda.

Tutorial halaman yang ada mempertahankan label, sasaran, dan alurnya: bantuan tetap tersedia di samping kontrol yang sama, tanpa tindakan atau langkah tutorial baru. Panduan: [konten saat ditunjuk atau difokuskan dari W3C](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html) dan [pola tooltip APG](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/). Pola APG masih dalam pengembangan tanpa konsensus kelompok kerja. Pengujian peristiwa DOM tidak menyatakan kepatuhan, geometri tampilan nyata, perilaku sentuhan, atau keluaran teknologi bantu.
