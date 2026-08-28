# Catatan Perubahan PR

**Feature Branch:** copilot/update-ctx-usage-implementation

## Ringkasan

Wiring rute API inti dan beberapa jalur bootstrap gateway/adaptor dipindahkan ke
akses kapabilitas berbasis ctx.

Helper auth kini diekspos sebagai kapabilitas route context sehingga factory
rute API dan routing module extension tidak lagi mengimpor internal gateway auth
secara langsung. Kode bootstrap gateway dan adaptor sekarang lebih mengutamakan
pencarian kapabilitas ctx untuk akses DB dan pengkabelan lintas komponen
lainnya.

Lintasan lanjutan ini mendorong penggunaan ctx lebih jauh ke rute adaptor,
modul bahasa Study, dan rute UI/API milik gateway, sekaligus memperjelas
dokumentasi kontribusi kapabilitas di lokasi kontributornya. Referensi internal
workspace ke `@cognis/core` juga disejajarkan agar `npm install` kembali
menyelesaikan paket workspace lokal dengan benar.

Pembaruan ini juga memperbaiki urutan bootstrap API agar token akses CLI baru
diterbitkan setelah kapabilitas auth berhasil diambil dari ctx, sehingga
`ReferenceError` saat startup di `src/api/main.ts` tidak lagi terjadi.

## Komponen dan Berkas yang Diubah

- Wiring kapabilitas inti/API dan route context:
    - `src/core/services/gateway-service.ts`
    - `src/api/reuse/route-context.ts`
    - `src/api/server.ts`
    - `src/api/main.ts`
    - `src/modules/routes/module-extensions.ts`
- Factory rute API dipindahkan ke route context yang diinjeksi:
    - `src/api/routes/search/index.ts`
    - `src/api/routes/modules/index.ts`
    - `src/api/routes/gateways/index.ts`
    - `src/api/routes/system/index.ts`
    - `src/api/routes/users/index.ts`
    - `src/api/routes/ui/index.ts`
- Pembersihan kapabilitas ctx pada gateway/adaptor:
    - `src/gateways/auth/bootstrap.ts`
    - `src/gateways/logging/bootstrap.ts`
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/routes/notifications.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/notify/internal/routes.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/messages/routes.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/social/profile/routes/index.ts`
    - `src/adapters/social/profile/routes/social.ts`
    - `src/adapters/social/profile/routes/files.ts`
    - `src/adapters/social/profile/routes/preferences.ts`
    - `src/adapters/social/profile/routes/posts.ts`
    - `src/adapters/study/classes/index.ts`
    - `src/adapters/study/classes/routes.ts`
    - `src/modules/study/languages/en/index.ts`
    - `src/modules/study/languages/ja/index.ts`
    - `src/gateways/study/gateway.ts`
- Instruksi dan pelacakan versi:
    - `.github/copilot-instructions.md`
    - `src/api/bootstrap/gateway.ts`
    - `src/docs/versions.en.md`
    - manifes `package.json` adaptor/modul yang kini menunjuk ke `@cognis/core@0.1.1` lokal

## Commits

- [feb1bbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/feb1bbc)
- [c6ba65b](https://github.com/Cognis-Labs-HQ/Cognis/commit/c6ba65b)
- [acaded15](https://github.com/Cognis-Labs-HQ/Cognis/commit/acaded15)
- [e7255fe0](https://github.com/Cognis-Labs-HQ/Cognis/commit/e7255fe0)
- [a68ab2ab](https://github.com/Cognis-Labs-HQ/Cognis/commit/a68ab2ab)
