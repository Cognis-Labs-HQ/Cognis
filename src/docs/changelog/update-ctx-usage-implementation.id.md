# Catatan Perubahan PR — Menjadikan Ctx Tulang Punggung Kapabilitas

## Ringkasan

Wiring rute API inti dan beberapa jalur bootstrap gateway/adaptor dipindahkan ke
akses kapabilitas berbasis ctx.

Helper auth kini diekspos sebagai kapabilitas route context sehingga factory
rute API dan routing module extension tidak lagi mengimpor internal gateway auth
secara langsung. Kode bootstrap gateway dan adaptor sekarang lebih mengutamakan
pencarian kapabilitas ctx untuk akses DB dan pengkabelan lintas komponen
lainnya.

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
    - `src/gateways/db/bootstrap.ts`
    - `src/gateways/notify/bootstrap.ts`
    - `src/gateways/notify/gateway.ts`
    - `src/gateways/registration/bootstrap.ts`
    - `src/gateways/social/bootstrap.ts`
    - `src/gateways/study/bootstrap.ts`
    - `src/adapters/notify/internal/index.ts`
    - `src/adapters/social/messages/index.ts`
    - `src/adapters/social/profile/index.ts`
    - `src/adapters/study/classes/index.ts`
- Instruksi dan pelacakan versi:
    - `.github/copilot-instructions.md`
    - `src/api/gateway-bootstrap.ts`
    - `src/docs/versions.en.md`

## Commits

- [feb1bbc](https://github.com/le-firehawk/Cognis/commit/feb1bbc)
- [c6ba65b](https://github.com/le-firehawk/Cognis/commit/c6ba65b)
