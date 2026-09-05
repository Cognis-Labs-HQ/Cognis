# Detail entri Pustaka berbasis rute

**Cabang Fitur:** feature-refactor-app.js-for-popup-implementation

## Popup entri dengan tautan langsung

Entri Pustaka kini dibuka sebagai popup berbasis rute yang dapat disusun, dengan seluruh metadata yang tersedia, tautan relasi, tindakan kontribusi, serta navigasi sebelumnya/berikutnya.

## URL Pustaka yang bersih

Identitas entri kini disimpan dalam status riwayat browser, bukan bilah alamat. Penyegaran dan navigasi browser mempertahankan popup aktif, sedangkan tautan langsung lama dialihkan ke URL Pustaka yang bersih.

## Penyegaran halaman yang andal

Pemuatan langsung Pustaka kini memakai siklus entri halaman terautentikasi bersama, sehingga penyedia UI dan alur pemuatan halaman siap sebelum Pustaka dipasang.

## Commit

- https://github.com/Cognis-app/Cognis/commit/f29be454
- https://github.com/Cognis-app/Cognis/commit/3695db82
- https://github.com/Cognis-app/Cognis/commit/fbf97f59
