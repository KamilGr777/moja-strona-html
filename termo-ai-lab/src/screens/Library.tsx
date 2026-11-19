import { ArrowRight, Pencil, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { PageHeader } from '../components/layout/AppShell';
import { Button, Callout, CopyButton, Icon, LevelPill, PromptBlock, cx } from '../components/ui';
import { fillTemplate, LIBRARY, LIBRARY_CATEGORIES, type LibraryCategory } from '../content/library';
import { useGhostHelp } from '../lib/ghost';
import { navigate } from '../lib/router';
import { useProgress } from '../lib/store';
import { detectPersonalData, normalizePl } from '../lib/text';

export function Library() {
  const [cat, setCat] = useState<LibraryCategory | 'all'>('all');
  const [q, setQ] = useState('');
  const query = normalizePl(q);
  const list = LIBRARY.filter((p) => (cat === 'all' || p.category === cat) && (!query || normalizePl(`${p.title} ${p.description}`).includes(query)));

  useGhostHelp({
    screen: 'library',
    explain: 'Biblioteka zawiera gotowe polecenia do codziennej pracy. Otwórz wybrane, uzupełnij pola swoimi danymi (bez danych osobowych) i skopiuj do asystenta AI.',
    next: { text: 'Wybierz kategorię albo wpisz w wyszukiwarkę, czego szukasz, np. „raport”.' },
  });

  return (
    <div>
      <PageHeader title="Biblioteka promptów" subtitle={`${LIBRARY.length} gotowych instrukcji zawodowych. Uzupełnij pola, skopiuj i wklej do asystenta AI.`} />

      <label className="relative mb-4 block">
        <span className="sr-only">Szukaj w bibliotece</span>
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Szukaj, np. raport, komunikat, awaria…"
          className="min-h-12 w-full rounded-2xl border border-white/10 bg-ink-950/60 pl-12 pr-4 text-[1rem] text-fg placeholder:text-fg-subtle focus:border-tech/50 focus:outline-none"
        />
      </label>

      <div data-tour="library-categories" className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Kategorie">
        <button
          type="button"
          onClick={() => setCat('all')}
          aria-pressed={cat === 'all'}
          className={cx('min-h-10 rounded-full border px-4 text-sm font-semibold', cat === 'all' ? 'border-tech bg-tech/12 text-fg' : 'border-white/10 text-fg-muted hover:bg-white/5')}
        >
          Wszystkie
        </button>
        {LIBRARY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCat(c.id)}
            aria-pressed={cat === c.id}
            className={cx('inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold', cat === c.id ? 'border-tech bg-tech/12 text-fg' : 'border-white/10 text-fg-muted hover:bg-white/5')}
          >
            <Icon name={c.icon} className="size-4" />
            {c.label}
          </button>
        ))}
      </div>

      <ul data-tour="library-list" className="grid gap-3 sm:grid-cols-2">
        {list.map((p) => {
          const c = LIBRARY_CATEGORIES.find((x) => x.id === p.category)!;
          return (
            <li key={p.id}>
              <button type="button" onClick={() => navigate({ name: 'libraryItem', id: p.id })} className="glass group flex h-full w-full flex-col rounded-2xl p-4 text-left transition hover:bg-white/8 sm:p-5">
                <span className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-heat-soft">
                    <Icon name={c.icon} className="size-3.5" /> {c.label}
                  </span>
                  <LevelPill level={p.level} className="!px-2 !py-0.5 !text-[0.65rem]" />
                </span>
                <span className="mt-2 font-display text-[1.05rem] font-semibold leading-snug">{p.title}</span>
                <span className="mt-1 text-sm text-fg-muted">{p.description}</span>
                <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-tech">
                  Otwórz <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden="true" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {list.length === 0 && <p className="mt-6 text-center text-fg-muted">Brak promptów dla tego wyszukiwania.</p>}
    </div>
  );
}

export function LibraryItem({ id }: { id: string }) {
  const prompt = LIBRARY.find((p) => p.id === id);
  const saved = useProgress((s) => s.library[id]);
  const saveValues = useProgress((s) => s.saveLibraryValues);
  const saveCustom = useProgress((s) => s.saveLibraryCustom);
  const [values, setValues] = useState<Record<string, string>>(saved?.values ?? {});
  const [editing, setEditing] = useState(false);
  const [custom, setCustom] = useState<string | undefined>(saved?.customText);

  useGhostHelp({
    screen: 'library-item',
    explain: 'Uzupełnij pola po lewej (lub u góry na telefonie) — gotowe polecenie pojawi się w podglądzie. Potem kliknij „Kopiuj” i wklej je do asystenta AI.',
    hints: ['Puste pola zostaną oznaczone w nawiasach kwadratowych — możesz je uzupełnić później.', 'Nie wpisuj danych osobowych. Zamiast nazwiska wpisz rolę, np. „zarządca budynku”.'],
    next: { text: 'Uzupełnij pola i kliknij „Kopiuj”.' },
  });

  if (!prompt) {
    return (
      <div className="py-16 text-center">
        <p className="text-fg-muted">Nie znaleziono promptu.</p>
        <Button className="mt-4" onClick={() => navigate({ name: 'library' })}>
          Wróć do biblioteki
        </Button>
      </div>
    );
  }

  const filled = fillTemplate(prompt, values);
  const finalText = custom ?? filled;
  const personal = detectPersonalData(finalText);
  const cat = LIBRARY_CATEGORIES.find((c) => c.id === prompt.category)!;

  const update = (key: string, v: string) => {
    const next = { ...values, [key]: v };
    setValues(next);
    saveValues(prompt.id, next);
  };

  return (
    <div>
      <PageHeader back={{ name: 'library' }} backLabel="Biblioteka promptów" title={prompt.title} subtitle={prompt.description} right={<LevelPill level={prompt.level} />} />
      <div className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-heat-soft">
        <Icon name={cat.icon} className="size-3.5" /> {cat.label}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <section data-tour="library-fields" aria-labelledby="fields-h" className="glass rounded-2xl p-4 sm:p-5">
          <h2 id="fields-h" className="mb-3 font-display font-semibold">
            1. Uzupełnij pola
          </h2>
          <div className="grid gap-4">
            {prompt.fields.map((f) => (
              <label key={f.key} className="grid gap-1.5">
                <span className="text-sm font-semibold">{f.label}</span>
                {f.multiline ? (
                  <textarea
                    value={values[f.key] ?? ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={4}
                    disabled={custom !== undefined}
                    className="min-h-24 rounded-xl border border-white/10 bg-ink-950/60 p-3 text-[0.97rem] text-fg placeholder:text-fg-subtle focus:border-tech/50 focus:outline-none disabled:opacity-50"
                  />
                ) : (
                  <input
                    value={values[f.key] ?? ''}
                    onChange={(e) => update(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    disabled={custom !== undefined}
                    className="min-h-11 rounded-xl border border-white/10 bg-ink-950/60 px-3 text-[0.97rem] text-fg placeholder:text-fg-subtle focus:border-tech/50 focus:outline-none disabled:opacity-50"
                  />
                )}
              </label>
            ))}
          </div>
          {custom !== undefined && <p className="mt-3 text-sm text-fg-muted">Pola są wyłączone, bo edytujesz cały tekst ręcznie. Przywróć oryginał, aby znów z nich korzystać.</p>}
          <div className="mt-4 flex items-start gap-2 text-sm text-fg-muted">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-ok" aria-hidden="true" />
            Wpisane wartości zapisują się tylko na tym urządzeniu. Nie wpisuj danych osobowych.
          </div>
        </section>

        <section data-tour="library-preview" aria-labelledby="preview-h" className="glass rounded-2xl p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="preview-h" className="font-display font-semibold">
              2. Gotowe polecenie
            </h2>
            {custom === undefined ? (
              <Button
                variant="ghost"
                icon={<Pencil className="size-4" aria-hidden="true" />}
                onClick={() => {
                  setCustom(filled);
                  setEditing(true);
                  saveCustom(prompt.id, filled);
                }}
              >
                Edytuj tekst
              </Button>
            ) : (
              <Button
                variant="ghost"
                icon={<RotateCcw className="size-4" aria-hidden="true" />}
                onClick={() => {
                  setCustom(undefined);
                  setEditing(false);
                  saveCustom(prompt.id, undefined);
                }}
              >
                Przywróć oryginał
              </Button>
            )}
          </div>
          {custom !== undefined && editing ? (
            <textarea
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                saveCustom(prompt.id, e.target.value);
              }}
              rows={14}
              aria-label="Edytowalna treść polecenia"
              className="min-h-72 w-full rounded-xl border border-white/10 bg-ink-950/60 p-4 text-[0.95rem] leading-relaxed text-fg focus:border-tech/50 focus:outline-none"
            />
          ) : (
            <PromptBlock>{finalText}</PromptBlock>
          )}
          {custom !== undefined && !editing && (
            <Button variant="ghost" className="mt-2" onClick={() => setEditing(true)} icon={<Pencil className="size-4" aria-hidden="true" />}>
              Edytuj dalej
            </Button>
          )}
          {personal.length > 0 && (
            <div className="mt-3">
              <Callout tone="warn">Wygląda na to, że tekst zawiera {personal.join(', ')}. Przed wklejeniem do AI zastąp takie dane znacznikiem, np. [ODBIORCA].</Callout>
            </div>
          )}
          <div data-tour="library-copy" className="mt-4">
            <CopyButton text={finalText} label="Kopiuj polecenie" variant="primary" />
          </div>
        </section>
      </div>
      <div className="mt-5">
        <Callout tone="info">
          <strong>Jak sprawdzić wynik: </strong>
          {prompt.verifyTip}
        </Callout>
      </div>
    </div>
  );
}
