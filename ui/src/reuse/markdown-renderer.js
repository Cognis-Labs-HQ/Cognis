function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export function renderMarkdown(markdown) {
  const lines = markdown.split('\n');
  const html = [];
  let inCode = false;
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith('```')) {
      if (!inCode) {
        if (inList) { html.push('</ul>'); inList = false; }
        html.push('<pre><code>');
        inCode = true;
      } else {
        html.push('</code></pre>');
        inCode = false;
      }
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(raw)}\n`);
      continue;
    }

    if (line.startsWith('- ')) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push('</ul>');
      inList = false;
    }

    if (line.startsWith('### ')) { html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`); continue; }
    if (line.startsWith('## ')) { html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('# ')) { html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`); continue; }

    if (line.length === 0) {
      html.push('');
    } else {
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
  }

  if (inList) html.push('</ul>');
  if (inCode) html.push('</code></pre>');
  return html.join('\n');
}
