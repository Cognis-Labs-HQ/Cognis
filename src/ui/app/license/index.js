import { applyDocumentTitle, createI18n } from '../../reuse/i18n.js';
import { loadMarkdownDocumentHtml } from '../../reuse/markdown-document.js';
import { createPageComposer } from '../../reuse/page-composer.js';

const root = document.querySelector('#app');
const i18n = await createI18n();
applyDocumentTitle(i18n, 'ui.page.title.license');

let activeHtml = '';

function renderLicense() {
    const docEl = root.querySelector('#doc');
    if (docEl) docEl.innerHTML = activeHtml;
}

const elements = [
    {
        id: 'license-reader',
        label: i18n.t('ui.app.license.page_title'),
        gridSize: { default: [4, 8], min: [2, 4], max: 'full' },
        render: () => `<article id="doc" class="content-panel"></article>`,
    },
];

const composer = createPageComposer(root, {
    allowCustomization: false,
    elements,
    preferenceKey: 'license-layout',
    i18n,
    onRender: renderLicense,
    pageContext: {
        title: i18n.t('ui.app.license.page_title'),
        subtitle: i18n.t('ui.app.license.page_subtitle'),
    },
});
await composer.init();

activeHtml = await loadMarkdownDocumentHtml('/api/v1/system/license');
renderLicense();
