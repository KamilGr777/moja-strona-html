import type { LevelId, QuizQuestion } from './types';

/** Krótki test doboru poziomu (ok. 2 minuty). Wynik to sugestia — wybór zawsze należy do użytkownika. */

export const PLACEMENT_USAGE = {
  question: 'Jak często korzystasz z asystentów AI (np. ChatGPT, Claude, Copilot)?',
  options: [
    { id: 'never', text: 'Jeszcze nigdy lub raz–dwa razy', value: 0 },
    { id: 'sometimes', text: 'Kilka razy, do prostych pytań', value: 1 },
    { id: 'regular', text: 'Regularnie, także w pracy', value: 2 },
  ],
};

export const PLACEMENT_QUESTIONS: QuizQuestion[] = [
  {
    id: 'pl1',
    question: 'Które polecenie da lepszy wynik?',
    options: [
      { id: 'a', text: '„Napisz ogłoszenie o przerwie.”', correct: false, explanation: 'Brakuje terminu, miejsca, odbiorcy i formy.' },
      { id: 'b', text: '„Napisz ogłoszenie dla mieszkańców ul. Lipowej 4 o przerwie w dostawie ciepłej wody 3 grudnia w godz. 9–13. Maks. 5 zdań.”', correct: true, explanation: 'Jest cel, odbiorca, dane i forma.' },
    ],
    skill: 'cel',
  },
  {
    id: 'pl2',
    question: 'AI podała w odpowiedzi liczbę, której nie było w Twoich danych. Co to może oznaczać?',
    options: [
      { id: 'a', text: 'AI ją zmyśliła — trzeba sprawdzić w źródle.', correct: true, explanation: 'Tak. Liczby spoza Twoich danych trzeba traktować z dużą ostrożnością.' },
      { id: 'b', text: 'AI ma dostęp do danych firmy, więc to prawda.', correct: false, explanation: 'Asystent nie zna danych firmy, jeśli ich nie podasz.' },
    ],
    skill: 'weryfikacja',
  },
  {
    id: 'pl3',
    question: 'Chcesz, by AI przeanalizowała dane pomiarowe. Co jest najważniejsze?',
    options: [
      { id: 'a', text: 'Napisać „przeanalizuj dane” i wkleić zrzut ekranu.', correct: false, explanation: 'Za mało: AI nie wie, czego szukać, a odczyt z obrazu bywa niedokładny.' },
      { id: 'b', text: 'Wkleić tabelę, opisać kolumny i jednostki, zadać konkretne pytania i poprosić o pokazanie obliczeń.', correct: true, explanation: 'Tak — to podstawa rzetelnej analizy.' },
    ],
    skill: 'dane',
  },
  {
    id: 'pl4',
    question: 'Czym jest punkt kontrolny w instrukcji wieloetapowej?',
    options: [
      { id: 'a', text: 'Miejscem, w którym AI zatrzymuje się i czeka na akceptację człowieka.', correct: true, explanation: 'Tak — dzięki temu błąd nie przenosi się do kolejnych etapów.' },
      { id: 'b', text: 'Prośbą do AI, żeby sama sprawdziła, czy się nie pomyliła.', correct: false, explanation: 'Samoocena AI nie zastępuje kontroli człowieka.' },
      { id: 'c', text: 'Nie wiem.', correct: false, explanation: 'Nic nie szkodzi — poznasz to na poziomie zaawansowanym.' },
    ],
    skill: 'struktura',
  },
];

/** Reguła sugestii poziomu: liczy się praktyczna wiedza i doświadczenie. */
export function suggestLevel(correct: number, usage: number): LevelId {
  if (correct >= 4 && usage >= 1) return 'zaawansowany';
  if (correct >= 3 || (correct >= 2 && usage === 2)) return 'sredni';
  return 'poczatkujacy';
}
