/**
 * Dane demonstracyjne do zadań z wykresem. Wartości są fikcyjne, ale spójne:
 * aplikacja zna dane źródłowe i sama wylicza wartości referencyjne,
 * dzięki czemu może porównać z nimi odpowiedź AI.
 */

export interface TempPoint {
  hour: number;
  supply: number; // temperatura zasilania [°C]
  ret: number; // temperatura powrotu [°C]
}

export const TEMP_DATASET = {
  id: 'temp-doba',
  title: 'Dobowy przebieg temperatur — magistrala M-2 (dane fikcyjne)',
  description:
    'Pomiary godzinowe z punktu pomiarowego przy ciepłowni. Dzień roboczy w styczniu, temperatura zewnętrzna ok. −8 °C.',
  points: [
    [88, 50],
    [88, 50],
    [89, 50],
    [90, 51],
    [91, 51],
    [93, 52],
    [95, 54],
    [96, 55],
    [96, 56],
    [95, 55],
    [93, 54],
    [92, 53],
    [91, 53],
    [90, 54],
    [90, 62],
    [90, 65],
    [91, 63],
    [93, 56],
    [94, 55],
    [94, 55],
    [93, 54],
    [92, 53],
    [90, 52],
    [89, 51],
  ].map(([supply, ret], hour): TempPoint => ({ hour, supply, ret })),
};

export const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00`;

export function tempStats(points: TempPoint[] = TEMP_DATASET.points) {
  const deltas = points.map((p) => ({ hour: p.hour, delta: p.supply - p.ret }));
  const maxSupply = Math.max(...points.map((p) => p.supply));
  const minSupply = Math.min(...points.map((p) => p.supply));
  const maxRet = Math.max(...points.map((p) => p.ret));
  const minDelta = Math.min(...deltas.map((d) => d.delta));
  const avgDelta = deltas.reduce((s, d) => s + d.delta, 0) / deltas.length;
  return {
    maxSupply,
    maxSupplyHours: points.filter((p) => p.supply === maxSupply).map((p) => p.hour),
    minSupply,
    minSupplyHours: points.filter((p) => p.supply === minSupply).map((p) => p.hour),
    maxRet,
    maxRetHours: points.filter((p) => p.ret === maxRet).map((p) => p.hour),
    minDelta,
    minDeltaHours: deltas.filter((d) => d.delta === minDelta).map((d) => d.hour),
    avgDelta: Math.round(avgDelta * 10) / 10,
    deltas,
  };
}

/** Tabela w formacie tekstowym — do skopiowania i wklejenia do asystenta AI. */
export function tempTableText(points: TempPoint[] = TEMP_DATASET.points) {
  const header = 'Godzina;Temperatura zasilania [°C];Temperatura powrotu [°C]';
  return [TEMP_DATASET.title, header, ...points.map((p) => `${hourLabel(p.hour)};${p.supply};${p.ret}`)].join('\n');
}

export const formatPl = (n: number) => String(n).replace('.', ',');

/* ------------------------------------------------------------------ */
/* Straty ciepła (poziom zaawansowany) — wartości referencyjne         */
/* ------------------------------------------------------------------ */

export const HEAT_LOSS = {
  inputGJ: 48500,
  soldGJ: 41230,
};

export function heatLossStats() {
  const lossGJ = HEAT_LOSS.inputGJ - HEAT_LOSS.soldGJ;
  const lossPct = (lossGJ / HEAT_LOSS.inputGJ) * 100;
  const lossMWh = lossGJ / 3.6;
  return {
    lossGJ,
    lossPct: Math.round(lossPct * 10) / 10,
    lossMWh: Math.round(lossMWh * 10) / 10,
  };
}
