# Cognis UI

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
- Preferensi halaman pengguna menggunakan `/api/v1/users/:accountId/preferences/:pageId`.

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
