# Persetujuan Berbagi Jitsi

**Cabang Fitur:** feature-expose-capability-for-jitsi-meet-module

## Jitsi Meet dapat meminta persetujuan berbagi

Gateway Share kini menyediakan orkestrasi permintaan persetujuannya sebagai kapabilitas `share:requestApproval`, termasuk nama tampilan pemohon yang dikirim pemanggil untuk persetujuan penambahan peserta Jitsi Meet. Dengan demikian, modul dapat diaktifkan dan memakai alur persetujuan yang sudah ada.

## Dialog persetujuan mendukung konteks

Pemanggil kapabilitas dapat menentukan tindakan persetujuan dan target, misalnya menambahkan peserta ke rapat bernama. Jika tidak diberikan, dialog tetap memakai tindakan tautan berbagi dan jenis sumber daya sebagai target.

## Lampu kehadiran bertahan saat navigasi

Gaya ketersediaan profil kini dipertahankan sebagai gaya shell dasbor, bukan gaya milik rute. Karena itu, meninggalkan Jitsi Meet tidak lagi menghapus lampu kehadiran dari avatar navigasi atau permukaan profil lainnya.

## Komit implementasi

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b7c97f73
- https://github.com/Cognis-Labs-HQ/Cognis/commit/48c243e6
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e28efff
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d1c9f348
