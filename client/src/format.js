export const MONTH_NAMES = [
  'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
  'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie',
];

export function formatMoney(value) {
  const n = Number(value) || 0;
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

export function monthLabel(month) {
  return MONTH_NAMES[month - 1] || String(month);
}

// La fel ca formatMoney, dar cu "+" explicit pentru valori pozitive - util cand
// afisam o diferenta (fata de o tinta, de exemplu), unde semnul conteaza si
// pentru 0/valori pozitive, nu doar pentru cele negative (formatMoney pune deja
// "-" automat pentru valori negative).
export function formatSignedMoney(value) {
  const n = Number(value) || 0;
  const formatted = formatMoney(Math.abs(n));
  if (n > 0) return `+${formatted}`;
  if (n < 0) return `-${formatted}`;
  return formatted;
}
