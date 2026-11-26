# Referensi Teknis

Core mendefinisikan eksekusi ctx, siklus hidup komponen, dan kontrak tipe netral penyedia.

## Antarmuka

`createCtx()` menyediakan registrasi/pencarian kapabilitas dan flow bertahap. `ctx.flow.exists`, `extend`, dan `run` menangani flow bernama; hasilnya memuat `data` dan `stageResults`. `system:contracts` merupakan registry kontrak runtime berversi milik pemilik domain. `AuthAccountStore`, `AccessRole`, dan `RoleAccessPolicy` adalah tipe ekspor, bukan ID kapabilitas yang otomatis terdaftar.

## Konfigurasi

Host memasok penyimpanan dan registry. Manifes modul menyatakan UUID tetap, dependensi, dan titik masuk. Pengaturan koneksi ada pada [DB](/docs/gateways/db/technical); urutan dan pemeriksaan peran ada pada [Kebijakan Akses](/docs/acl-matrix/technical).

## Perilaku

Layanan gateway dan modul memuat kontribusi dalam lingkup pemilik. Disposisi menghapus registrasi; bootstrap gagal membatalkannya. Flow menjalankan tahap yang dideklarasikan secara berurutan dan mengumpulkan hasil untuk handler berikutnya. Instalasi, pengaktifan, serta penghapusan modul mengikuti siklus hidup host, bukan impor implementasi komponen lain.

## Keamanan

Siklus hidup dan resolusi struktur kontrak tidak mengotorisasi operasi sumber daya. Pemilik memvalidasi akun, peran, serta sumber daya sebelum pekerjaan terlindungi. Modul eksternal menerima kontrak publik terbatas, bukan akses bebas ke internal host.

## Referensi

- [src/core/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/index.ts)
- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/core/contracts/auth-account.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/auth-account.ts)
- [src/core/contracts/access-policy.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/contracts/access-policy.ts)
