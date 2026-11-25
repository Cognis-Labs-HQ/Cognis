# Referensi Teknis

Cognis memisahkan orkestrasi host, gateway domain, adaptor, dan modul yang dipasang secara eksternal.

## Antarmuka

[Core](/docs/core/technical) mengekspor ctx dan kontrak siklus hidup. [API](/docs/api/technical) menangani HTTP. [Gateway](/docs/gateways/technical) mendaftarkan operasi domain, dan [adaptor](/docs/adapters/technical) mengimplementasikan perilaku penyedia atau domain. Profile serta Messages adalah adaptor Social. Kontribusi browser memakai kontrak [UI](/docs/ui/technical).

## Konfigurasi

Lingkungan host menentukan akar gateway/adaptor, koneksi basis data, dan penyimpanan. Administrasi menentukan komponen opsional aktif. Sumber serta instalasi eksternal dijelaskan pada [Modul](/docs/modules/external/technical); preferensi akun tidak memilih basis data server.

## Perilaku

Manifes menentukan urutan dependensi. Bootstrap menyumbang kapabilitas publik, flow, rute, dan metadata UI. Konsumen meresolusikan registrasi, bukan mengimpor implementasi komponen lain. Lingkup pemilik menghapus kontribusi gagal atau nonaktif. Docs menemukan bundel lokal lengkap serta versinya dari metadata komponen publik.

## Keamanan

Lapisan arsitektur menentukan kepemilikan, bukan hak akses menyeluruh. Akun, tamu berbagi, dan modul eksternal memiliki kebijakan terpisah. Setiap operasi sumber daya memeriksa otorisasi terkini dari pemiliknya.

## Referensi

- [src/core/ctx/types.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/core/ctx/types.ts)
- [src/api/bootstrap/gateway.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/api/bootstrap/gateway.ts)
- [src/gateways/shared.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/gateways/shared.ts)
