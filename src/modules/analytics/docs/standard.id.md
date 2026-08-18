# Analytics Content

Konten milik modul berada di bawah path modul dan hanya dimuat saat modul diaktifkan.

## Distribusi eksternal

Analytics bersifat mandiri untuk dipisahkan ke `Cognis-Labs-HQ/cognis-module-analytics`. Manifesnya menyatakan `db:executor` dalam `requiresCapabilities`; modul tidak boleh dimulai sebelum Cognis menyediakan kapabilitas tersebut. Manifes root, paket, rute, lisensi, aset, CLI, API, UI, migrasi, dokumentasi terjemahan, dan hash integritas didistribusikan bersama.
