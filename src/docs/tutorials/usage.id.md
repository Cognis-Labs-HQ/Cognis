# Penggunaan

Prosedur praktis untuk Tutorial Terpandu.

## Prasyarat

Tinjau [persyaratan akses](/docs/tutorials) sebelum menjalankan prosedur ini.

## Contoh

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

Contoh ini memakai antarmuka Tutorial Terpandu yang didokumentasikan. Periksa respons atau keadaan tersimpan yang dijelaskan dalam [Teknis](/docs/tutorials/technical) sebelum mengulangi operasi tulis.

## Pemecahan Masalah

Jika Tutorial Terpandu tidak tersedia, periksa status masuk dan minta administrator memeriksa komponen beserta dependensinya.
