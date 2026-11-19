const PL_MAP: Record<string, string> = {
  ą: 'a',
  ć: 'c',
  ę: 'e',
  ł: 'l',
  ń: 'n',
  ó: 'o',
  ś: 's',
  ź: 'z',
  ż: 'z',
};

/** Małe litery, bez polskich znaków diakrytycznych, pojedyncze spacje. */
export function normalizePl(text: string): string {
  return text
    .toLowerCase()
    .replace(/[ąćęłńóśźż]/g, (ch) => PL_MAP[ch] ?? ch)
    .replace(/[„”"]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

/** Wykrywa dane, które wyglądają na dane osobowe (telefon, PESEL, e-mail). */
export function detectPersonalData(text: string): string[] {
  const found: string[] = [];
  if (/\b\d{11}\b/.test(text)) found.push('numer przypominający PESEL');
  if (/(?<![\d:.,])(?:\+48[\s-]?)?\d{3}[\s-]\d{3}[\s-]\d{3}(?![\d:.,])/.test(text) || /(?<![\d:.,])\d{9}(?![\d:.,])/.test(text)) {
    found.push('numer telefonu');
  }
  if (/[\w.+-]+@[\w-]+\.[\w.]+/.test(text)) found.push('adres e-mail');
  return found;
}
