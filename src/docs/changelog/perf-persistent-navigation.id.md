# Navigasi Tetap Terlihat

**Cabang Fitur:** perf-persistent-navigation

## Navigasi Tetap Terlihat

Pemuatan rute menutupi ruang kerja yang terdampak sementara bagian kepala dan navigasi tetap terlihat. Pemuatan dokumen langsung tetap memakai tampilan pemuatan seluruh halaman. Navigasi yang digantikan segera melepaskan token pemuatannya; konten tertunda dan galat tetap ditampilkan melalui tampilan pemuatan dan galat yang tersedia.

Setiap penyusunan antarmuka mengambil preferensi terkini satu kali untuk kontrol tema dan bahasa serta menjadwalkan satu pembaruan avatar setelah penyedia siap. Elemen avatar yang tidak berubah dipertahankan. Hasil terlambat ditolak setelah akun, token, penyedia, atau pembaruan berubah. Tidak ada cache respons pribadi baru.

## Komit

- [ab071e280a6109d8d617e006fba9f2fe80419548](https://github.com/Cognis-Labs-HQ/Cognis/commit/ab071e280a6109d8d617e006fba9f2fe80419548)
