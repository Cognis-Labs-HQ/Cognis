function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function renderCodeBlocks(markdown) {
  return markdown.replace(/```([\s\S]*?)```/g, (_match, block) => `<pre><code>${escapeHtml(block.trim())}</code></pre>`);
}

export function renderMarkdown(markdown) {
  const withCode = renderCodeBlocks(markdown);
  return withCode
    .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
    .replace(/^-\s+(.*)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
    .replace(/\n\n/g, '<p></p>');
}
