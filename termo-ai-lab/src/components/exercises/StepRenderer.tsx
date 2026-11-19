import { lazy, Suspense, useState } from 'react';
import type { ChartStep, LessonStep } from '../../content/types';
import { getTask } from '../../content/tasks';
import type { GhostHelp } from '../../lib/ghost';
import { ChatSim } from './ChatSim';
import type { ExerciseCommonProps } from './common';
import { FindErrorExercise } from './FindErrorExercise';
import { PromptTrainer } from './PromptTrainer';
import { ChoiceExercise, QuestionCard, QuizView, scoreQuiz } from './QuizView';
import { RedactExercise } from './RedactExercise';
import { BuilderExercise, ClassifyExercise, MatchExercise, OrderExercise } from './SortExercises';
import { CompareView, ConceptView, RememberView, StepHeading, ToolsGuide } from './StepViews';

const TempChart = lazy(() => import('./TempChart'));

function ChartStepView({ step, onResult, onPhase }: { step: ChartStep } & ExerciseCommonProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  return (
    <div>
      <StepHeading kicker="Praca z wykresem" title={step.title} lead={step.instruction} />
      <Suspense fallback={<div className="h-72 animate-pulse rounded-2xl bg-white/5" />}>
        <TempChart />
      </Suspense>
      <div className="mt-5 grid gap-4">
        {step.questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            q={q}
            index={i}
            answer={answers[q.id]}
            onAnswer={(id) => {
              const next = { ...answers, [q.id]: id };
              setAnswers(next);
              onPhase?.('feedback');
              if (step.questions.every((x) => next[x.id])) {
                const r = scoreQuiz(step.questions, next);
                onResult({ score: r.score, skills: r.skills });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Czy krok wymaga wykonania ćwiczenia przed przejściem dalej. */
export function isInteractive(step: LessonStep): boolean {
  return !['concept', 'compare', 'tools', 'remember'].includes(step.type);
}

export function StepRenderer({ step, ...props }: { step: LessonStep } & ExerciseCommonProps) {
  switch (step.type) {
    case 'concept':
      return <ConceptView step={step} />;
    case 'compare':
      return <CompareView step={step} />;
    case 'tools':
      return <ToolsGuide step={step} />;
    case 'remember':
      return <RememberView step={step} />;
    case 'choice':
      return <ChoiceExercise step={step} {...props} />;
    case 'quiz':
      return <QuizView step={step} {...props} />;
    case 'classify':
      return <ClassifyExercise step={step} {...props} />;
    case 'match':
      return <MatchExercise step={step} {...props} />;
    case 'order':
      return <OrderExercise step={step} {...props} />;
    case 'builder':
      return <BuilderExercise step={step} {...props} />;
    case 'findError':
      return <FindErrorExercise step={step} {...props} />;
    case 'redact':
      return <RedactExercise step={step} {...props} />;
    case 'chat':
      return <ChatSim step={step} {...props} />;
    case 'chart':
      return <ChartStepView step={step} {...props} />;
    case 'trainer': {
      const task = getTask(step.taskId);
      if (!task) return <p>Nie znaleziono zadania.</p>;
      return <PromptTrainer task={task} context="lesson" onResult={props.onResult} onPhase={props.onPhase} />;
    }
  }
}

/** Pomoc Duszka dla danego kroku: proste wyjaśnienie, podpowiedzi i następny krok. */
export function stepHelp(step: LessonStep, done: boolean): Omit<GhostHelp, 'screen'> {
  const nextText = done ? 'Zadanie wykonane. Kliknij „Dalej” na dole ekranu, aby przejść do kolejnego kroku lekcji.' : undefined;
  switch (step.type) {
    case 'concept':
      return {
        explain: 'To krótkie wprowadzenie. Przeczytaj karty — każda to jedna myśl. Nie musisz niczego zapamiętywać na pamięć, za chwilę to przećwiczysz.',
        hints: ['Zwróć uwagę na pogrubione tytuły kart — to najważniejsze pojęcia tego kroku.'],
        next: { text: 'Gdy przeczytasz karty, kliknij „Dalej” na dole ekranu.' },
      };
    case 'compare':
      return {
        explain: 'Porównujesz dwa polecenia dla AI: słabsze i lepsze. Zobacz, czym się różnią i jaki wynik daje każde z nich.',
        hints: ['Kliknij „Pokaż, co odpowiedziałaby AI”, aby zobaczyć różnicę w wynikach.', 'Policz, ile konkretnych informacji ma każde polecenie: termin, adres, odbiorca, forma.'],
        next: { text: 'Po porównaniu kliknij „Dalej”.' },
      };
    case 'tools':
      return {
        explain: 'To praktyczna instrukcja: jak zacząć rozmowę w popularnych asystentach AI. Wybierz zakładkę z narzędziem, z którego korzystasz.',
        hints: ['Jeśli nie wiesz, które narzędzie jest dopuszczone w Twojej firmie — zapytaj przełożonego lub dział IT.'],
        next: { text: 'Kliknij „Dalej”, gdy zapoznasz się z instrukcją.' },
      };
    case 'remember':
      return { explain: 'To podsumowanie lekcji — jedna zasada, którą warto zapamiętać.', next: { text: 'Kliknij „Zakończ lekcję”, aby zobaczyć podsumowanie i zdobyte punkty.' } };
    case 'classify':
      return {
        explain: 'Przy każdym zadaniu kliknij jedną z grup. Gdy przypiszesz wszystkie, kliknij „Sprawdź”.',
        hints: ['Zadaj sobie pytanie: czy błąd AI w tym zadaniu byłby łatwy do zauważenia i niegroźny?', 'Decyzje dotyczące bezpieczeństwa i liczby z Twoich systemów zawsze wymagają człowieka.'],
        next: { text: nextText ?? 'Przypisz wszystkie elementy i kliknij „Sprawdź”.' },
      };
    case 'match':
      return {
        explain: 'Każdy fragment polecenia pełni jakąś funkcję: mówi, co zrobić (cel), opisuje sytuację (kontekst), podaje fakty (dane) albo opisuje wynik. Przypisz fragmenty do funkcji.',
        hints: ['Fakty, które można sprawdzić (daty, adresy), to zwykle „dane”.', 'Wszystko, co mówi o formie, długości i tonie, opisuje „oczekiwany wynik”.'],
        next: { text: nextText ?? 'Przypisz wszystkie fragmenty i kliknij „Sprawdź”.' },
      };
    case 'order':
      return {
        explain: 'Ułóż kroki w kolejności, w jakiej warto je wykonać. Strzałkami przesuwasz element w górę lub w dół.',
        hints: ['Co trzeba zrobić, zanim cokolwiek wyślesz do AI?', 'Sprawdzanie wyniku powinno być przed wykorzystaniem go w kolejnych dokumentach.'],
        next: { text: nextText ?? 'Ustaw kolejność i kliknij „Sprawdź”.' },
      };
    case 'builder':
      return {
        explain: 'W każdej części wybierz najlepszy zapis instrukcji. Na końcu zobaczysz gotową instrukcję z najlepszych elementów.',
        hints: ['Unikaj zapisów, które pozwalają AI zgadywać lub decydować za człowieka.', 'Dobry zapis jest konkretny i da się sprawdzić.'],
        next: { text: nextText ?? 'Wybierz zapis w każdej części i kliknij „Sprawdź”.' },
      };
    case 'findError':
      return {
        explain: 'AI przygotowała tekst na podstawie źródła. Porównaj każde zdanie ze źródłem. Kliknij zdania, które są błędne albo nieuprawnione, a potem „Sprawdź moje oznaczenia”.',
        hints: [
          'Zacznij od liczb: porównaj każdą liczbę i godzinę ze źródłem.',
          'Szukaj słów pewności: „na pewno”, „przyczyną była”, „dowodzi”. Czy źródło to naprawdę mówi?',
          'Sprawdź, czy AI nie dodała informacji, których w źródle w ogóle nie ma.',
        ],
        next: { text: nextText ?? 'Oznacz błędne zdania i kliknij „Sprawdź moje oznaczenia”.' },
      };
    case 'redact':
      return {
        explain: 'Zanim wkleisz tekst do AI, ukryj dane, po których można rozpoznać osobę. Kliknij takie fragmenty — zostaną zastąpione znacznikiem, np. [OSOBA].',
        hints: ['Dane osobowe to m.in. imię i nazwisko, telefon, adres z numerem mieszkania, e-mail.', 'Opis problemu i oznaczenia techniczne (np. węzeł) są potrzebne AI — ich nie ukrywaj.'],
        next: { text: nextText ?? 'Ukryj dane osobowe i kliknij „Sprawdź”.' },
      };
    case 'chat':
      return {
        explain: 'To symulacja rozmowy z AI. Wybieraj, co odpowiesz asystentowi. Zobaczysz, jak dopytywanie i poprawianie zmienia wynik.',
        hints: ['Najlepsze odpowiedzi są konkretne: mówią AI dokładnie, co zmienić.', 'Czytaj odpowiedzi AI uważnie — czasem dopisuje coś, czego nie podałeś.'],
        next: { text: nextText ?? 'Wybieraj kolejne wiadomości, aż rozmowa się zakończy.' },
      };
    case 'chart':
      return {
        explain: 'Na wykresie widać temperatury zasilania i powrotu w ciągu doby. Odczytaj z niego odpowiedzi. Możesz przełączyć widok na tabelę z dokładnymi liczbami.',
        hints: ['ΔT to różnica: temperatura zasilania minus temperatura powrotu. Najmniejsza ΔT jest tam, gdzie linie są najbliżej siebie.', 'Widok „Tabela” pokazuje ΔT dla każdej godziny.'],
        next: { text: nextText ?? 'Odpowiedz na pytania pod wykresem.' },
      };
    case 'quiz':
      return {
        explain: 'Krótkie pytania sprawdzające. Wybierz odpowiedź — od razu zobaczysz wyjaśnienie. To nie egzamin, tylko utrwalenie.',
        hints: ['Wybieraj odpowiedź, która chroni przed błędem — to zwykle ta, w której człowiek coś sprawdza.'],
        next: { text: nextText ?? 'Odpowiedz na wszystkie pytania.' },
      };
    case 'choice':
      return {
        explain: 'Wybierz polecenie, które da najlepszy wynik. Szukaj tego, które zawiera cel, odbiorcę, dane i opis wyniku.',
        hints: ['Długie polecenie nie zawsze jest lepsze — liczy się, czy zawiera konkretne informacje.'],
        next: { text: nextText ?? 'Wybierz jedną z odpowiedzi.' },
      };
    case 'trainer': {
      const task = getTask(step.taskId);
      return {
        explain: task?.simpleExplanation,
        hints: task?.hints,
        next: { text: done ? 'Masz ocenę. Popraw prompt i sprawdź ponownie albo kliknij „Dalej”.' : 'Napisz prompt w dużym polu i kliknij „Sprawdź mój prompt”.' },
      };
    }
  }
}
