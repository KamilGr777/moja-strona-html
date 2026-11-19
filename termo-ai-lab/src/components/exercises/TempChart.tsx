import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from 'recharts';
import { Table2, LineChart as LineIcon } from 'lucide-react';
import { hourLabel, TEMP_DATASET, tempTableText } from '../../content/chartData';
import { CopyButton, cx } from '../ui';

/**
 * Wykres dobowego przebiegu temperatur (dane demonstracyjne).
 * Paleta zweryfikowana walidatorem (tryb ciemny, kontrast i rozróżnialność przy zaburzeniach widzenia barw).
 * Tożsamość serii nigdy nie opiera się wyłącznie na kolorze: legenda + etykiety końców linii + tabela.
 */
const SUPPLY = '#d97706';
const RETURN = '#14a89a';

function ChartTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const s = payload.find((p) => p.dataKey === 'supply')?.value as number | undefined;
  const r = payload.find((p) => p.dataKey === 'ret')?.value as number | undefined;
  return (
    <div className="glass-strong rounded-xl px-3 py-2 text-sm">
      <div className="mb-1 font-semibold text-fg">{hourLabel(Number(label))}</div>
      <div className="flex items-center gap-2 text-fg-muted">
        <span className="h-0.5 w-3 rounded" style={{ background: SUPPLY }} /> Zasilanie: <span className="font-semibold text-fg tabular-nums">{s} °C</span>
      </div>
      <div className="flex items-center gap-2 text-fg-muted">
        <span className="h-0.5 w-3 rounded" style={{ background: RETURN }} /> Powrót: <span className="font-semibold text-fg tabular-nums">{r} °C</span>
      </div>
      {s !== undefined && r !== undefined && (
        <div className="mt-1 text-fg-muted">
          ΔT: <span className="font-semibold text-fg tabular-nums">{s - r} K</span>
        </div>
      )}
    </div>
  );
}

export default function TempChart({ compact = false }: { compact?: boolean }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const data = TEMP_DATASET.points;
  return (
    <figure className="rounded-2xl border border-white/8 bg-ink-950/50 p-3 sm:p-4">
      <figcaption className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-display text-[0.95rem] font-semibold">{TEMP_DATASET.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-muted" aria-label="Legenda">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: SUPPLY }} /> Temperatura zasilania [°C]
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-0.5 w-4 rounded" style={{ background: RETURN }} /> Temperatura powrotu [°C]
            </span>
          </div>
        </div>
        <div className="flex gap-1 rounded-xl border border-white/10 p-1" role="group" aria-label="Widok danych">
          <button
            type="button"
            onClick={() => setView('chart')}
            aria-pressed={view === 'chart'}
            className={cx('inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold', view === 'chart' ? 'bg-white/10 text-fg' : 'text-fg-muted')}
          >
            <LineIcon className="size-3.5" aria-hidden="true" /> Wykres
          </button>
          <button
            type="button"
            onClick={() => setView('table')}
            aria-pressed={view === 'table'}
            className={cx('inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold', view === 'table' ? 'bg-white/10 text-fg' : 'text-fg-muted')}
          >
            <Table2 className="size-3.5" aria-hidden="true" /> Tabela
          </button>
        </div>
      </figcaption>

      {view === 'chart' ? (
        <div className={compact ? 'h-56' : 'h-64 sm:h-72'} role="img" aria-label="Wykres liniowy temperatur zasilania i powrotu w ciągu doby. Szczegółowe wartości dostępne w widoku tabeli.">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 44, bottom: 4, left: -12 }}>
              <CartesianGrid stroke="rgb(255 255 255 / 0.06)" vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h: number) => `${h}:00`}
                ticks={[0, 4, 8, 12, 16, 20, 23]}
                stroke="rgb(255 255 255 / 0.25)"
                tick={{ fill: '#a9b5cc', fontSize: 11 }}
                tickLine={false}
              />
              <YAxis domain={[40, 100]} ticks={[40, 50, 60, 70, 80, 90, 100]} stroke="rgb(255 255 255 / 0.25)" tick={{ fill: '#a9b5cc', fontSize: 11 }} tickLine={false} axisLine={false} unit="°" />
              <Tooltip content={(p) => <ChartTooltip {...(p as TooltipContentProps<number, string>)} />} cursor={{ stroke: 'rgb(255 255 255 / 0.3)', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="supply"
                name="Zasilanie"
                stroke={SUPPLY}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: '#0e1629', strokeWidth: 2 }}
                isAnimationActive={false}
                label={(props: { x?: number | string; y?: number | string; index?: number }) =>
                  props.index === data.length - 1 ? (
                    <text key="ls" x={Number(props.x) + 6} y={Number(props.y) + 4} fill="#eaf0fb" fontSize={11}>
                      zasil.
                    </text>
                  ) : (
                    <g key={`ls-${props.index}`} />
                  )
                }
              />
              <Line
                type="monotone"
                dataKey="ret"
                name="Powrót"
                stroke={RETURN}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: '#0e1629', strokeWidth: 2 }}
                isAnimationActive={false}
                label={(props: { x?: number | string; y?: number | string; index?: number }) =>
                  props.index === data.length - 1 ? (
                    <text key="lr" x={Number(props.x) + 6} y={Number(props.y) + 4} fill="#eaf0fb" fontSize={11}>
                      powrót
                    </text>
                  ) : (
                    <g key={`lr-${props.index}`} />
                  )
                }
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="max-h-72 overflow-auto rounded-xl border border-white/8 scrollbar-thin">
          <table className="w-full text-sm tabular-nums">
            <caption className="sr-only">{TEMP_DATASET.title}</caption>
            <thead className="sticky top-0 bg-ink-800 text-left text-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">Godzina</th>
                <th scope="col" className="px-3 py-2 font-semibold">Zasilanie [°C]</th>
                <th scope="col" className="px-3 py-2 font-semibold">Powrót [°C]</th>
                <th scope="col" className="px-3 py-2 font-semibold">ΔT [K]</th>
              </tr>
            </thead>
            <tbody>
              {data.map((p) => (
                <tr key={p.hour} className="border-t border-white/5">
                  <td className="px-3 py-1.5">{hourLabel(p.hour)}</td>
                  <td className="px-3 py-1.5">{p.supply}</td>
                  <td className="px-3 py-1.5">{p.ret}</td>
                  <td className="px-3 py-1.5">{p.supply - p.ret}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted">Dane fikcyjne. Skopiuj tabelę, aby wkleić ją do asystenta AI.</p>
        <CopyButton text={tempTableText()} label="Kopiuj dane jako tekst" />
      </div>
    </figure>
  );
}
