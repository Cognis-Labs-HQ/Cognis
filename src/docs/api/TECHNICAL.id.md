# Referensi Teknis

Host HTTP mengirim permintaan ke rute terdaftar serta menyediakan penemuan komponen dan dokumentasi berversi.

## Antarmuka

`GET /api/v1/system/healthcheck` merupakan pemeriksaan keaktifan ringan. `GET /api/v1/system/health` menyertakan kesehatan komponen. `GET /api/v1/ui/capability-providers` memfilter penyedia berdasarkan sesi dan akses; pemanggil anonim hanya menerima penyedia publik tanpa kebijakan peran.

Metode dokumentasi, bidang respons, dan pemilihan bahasa dijelaskan dalam [referensi server](/docs/components/api/technical). Endpoint domain dimiliki [Auth](/docs/gateways/auth/technical), [Calendar](/docs/gateways/calendar/technical), [Share](/docs/gateways/share/technical), dan komponen terkait.

## Konfigurasi

Runtime sumber membaca `PORT` (bawaan `3000`) dan `LISTEN_HOST` (bawaan `0.0.0.0`). `COGNIS_GATEWAYS_ROOT` serta `COGNIS_ADAPTERS_ROOT` mengubah akar penemuan. Pengaturan kontainer dan koneksi tersedia di [DevOps](/docs/devops/technical); pengaturan driver ada pada [DB](/docs/gateways/db/technical).

## Perilaku

Bootstrap memuat rute gateway dan deskriptor UI. Rute host mengirim permintaan HTTP; pemilik domain menangani validasi, penyimpanan, dan otorisasi. Penemuan browser mengikuti sesi dan diperbarui saat identitas berubah. Pemeriksaan keaktifan publik tidak menjalankan pemeriksaan komponen opsional yang lambat.

## Keamanan

Klaim sesi/Bearer dan kebijakan rute diperiksa sebelum pekerjaan terlindungi. Peran tidak menggantikan pemeriksaan sumber daya. Kredensial, payload pribadi, dan keputusan otorisasi tidak boleh berada dalam dokumentasi publik atau URL diagnostik.

## Referensi

- [src/api/main.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/main.ts)
- [src/api/server.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/server.ts)
- [src/api/reuse/route-registry.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/reuse/route-registry.ts)
- [src/api/routes/docs/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/routes/docs/index.ts)
