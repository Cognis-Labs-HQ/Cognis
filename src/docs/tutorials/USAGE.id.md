# Penggunaan

Prosedur praktis untuk Tutorial Terpandu.

## Prasyarat

Masuk untuk penyelesaian terikat akun; tindakan opsional hanya muncul saat tersedia.

## Contoh

Mulai panduan, ikuti sorotan, gunakan Kembali atau Berikutnya, lalu selesaikan; ulangi lewat kontrol header sama.

```ts
export async function mountProvider(ctx) {
    const tutorials = ctx.capabilities.get("ui:tutorials");
    if (tutorials?.version !== 1)
        throw new Error("tutorial_contract_unavailable");
    const owner = tutorials.owner("module.example", {
        signal: ctx.signal,
        stringsBaseUrls: ["/static/modules/example/languages"],
    });
    try {
        const target = await owner.target("primary", {
            root: () => document.querySelector(".example-panel"),
            resolve: () =>
                document.querySelector(".example-panel [data-example-primary]"),
        });
        const play = await owner.register({
            version: 1,
            page: "/example",
            id: "introduction",
            titleKey: "module.example.tutorial.title",
            steps: [
                {
                    id: "primary",
                    highlightNext: false,
                    target: target.id,
                    titleKey: "module.example.tutorial.primary.title",
                    bodyKey: "module.example.tutorial.primary.body",
                    effects: { callout: true, arrow: true, spotlight: true },
                    interaction: "target",
                    advance: { event: "click" },
                },
            ],
        });
        ctx.capabilities.contribute("example:tutorial", play);
        return owner.dispose;
    } catch (error) {
        owner.dispose();
        throw error;
    }
}
```

## Hasil yang Diharapkan

Penyelesaian tetap tersimpan pada akun; pemutaran ulang tidak perlu mengatur ulang preferensi.

## Pemecahan Masalah

Periksa halaman aktif dan kontrol terlihat. Menutup dialog opsional dapat mengembalikan panduan ke cabangnya.
