# Penggunaan

Prosedur praktis untuk Modul Eksternal.

## Prasyarat

Administrator memerlukan sumber tepercaya dan dependensi kompatibel.

## Contoh

Pasang paket tepercaya, tinjau pengaturan serta izin, aktifkan, lalu periksa halaman atau tindakannya.

Repositori mendeklarasikan identitas stabil dan titik masuk bootstrap di `manifest.json`:

<!-- prettier-ignore -->
```json
{
  "uuid": "123e4567-e89b-42d3-a456-426614174000",
  "id": "example-module",
  "version": "1.0.0",
  "entrypoints": { "bootstrap": "bootstrap.js" }
}
```

Bootstrap menyumbangkan perilaku hanya melalui konteks terbatasnya dan mengembalikan pembersihan untuk sumber daya miliknya:

<!-- prettier-ignore -->
```js
export async function bootstrapModule(ctx) {
  ctx.registerFlow({ id: 'example-module:constructPage', stages: ['content'] });
  ctx.flow.extend('example-module:constructPage', 'content',
    { id: 'example-module:content' }, async () => ({ ready: true }));
}
```

Administrator memasang repositori dari **Modul**, meninjau integritas dan dependensinya, mengaktifkannya secara eksplisit, lalu dapat menonaktifkannya untuk menghapus semua perilaku UI dan backend yang terdaftar tanpa memulai ulang Cognis.

## Hasil yang Diharapkan

Siklus hidup modul memiliki rute dan registrasi; penonaktifan menghapus kontribusinya.

## Pemecahan Masalah

Periksa validasi paket, dependensi, dan log. Deklarasi fitur tidak memberi akses ke implementasi privat komponen lain.
