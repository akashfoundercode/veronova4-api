export const round1 = (n) => Math.round(n * 10) / 10;

export function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  const a = Math.abs(n);
  if (a >= 1e12) return (n / 1e12).toFixed(2).replace(/\.?0+$/, '') + 'T';
  if (a >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, '') + 'B';
  if (a >= 1e6) return (n / 1e6).toFixed(2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1000) return Math.round(n).toLocaleString('en-US');
  const r = round1(n);
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
}

export function fmtMult(m) {
  return Number.isInteger(m) ? `${m}X` : `${m.toFixed(2)}X`;
}
