export const DEFAULT_FONT = 'Orbitron';
export const DEFAULT_FONT_SIZE = 12;
const FALLBACK_FONTS = [DEFAULT_FONT, 'Inter', 'Arial', 'sans-serif'];

export function toFontFamilyValue(font) {
  if (!font) return DEFAULT_FONT;
  return /^[a-zA-Z0-9-]+$/.test(font) ? font : `"${font.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function parseSavedFont(fontValue) {
  if (!fontValue || typeof fontValue !== 'string') return DEFAULT_FONT;
  return fontValue.split(',')[0].trim().replace(/^['"]|['"]$/g, '') || DEFAULT_FONT;
}

export async function loadFontsCatalog() {
  await document.fonts.ready;
  const seen = new Set(FALLBACK_FONTS);
  document.fonts.forEach((face) => {
    const family = face.family.replace(/^['"]|['"]$/g, '').trim();
    if (family) seen.add(family);
  });
  return Array.from(seen).sort((a, b) => a.localeCompare(b));
}

export function buildFontPicker(container, fontList, initialValue, onChange) {
  let selectedFont = initialValue;
  let isOpen = false;

  const picker = document.createElement('div');
  picker.className = 'font-picker';
  picker.setAttribute('role', 'combobox');
  picker.setAttribute('aria-haspopup', 'listbox');
  picker.setAttribute('aria-expanded', 'false');

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'font-picker__trigger';

  const selectedLabel = document.createElement('span');
  selectedLabel.className = 'font-picker__selected';

  const arrow = document.createElement('span');
  arrow.className = 'font-picker__arrow';
  arrow.textContent = '▾';
  arrow.setAttribute('aria-hidden', 'true');

  trigger.append(selectedLabel, arrow);

  const dropdown = document.createElement('ul');
  dropdown.className = 'font-picker__dropdown';
  dropdown.setAttribute('role', 'listbox');
  dropdown.hidden = true;

  fontList.forEach((font) => {
    const li = document.createElement('li');
    li.setAttribute('role', 'option');
    li.setAttribute('data-value', font);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'font-picker__option';
    btn.textContent = font;
    btn.style.fontFamily = `${toFontFamilyValue(font)}, Arial, sans-serif`;

    btn.addEventListener('click', () => {
      applySelection(font);
      closeDropdown();
    });

    li.append(btn);
    dropdown.append(li);
  });

  function applySelection(font) {
    selectedFont = font;
    selectedLabel.textContent = font;
    selectedLabel.style.fontFamily = `${toFontFamilyValue(font)}, Arial, sans-serif`;
    dropdown.querySelectorAll('li[data-value]').forEach((li) => {
      const isSelected = li.getAttribute('data-value') === font;
      li.querySelector('button').setAttribute('aria-selected', String(isSelected));
    });
    onChange(font);
  }

  function positionDropdown() {
    const rect = trigger.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.minWidth = `${rect.width}px`;
    dropdown.style.zIndex = '9999';
  }

  function openDropdown() {
    isOpen = true;
    positionDropdown();
    dropdown.hidden = false;
    picker.setAttribute('aria-expanded', 'true');
    const activeLi = dropdown.querySelector(`li[data-value="${CSS.escape(selectedFont)}"]`);
    activeLi?.scrollIntoView({ block: 'nearest' });
  }

  function closeDropdown() {
    isOpen = false;
    dropdown.hidden = true;
    picker.setAttribute('aria-expanded', 'false');
  }

  trigger.addEventListener('click', () => {
    if (isOpen) closeDropdown();
    else openDropdown();
  });

  const listenerController = new AbortController();
  const { signal } = listenerController;

  document.addEventListener('click', (event) => {
    if (!picker.contains(event.target)) closeDropdown();
  }, { signal });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && isOpen) closeDropdown();
  }, { signal });

  window.addEventListener('scroll', closeDropdown, { signal, capture: true });
  window.addEventListener('resize', closeDropdown, { signal });

  picker.append(trigger, dropdown);
  container.append(picker);

  applySelection(selectedFont);

  return {
    getValue: () => selectedFont,
    setValue: (font) => applySelection(font),
    destroy: () => listenerController.abort(),
  };
}

export function initFontPrefs(root, { existingPrefs, i18n }) {
  const fontPreview = root.querySelector('#pref-font-preview');
  const fontPickerContainer = root.querySelector('#pref-font-picker');
  const fontSizeValue = root.querySelector('#pref-font-size-value');

  const rawStoredSize = Number(existingPrefs?.appFontSize ?? existingPrefs?.greetingFontSize ?? DEFAULT_FONT_SIZE);
  // Values below 8 are legacy rem values; convert to pt (1rem ≈ 12pt at default browser zoom).
  const normalizedSize = rawStoredSize < 8 ? Math.round(rawStoredSize * 12) : rawStoredSize;
  let fontSize = Math.max(8, Math.min(24, Math.round(normalizedSize)));

  function updatePreview(selectedFont) {
    if (!fontPreview) return;
    fontPreview.style.fontFamily = `${toFontFamilyValue(selectedFont)}, Arial, sans-serif`;
  }

  function setFontSize(nextSize) {
    fontSize = Math.max(8, Math.min(24, Math.round(nextSize)));
    if (fontSizeValue) fontSizeValue.textContent = `${fontSize} pt`;
    if (fontPreview) fontPreview.style.fontSize = `${fontSize}pt`;
  }

  let pickerControl = null;

  async function init() {
    const fontOptions = await loadFontsCatalog().catch(() => [...FALLBACK_FONTS]);
    const fonts = Array.from(new Set([...FALLBACK_FONTS, ...fontOptions])).sort((a, b) => a.localeCompare(b));

    const savedFont = parseSavedFont(existingPrefs?.appFont || existingPrefs?.greetingFont);
    if (!fonts.includes(savedFont)) fonts.unshift(savedFont);

    if (fontPickerContainer) {
      pickerControl = buildFontPicker(fontPickerContainer, fonts, savedFont, (font) => {
        updatePreview(font);
      });
    }

    updatePreview(pickerControl?.getValue() || DEFAULT_FONT);
    setFontSize(fontSize);

    if (fontSizeValue) fontSizeValue.textContent = `${fontSize} pt`;

    root.querySelector('#pref-font-size-down')?.addEventListener('click', () => setFontSize(fontSize - 1));
    root.querySelector('#pref-font-size-up')?.addEventListener('click', () => setFontSize(fontSize + 1));

    root.querySelector('#pref-font-reset')?.addEventListener('click', () => {
      pickerControl?.setValue(DEFAULT_FONT);
      setFontSize(DEFAULT_FONT_SIZE);
      updatePreview(DEFAULT_FONT);
    });
  }

  return {
    init,
    getFont: () => pickerControl?.getValue() || DEFAULT_FONT,
    getFontSize: () => fontSize,
  };
}
