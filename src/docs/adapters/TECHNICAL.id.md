# Referensi Teknis

Adaptor menyediakan implementasi, registrasi, dan konfigurasi milik gateway untuk fitur yang terpasang.

## Antarmuka

Adaptor berada di `src/adapters/<gateway>/<adapter>/`. Titik masuk paket mengekspor factory atau hook bootstrap yang diperlukan gateway. Hook opsional `defineContracts(ctx)` mendeklarasikan kontrak runtime milik adaptor melalui `system:contracts`.

## Konfigurasi

Pengaturan penyedia berasal dari skema konfigurasi dan rute gateway pemilik. Kredensial, status aktif, dan kebutuhan koneksi bergantung pada adaptor. [Kontrak gateway](/docs/gateways/technical) menjelaskan penemuan serta siklus hidup.

## Perilaku

Adaptor dapat memiliki penyimpanan domain, rute, dan UI: Social Profile merupakan adaptor Social, bukan gateway. Driver basis data menjalankan perintah terstruktur; skema akun, profil, dan pesan dimiliki komponen domainnya. Registrasi adaptor terikat pada lingkup pemilik dan dihapus ketika pemuatan gagal atau adaptor dinonaktifkan.

## Keamanan

Tindakan lintas komponen memakai kapabilitas atau flow ctx publik. Impor paket atau adaptor aktif tidak memberikan otorisasi pengguna. Diagnostik penyedia tidak boleh mengungkap kredensial.

## Referensi

- [src/gateways/reuse/adapter-bootstrap.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/reuse/adapter-bootstrap.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
- [src/adapters/social/profile/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/social/profile/index.ts)
