# Referensi Teknis

Antarmuka publik dan aturan operasional Adapter.

## Antarmuka

Adapter menyediakan factory dan hook sesuai kontrak gateway. Basis data memakai factory executor terstruktur, autentikasi AuthProviderAdapter, dan notifikasi metadata serta diagnosis pengiriman.

## Konfigurasi

Adapter mendeklarasikan pengaturan lewat gateway. Penyedia autentikasi, notifikasi, dan basis data berbeda skema; manifes saja tidak membuktikan koneksi terimplementasi.

## Perilaku

OIDC dan SAML dalam sumber ini memerlukan klien protokol terinjeksi. Formulir tidak membuat klien; periksa Teknis adapter sebelum penerapan.

### Ikhtisar

`src/adapters/` berisi semua implementasi spesifik penyedia dari antarmuka gateway. Adapter adalah kelas konkret yang mengimplementasikan kontrak yang didefinisikan di `src/core/` atau gateway. Mengganti backend database berarti mengubah `DB_TYPE` di environment; tidak ada kode aplikasi di luar gateway yang berubah.

Setiap adapter berada di bawah `src/adapters/<gateway-id>/<adapter-id>/` dan membawa `package.json`, tes, dan dokumentasinya sendiri. Gateway yang memiliki menemukan adapter dengan memindai direktori tersebut saat startup.

### Tanggung Jawab

- Mengimplementasikan antarmuka gateway untuk penyedia eksternal tertentu.
- Mengelola detail koneksi spesifik penyedia, dialek SQL, dan penanganan error secara internal.
- Membawa SQL inisialisasi skema sendiri (untuk adapter DB).
- Membawa tes, dokumentasi, dan manifes versi sendiri.

### Konvensi Struktur File

Field `main` dalam `package.json` harus selalu menunjuk ke `index.ts` — ini adalah titik masuk yang mengorkestrasikan adapter dan file yang diimpor secara dinamis oleh gateway:

```json
{
    "name": "@cognis/adapter-notify-smtp",
    "version": "0.2.1",
    "private": true,
    "type": "module",
    "main": "index.ts"
}
```

`index.ts` adalah permukaan publik adapter dan mengekspor semua yang dibutuhkan pemanggil eksternal. File implementasi internal berada sebagai saudara dari `index.ts` dan tidak pernah diimpor langsung dari luar adapter.

### Titik Ekstensi

Untuk menambahkan adapter baru untuk gateway yang ada, buat direktori di bawah `src/adapters/<gateway-id>/<adapter-id>/` berisi:

- Implementasi adapter (kelas TypeScript yang mengimplementasikan antarmuka gateway).
- `package.json` dengan `name`, `version`, dan field `main`.
- Fungsi `createAdapter()` yang diekspor.
- `docs/index.en.md` mengikuti standar dokumentasi.
- Tes di bawah `tests/`.

## Keamanan

Adapter memiliki rahasia transportasi dan kontrak. Pengujian tidak membocorkan kata sandi; penonaktifan membersihkan registrasi.

## Referensi

- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
