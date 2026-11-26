# Penggunaan

Prosedur praktis untuk Sistem Inti.

## Prasyarat

Ketersediaan bergantung pada komponen terpasang serta dependensi wajib.

## Contoh

Periksa dependensi, aktifkan komponen yang diizinkan, lalu pastikan tindakannya muncul di halaman pemilik.

```ts
const record = ctx.requireCapability("engagement:recordActivity");
await record(activity);
```

## Hasil yang Diharapkan

Fitur menyediakan kapabilitas selama masa aktif; penonaktifan menghapus registrasinya.

## Pemecahan Masalah

Perbaiki dependensi alih-alih mengimpor implementasi komponen lain atau melewati siklus hidupnya.
